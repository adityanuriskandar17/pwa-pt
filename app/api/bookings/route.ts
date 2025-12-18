import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCache, setCache } from '@/lib/redis';
import { apiRateLimit } from '@/lib/rate-limit';
import { validateClubName, validatePTName, sanitizeString } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak request. Silakan coba lagi nanti.' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const clubNameRaw = searchParams.get('club_name');
    const ptNameRaw = searchParams.get('pt_name');
    const forceRefresh = searchParams.get('force_refresh') === 'true';

    let clubName: string | null = null;
    let ptName: string | null = null;

    if (clubNameRaw) {
      const sanitized = sanitizeString(clubNameRaw, 255);
      if (validateClubName(sanitized) || sanitized === 'All Club') {
        clubName = sanitized;
      } else {
        return NextResponse.json({ error: 'Invalid club name' }, { status: 400 });
      }
    }

    if (ptNameRaw) {
      const sanitized = sanitizeString(ptNameRaw, 255);
      if (validatePTName(sanitized)) {
        ptName = sanitized;
      } else {
        return NextResponse.json({ error: 'Invalid PT name' }, { status: 400 });
      }
    }

    const isAllClubs = !clubName || clubName === 'All Club' || clubName === '';
    const cacheKey = `bookings:${clubName || 'all'}:${ptName || 'all'}`;
    
    if (!forceRefresh) {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        return NextResponse.json({ success: true, data: cachedData, cached: true });
      }
    }

    // Build query
    // Urutan prioritas nama member:
    // 1. m.fullname dari tabel member
    // 2. Gabungan m.firstname + m.surname dari tabel member
    // 3. lb.show_name dari tabel list_booking (exclude '0' dan nilai numerik saja)
    // 4. wc.membername dari tabel webhook_checkin
    let sql = `
      SELECT
        wc.id,
        wc.doorid,
        wc.doorname,
        wc.memberid,
        COALESCE(
          NULLIF(TRIM(m.fullname), ''),
          NULLIF(TRIM(CONCAT_WS(' ', m.firstname, m.surname)), ''),
          CASE 
            WHEN lb.show_name IS NOT NULL 
              AND TRIM(lb.show_name) != '' 
              AND TRIM(lb.show_name) != '0'
              AND TRIM(lb.show_name) REGEXP '[a-zA-Z]'
            THEN TRIM(lb.show_name) 
            ELSE NULL 
          END,
          NULLIF(TRIM(wc.membername), '')
        ) AS member_name,
        wc.access,
        wc.membershipname,
        wc.timestamp AS timestamp_gate,
        wc.checkin_type,
        wc.bookingid,
        lb.id AS fingerlogid,
        lb.daystarttime,
        lb.resource_name,
        lb.type,
        lb.my_booking,
        lb.club_name,
        lb.endtime,
        COALESCE(lb.face_booking_member, 0) AS face_booking_member,
        COALESCE(lb.face_booking_pt, 0) AS face_booking_pt
      FROM (
        SELECT wc1.*
        FROM webhook_checkin wc1
        INNER JOIN (
          SELECT bookingid, MAX(timestamp) as max_timestamp, MAX(id) as max_id
          FROM webhook_checkin
          GROUP BY bookingid
        ) wc2 ON wc1.bookingid = wc2.bookingid 
          AND wc1.timestamp = wc2.max_timestamp
          AND wc1.id = wc2.max_id
      ) wc
      LEFT JOIN member m ON wc.memberid = m.id
      JOIN list_booking lb ON wc.bookingid = lb.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (!isAllClubs && clubName) {
      conditions.push('lb.club_name = ?');
      params.push(clubName);
    }
    if (ptName) {
      conditions.push('LOWER(TRIM(lb.resource_name)) = LOWER(TRIM(?))');
      params.push(ptName);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY wc.timestamp DESC LIMIT 100';

    const bookings = await query(sql, params);

    // Deduplicate
    const uniqueBookings = new Map();
    bookings.forEach((booking: any) => {
      const bookingId = booking.bookingid || booking.fingerlogid;
      if (bookingId && !uniqueBookings.has(bookingId)) {
        uniqueBookings.set(bookingId, booking);
      }
    });

    // Transform
    const transformedData = Array.from(uniqueBookings.values()).map((booking: any, index: number) => {
      const formatDateTime = (datetime: Date | null) => {
        if (!datetime) return { date: '-', time: '-' };
        const d = new Date(datetime);
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        return {
          date: `${days[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`,
          time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
        };
      };

      const formatTime = (time: any) => {
        if (!time) return '-';
        if (typeof time === 'string') {
          const parts = time.split(':');
          return parts.length >= 2 ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}` : time;
        }
        const d = new Date(time);
        return isNaN(d.getTime()) ? '-' : `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      };

      const startDateTime = formatDateTime(booking.daystarttime);
      const gateDateTime = booking.timestamp_gate ? formatDateTime(new Date(booking.timestamp_gate)) : { date: '-', time: '-' };

      return {
        nomor: index + 1,
        member: booking.member_name || 'Unknown Member',
        pt: booking.resource_name || 'Unknown PT',
        status: 'Belum Validasi',
        memberVerified: booking.face_booking_member === 1,
        ptVerified: booking.face_booking_pt === 1,
        bookingId: booking.bookingid ? Number(booking.bookingid) : null,
        fingerlogId: booking.fingerlogid ? Number(booking.fingerlogid) : null,
        memberId: booking.memberid ? Number(booking.memberid) : null,
        startDate: startDateTime.date,
        startTime: startDateTime.time,
        endTime: formatTime(booking.endtime),
        gateDate: gateDateTime.date,
        gateTime: gateDateTime.time,
        gateVerified: booking.access?.toLowerCase() === 'granted',
        bookingListVerified: booking.id !== null,
        faceVerified: booking.face_booking_member === 1 && booking.face_booking_pt === 1,
      };
    });

    await setCache(cacheKey, transformedData, 300);

    return NextResponse.json({ success: true, data: transformedData, cached: false });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch bookings', data: [] }, { status: 500 });
  }
}
