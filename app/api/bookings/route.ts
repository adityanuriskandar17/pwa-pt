import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
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

    // Get club_name and pt_name from query parameters
    const { searchParams } = new URL(request.url);
    const clubNameRaw = searchParams.get('club_name');
    const ptNameRaw = searchParams.get('pt_name'); // Nama Personal Trainer untuk filter (jika role_id = 11)
    const forceRefresh = searchParams.get('force_refresh') === 'true';

    // Validate and sanitize inputs
    let clubName: string | null = null;
    let ptName: string | null = null;

    if (clubNameRaw) {
      const sanitized = sanitizeString(clubNameRaw, 255);
      if (validateClubName(sanitized) || sanitized === 'All Club') {
        clubName = sanitized;
      } else {
        return NextResponse.json(
          { error: 'Invalid club name' },
          { status: 400 }
        );
      }
    }

    if (ptNameRaw) {
      const sanitized = sanitizeString(ptNameRaw, 255);
      if (validatePTName(sanitized)) {
        ptName = sanitized;
      } else {
        return NextResponse.json(
          { error: 'Invalid PT name' },
          { status: 400 }
        );
      }
    }

    // Allow "All Club" or empty string to fetch all clubs
    const isAllClubs = !clubName || clubName === 'All Club' || clubName === '';

    // Generate cache key berdasarkan parameter
    const cacheKey = `bookings:${clubName || 'all'}:${ptName || 'all'}`;
    
    // Cek Redis cache terlebih dahulu (kecuali force refresh)
    if (!forceRefresh) {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        console.log('Using Redis cache for:', cacheKey);
        return NextResponse.json({
          success: true,
          data: cachedData,
          cached: true,
        });
      }
    }

    // Fetch bookings dari log_webhook dengan JOIN ke member dan list_booking
    // Filter berdasarkan club_name yang dipilih (dari list_booking.club_name)
    // Jika pt_name diberikan, filter juga berdasarkan resource_name (untuk Personal Trainer)
    let bookings: Array<{
      id: bigint | null;
      doorid: bigint | null;
      doorname: string | null;
      memberid: bigint | null;
      member_name: string | null;
      access: string | null;
      membershipname: string | null;
      timestamp_gate: Date | null;
      booking_checkin: number | null;
      bookingid: bigint | null;
      fingerlogid: bigint | null;
      daystarttime: Date | null;
      resource_name: string | null;
      type: string | null;
      my_booking: number | null;
      club_name: string | null;
      endtime: Date | string | null; // TIME type bisa berupa string "HH:MM:SS" atau Date
      face_booking_member: number | null;
      face_booking_pt: number | null;
    }>;

    // Build query dengan conditional WHERE clause menggunakan Drizzle SQL
    // Menggunakan subquery untuk menghindari duplikasi - ambil hanya record terbaru per bookingid
    if (ptName && !isAllClubs) {
      // Filter untuk PT dan Club
      const result1 = await db.execute(sql`
        SELECT
          lw.id,
          lw.doorid,
          lw.doorname,
          lw.memberid,
          COALESCE(
            CONCAT_WS(' ', m.first_name, m.last_name),
            lw.membername
          ) AS member_name,
          lw.access,
          lw.membershipname,
          lw.timestamp AS timestamp_gate,
          lw.booking_checkin,
          lw.bookingid,
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
          SELECT 
            lw1.id,
            lw1.doorid,
            lw1.doorname,
            lw1.memberid,
            lw1.membername,
            lw1.access,
            lw1.membershipname,
            lw1.timestamp,
            lw1.booking_checkin,
            lw1.bookingid
          FROM log_webhook lw1
          INNER JOIN (
            SELECT bookingid, MAX(timestamp) as max_timestamp, MAX(id) as max_id
            FROM log_webhook
            GROUP BY bookingid
          ) lw2 ON lw1.bookingid = lw2.bookingid 
            AND lw1.timestamp = lw2.max_timestamp
            AND lw1.id = lw2.max_id
        ) lw
        LEFT JOIN member m ON lw.memberid = m.member_id
        JOIN list_booking lb ON lw.bookingid = lb.id
        WHERE lb.club_name = ${clubName}
          AND LOWER(TRIM(lb.resource_name)) = LOWER(TRIM(${ptName}))
        ORDER BY lw.timestamp DESC
        LIMIT 100
      `);
      // Drizzle dengan mysql2 mengembalikan [rows, metadata]
      const rows1 = Array.isArray(result1) && result1.length > 0 ? result1[0] : [];
      // Deduplikasi berdasarkan bookingid - ambil hanya 1 record per bookingid
      const uniqueBookings1 = new Map();
      (Array.isArray(rows1) ? rows1 : []).forEach((booking: any) => {
        const bookingId = booking.bookingid || booking.fingerlogid;
        if (bookingId && !uniqueBookings1.has(bookingId)) {
          uniqueBookings1.set(bookingId, booking);
        }
      });
      bookings = Array.from(uniqueBookings1.values());
    } else if (ptName && isAllClubs) {
      // Filter untuk PT saja (All Clubs)
      const result2 = await db.execute(sql`
        SELECT
          lw.id,
          lw.doorid,
          lw.doorname,
          lw.memberid,
          COALESCE(
            CONCAT_WS(' ', m.first_name, m.last_name),
            lw.membername
          ) AS member_name,
          lw.access,
          lw.membershipname,
          lw.timestamp AS timestamp_gate,
          lw.booking_checkin,
          lw.bookingid,
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
          SELECT 
            lw1.id,
            lw1.doorid,
            lw1.doorname,
            lw1.memberid,
            lw1.membername,
            lw1.access,
            lw1.membershipname,
            lw1.timestamp,
            lw1.booking_checkin,
            lw1.bookingid
          FROM log_webhook lw1
          INNER JOIN (
            SELECT bookingid, MAX(timestamp) as max_timestamp, MAX(id) as max_id
            FROM log_webhook
            GROUP BY bookingid
          ) lw2 ON lw1.bookingid = lw2.bookingid 
            AND lw1.timestamp = lw2.max_timestamp
            AND lw1.id = lw2.max_id
        ) lw
        LEFT JOIN member m ON lw.memberid = m.member_id
        JOIN list_booking lb ON lw.bookingid = lb.id
        WHERE LOWER(TRIM(lb.resource_name)) = LOWER(TRIM(${ptName}))
        ORDER BY lw.timestamp DESC
        LIMIT 100
      `);
      // Drizzle dengan mysql2 mengembalikan [rows, metadata]
      const rows2 = Array.isArray(result2) && result2.length > 0 ? result2[0] : [];
      // Deduplikasi berdasarkan bookingid - ambil hanya 1 record per bookingid
      const uniqueBookings2 = new Map();
      (Array.isArray(rows2) ? rows2 : []).forEach((booking: any) => {
        const bookingId = booking.bookingid || booking.fingerlogid;
        if (bookingId && !uniqueBookings2.has(bookingId)) {
          uniqueBookings2.set(bookingId, booking);
        }
      });
      bookings = Array.from(uniqueBookings2.values());
    } else if (!ptName && !isAllClubs) {
      // Filter untuk Club saja
      const result3 = await db.execute(sql`
        SELECT
          lw.id,
          lw.doorid,
          lw.doorname,
          lw.memberid,
          COALESCE(
            CONCAT_WS(' ', m.first_name, m.last_name),
            lw.membername
          ) AS member_name,
          lw.access,
          lw.membershipname,
          lw.timestamp AS timestamp_gate,
          lw.booking_checkin,
          lw.bookingid,
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
          SELECT 
            lw1.id,
            lw1.doorid,
            lw1.doorname,
            lw1.memberid,
            lw1.membername,
            lw1.access,
            lw1.membershipname,
            lw1.timestamp,
            lw1.booking_checkin,
            lw1.bookingid
          FROM log_webhook lw1
          INNER JOIN (
            SELECT bookingid, MAX(timestamp) as max_timestamp, MAX(id) as max_id
            FROM log_webhook
            GROUP BY bookingid
          ) lw2 ON lw1.bookingid = lw2.bookingid 
            AND lw1.timestamp = lw2.max_timestamp
            AND lw1.id = lw2.max_id
        ) lw
        LEFT JOIN member m ON lw.memberid = m.member_id
        JOIN list_booking lb ON lw.bookingid = lb.id
        WHERE lb.club_name = ${clubName}
        ORDER BY lw.timestamp DESC
        LIMIT 100
      `);
      // Drizzle dengan mysql2 mengembalikan [rows, metadata]
      const rows3 = Array.isArray(result3) && result3.length > 0 ? result3[0] : [];
      // Deduplikasi berdasarkan bookingid - ambil hanya 1 record per bookingid
      const uniqueBookings3 = new Map();
      (Array.isArray(rows3) ? rows3 : []).forEach((booking: any) => {
        const bookingId = booking.bookingid || booking.fingerlogid;
        if (bookingId && !uniqueBookings3.has(bookingId)) {
          uniqueBookings3.set(bookingId, booking);
        }
      });
      bookings = Array.from(uniqueBookings3.values());
    } else {
      // Tanpa filter (All Clubs, All PT)
      const result4 = await db.execute(sql`
        SELECT
          lw.id,
          lw.doorid,
          lw.doorname,
          lw.memberid,
          COALESCE(
            CONCAT_WS(' ', m.first_name, m.last_name),
            lw.membername
          ) AS member_name,
          lw.access,
          lw.membershipname,
          lw.timestamp AS timestamp_gate,
          lw.booking_checkin,
          lw.bookingid,
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
          SELECT 
            lw1.id,
            lw1.doorid,
            lw1.doorname,
            lw1.memberid,
            lw1.membername,
            lw1.access,
            lw1.membershipname,
            lw1.timestamp,
            lw1.booking_checkin,
            lw1.bookingid
          FROM log_webhook lw1
          INNER JOIN (
            SELECT bookingid, MAX(timestamp) as max_timestamp, MAX(id) as max_id
            FROM log_webhook
            GROUP BY bookingid
          ) lw2 ON lw1.bookingid = lw2.bookingid 
            AND lw1.timestamp = lw2.max_timestamp
            AND lw1.id = lw2.max_id
        ) lw
        LEFT JOIN member m ON lw.memberid = m.member_id
        JOIN list_booking lb ON lw.bookingid = lb.id
        ORDER BY lw.timestamp DESC
        LIMIT 100
      `);
      // Drizzle dengan mysql2 mengembalikan [rows, metadata]
      const rows4 = Array.isArray(result4) && result4.length > 0 ? result4[0] : [];
      // Deduplikasi berdasarkan bookingid - ambil hanya 1 record per bookingid
      const uniqueBookings4 = new Map();
      (Array.isArray(rows4) ? rows4 : []).forEach((booking: any) => {
        const bookingId = booking.bookingid || booking.fingerlogid;
        if (bookingId && !uniqueBookings4.has(bookingId)) {
          uniqueBookings4.set(bookingId, booking);
        }
      });
      bookings = Array.from(uniqueBookings4.values());
    }

    // Gate verification: checklist jika booking_checkin = 1 DAN access = 'granted'
    // Data sudah ada di hasil query, tidak perlu query tambahan
    // Face validation sekarang langsung dari list_booking (face_booking_member dan face_booking_pt)

    // Debug: Log first booking untuk check timestamp_gate
    if (Array.isArray(bookings) && bookings.length > 0) {
      console.log('First booking timestamp_gate:', bookings[0].timestamp_gate, 'Type:', typeof bookings[0].timestamp_gate);
    }

    // Transform data untuk frontend
    const transformedData = (Array.isArray(bookings) ? bookings : []).map((booking: any, index: number) => {
      // Nama member sudah diambil dari query
      const memberName = booking.member_name || 'Unknown Member';
      const ptName = booking.resource_name || 'Unknown PT';
      
      // Gate verified: checklist jika booking_checkin = 1 DAN access = 'granted'
      const gateVerified = booking.booking_checkin === 1 && 
                          booking.access && 
                          booking.access.toLowerCase() === 'granted';
      
      // Booking verified: checklist jika booking_checkin = 1
      const bookingListVerified = booking.booking_checkin === 1;
      
      // Default status: belum verifikasi untuk member dan PT
      // Status akan diupdate berdasarkan sessionStorage di frontend
      // Format datetime dengan hari dan tanggal (dipisah untuk tampilan lebih rapi)
      const formatDateTime = (datetime: Date | null): { date: string; time: string } => {
        if (!datetime) return { date: '-', time: '-' };
        const date = new Date(datetime);
        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dayName = dayNames[date.getDay()];
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return {
          date: `${dayName}, ${day}/${month}/${year}`,
          time: `${hours}:${minutes}`
        };
      };

      // Format waktu untuk endtime (hanya waktu)
      // endtime adalah TIME type di MySQL yang dikembalikan sebagai string "HH:MM:SS"
      const formatTime = (time: Date | string | null): string => {
        if (!time) return '-';
        
        // Jika sudah string (format TIME dari MySQL: "HH:MM:SS" atau "HH:MM")
        if (typeof time === 'string') {
          // Ambil hanya jam dan menit (HH:MM)
          const timeParts = time.split(':');
          if (timeParts.length >= 2) {
            const hours = timeParts[0].padStart(2, '0');
            const minutes = timeParts[1].padStart(2, '0');
            return `${hours}:${minutes}`;
          }
          return time; // Return as is jika format tidak dikenali
        }
        
        // Jika Date object
        try {
          const date = new Date(time);
          if (isNaN(date.getTime())) {
            return '-';
          }
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          return `${hours}:${minutes}`;
        } catch (error) {
          console.warn('Error formatting time:', time, error);
          return '-';
        }
      };

      const startDateTime = formatDateTime(booking.daystarttime);
      // Handle timestamp_gate - bisa berupa Date, string, atau null
      let gateDateTime = { date: '-', time: '-' };
      if (booking.timestamp_gate) {
        try {
          // Jika timestamp_gate adalah string, convert ke Date
          const timestampDate = booking.timestamp_gate instanceof Date 
            ? booking.timestamp_gate 
            : new Date(booking.timestamp_gate);
          // Cek apakah valid date
          if (!isNaN(timestampDate.getTime())) {
            gateDateTime = formatDateTime(timestampDate);
          } else {
            console.warn('Invalid timestamp_gate date:', booking.timestamp_gate, 'for booking:', booking.bookingid);
          }
        } catch (error) {
          console.error('Error formatting timestamp_gate:', error, 'Value:', booking.timestamp_gate, 'Type:', typeof booking.timestamp_gate);
        }
      } else {
        // Log jika timestamp_gate null atau undefined
        if (index === 0) { // Log hanya untuk first item untuk avoid spam
          console.log('timestamp_gate is null/undefined for booking:', booking.bookingid);
        }
      }

      // Get face validation status langsung dari list_booking
      const faceBookingMember = booking.face_booking_member === 1;
      const faceBookingPt = booking.face_booking_pt === 1;

      return {
        nomor: index + 1, // Nomor urut (1, 2, 3, ...)
        member: memberName,
        pt: ptName,
        status: 'Belum Validasi', // Default status
        memberVerified: faceBookingMember, // Dari face_booking_member di fr_checkin_logs
        ptVerified: faceBookingPt, // Dari face_booking_pt di fr_checkin_logs
        bookingId: booking.bookingid ? Number(booking.bookingid) : null, // ID booking untuk keperluan verifikasi
        fingerlogId: booking.fingerlogid ? Number(booking.fingerlogid) : null, // ID dari list_booking
        memberId: booking.memberid ? Number(booking.memberid) : null,
        startDate: startDateTime.date,
        startTime: startDateTime.time,
        endTime: formatTime(booking.endtime),
        gateDate: gateDateTime.date, // Tanggal gate (hari, tanggal)
        gateTime: gateDateTime.time, // Waktu gate (HH:MM)
        gateVerified: gateVerified, // Checklist jika booking_checkin = 1 dan access = 'granted'
        bookingListVerified: bookingListVerified, // Checklist jika booking_checkin = 1
        faceVerified: faceBookingMember && faceBookingPt, // Checklist jika kedua-duanya sudah divalidasi
      };
    });

    // Simpan ke Redis cache dengan TTL 5 menit (300 detik)
    await setCache(cacheKey, transformedData, 300);

    return NextResponse.json({
      success: true,
      data: transformedData,
      cached: false,
    });
  } catch (error: any) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch bookings',
        data: []
      },
      { status: 500 }
    );
  }
}

