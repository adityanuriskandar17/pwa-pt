import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get club_name and pt_name from query parameters
    const { searchParams } = new URL(request.url);
    const clubName = searchParams.get('club_name');
    const ptName = searchParams.get('pt_name'); // Nama Personal Trainer untuk filter (jika role_id = 11)

    // Allow "All Club" or empty string to fetch all clubs
    const isAllClubs = !clubName || clubName === 'All Club' || clubName === '';

    // Fetch bookings dengan JOIN ke tabel member untuk mendapatkan nama member
    // Filter berdasarkan club_name yang dipilih
    // Jika pt_name diberikan, filter juga berdasarkan resource_name (untuk Personal Trainer)
    let bookings: Array<{
      id: bigint | null;
      member_id: bigint | null;
      resource_name: string | null;
      club_name: string | null;
      member_name: string | null;
      daystarttime: Date | null;
      endtime: Date | null;
      day: Date | null;
    }>;

    if (ptName) {
      // Filter untuk Personal Trainer - hanya tampilkan booking dimana resource_name = ptName
      if (isAllClubs) {
        bookings = await prisma.$queryRaw`
          SELECT 
            lb.id,
            lb.member_id,
            lb.resource_name,
            lb.club_name,
            lb.daystarttime,
            lb.endtime,
            lb.day,
            CASE 
              WHEN m.first_name IS NOT NULL AND m.last_name IS NOT NULL AND m.first_name != '' AND m.last_name != ''
                THEN CONCAT(TRIM(m.first_name), ' ', TRIM(m.last_name))
              WHEN m.first_name IS NOT NULL AND m.first_name != ''
                THEN TRIM(m.first_name)
              WHEN m.last_name IS NOT NULL AND m.last_name != ''
                THEN TRIM(m.last_name)
              ELSE 'Unknown Member'
            END as member_name
          FROM list_booking lb
          LEFT JOIN member m ON lb.member_id = m.member_id
          WHERE (lb.is_cancelled IS NULL OR lb.is_cancelled = 0)
            AND lb.member_id IS NOT NULL
            AND LOWER(TRIM(lb.resource_name)) = LOWER(TRIM(${ptName}))
          ORDER BY lb.id DESC
          LIMIT 100
        ` as Array<{
          id: bigint | null;
          member_id: bigint | null;
          resource_name: string | null;
          club_name: string | null;
          member_name: string | null;
          daystarttime: Date | null;
          endtime: Date | null;
          day: Date | null;
        }>;
      } else {
        bookings = await prisma.$queryRaw`
          SELECT 
            lb.id,
            lb.member_id,
            lb.resource_name,
            lb.club_name,
            lb.daystarttime,
            lb.endtime,
            lb.day,
            CASE 
              WHEN m.first_name IS NOT NULL AND m.last_name IS NOT NULL AND m.first_name != '' AND m.last_name != ''
                THEN CONCAT(TRIM(m.first_name), ' ', TRIM(m.last_name))
              WHEN m.first_name IS NOT NULL AND m.first_name != ''
                THEN TRIM(m.first_name)
              WHEN m.last_name IS NOT NULL AND m.last_name != ''
                THEN TRIM(m.last_name)
              ELSE 'Unknown Member'
            END as member_name
          FROM list_booking lb
          LEFT JOIN member m ON lb.member_id = m.member_id
          WHERE (lb.is_cancelled IS NULL OR lb.is_cancelled = 0)
            AND lb.member_id IS NOT NULL
            AND lb.club_name = ${clubName}
            AND LOWER(TRIM(lb.resource_name)) = LOWER(TRIM(${ptName}))
          ORDER BY lb.id DESC
          LIMIT 100
        ` as Array<{
          id: bigint | null;
          member_id: bigint | null;
          resource_name: string | null;
          club_name: string | null;
          member_name: string | null;
          daystarttime: Date | null;
          endtime: Date | null;
          day: Date | null;
        }>;
      }
    } else {
      // Tanpa filter PT - tampilkan semua booking di club tersebut atau semua club
      if (isAllClubs) {
        bookings = await prisma.$queryRaw`
          SELECT 
            lb.id,
            lb.member_id,
            lb.resource_name,
            lb.club_name,
            lb.daystarttime,
            lb.endtime,
            lb.day,
            CASE 
              WHEN m.first_name IS NOT NULL AND m.last_name IS NOT NULL AND m.first_name != '' AND m.last_name != ''
                THEN CONCAT(TRIM(m.first_name), ' ', TRIM(m.last_name))
              WHEN m.first_name IS NOT NULL AND m.first_name != ''
                THEN TRIM(m.first_name)
              WHEN m.last_name IS NOT NULL AND m.last_name != ''
                THEN TRIM(m.last_name)
              ELSE 'Unknown Member'
            END as member_name
          FROM list_booking lb
          LEFT JOIN member m ON lb.member_id = m.member_id
          WHERE (lb.is_cancelled IS NULL OR lb.is_cancelled = 0)
            AND lb.member_id IS NOT NULL
          ORDER BY lb.id DESC
          LIMIT 100
        ` as Array<{
          id: bigint | null;
          member_id: bigint | null;
          resource_name: string | null;
          club_name: string | null;
          member_name: string | null;
          daystarttime: Date | null;
          endtime: Date | null;
          day: Date | null;
        }>;
      } else {
        bookings = await prisma.$queryRaw`
          SELECT 
            lb.id,
            lb.member_id,
            lb.resource_name,
            lb.club_name,
            lb.daystarttime,
            lb.endtime,
            lb.day,
            CASE 
              WHEN m.first_name IS NOT NULL AND m.last_name IS NOT NULL AND m.first_name != '' AND m.last_name != ''
                THEN CONCAT(TRIM(m.first_name), ' ', TRIM(m.last_name))
              WHEN m.first_name IS NOT NULL AND m.first_name != ''
                THEN TRIM(m.first_name)
              WHEN m.last_name IS NOT NULL AND m.last_name != ''
                THEN TRIM(m.last_name)
              ELSE 'Unknown Member'
            END as member_name
          FROM list_booking lb
          LEFT JOIN member m ON lb.member_id = m.member_id
          WHERE (lb.is_cancelled IS NULL OR lb.is_cancelled = 0)
            AND lb.member_id IS NOT NULL
            AND lb.club_name = ${clubName}
          ORDER BY lb.id DESC
          LIMIT 100
        ` as Array<{
          id: bigint | null;
          member_id: bigint | null;
          resource_name: string | null;
          club_name: string | null;
          member_name: string | null;
          daystarttime: Date | null;
          endtime: Date | null;
          day: Date | null;
        }>;
      }
    }

    // Prepare data untuk check-in verification
    const checkinData: Array<{ memberName: string; date: string; index: number }> = [];
    bookings.forEach((booking, index) => {
      const memberName = booking.member_name || 'Unknown Member';
      if (booking.daystarttime && memberName && memberName !== 'Unknown Member') {
        const bookingDate = new Date(booking.daystarttime);
        const year = bookingDate.getFullYear();
        const month = String(bookingDate.getMonth() + 1).padStart(2, '0');
        const day = String(bookingDate.getDate()).padStart(2, '0');
        const bookingDateStr = `${year}-${month}-${day}`;
        checkinData.push({ memberName, date: bookingDateStr, index });
      }
    });

    // Check check-in untuk setiap booking (parallel execution untuk performa)
    const gateVerifiedMap = new Map<number, boolean>();
    if (checkinData.length > 0) {
      await Promise.all(
        checkinData.map(async (item) => {
          try {
            const checkinLogs = await prisma.$queryRaw<Array<{ count: bigint }>>`
              SELECT COUNT(*) as count
              FROM fr_checkin_logs
              WHERE LOWER(TRIM(name)) = LOWER(TRIM(${item.memberName}))
                AND date = ${item.date}
                AND (status IS NULL OR status = '' OR LOWER(status) = 'success' OR status != 'failed')
            `;
            if (checkinLogs && checkinLogs.length > 0 && Number(checkinLogs[0].count) > 0) {
              gateVerifiedMap.set(item.index, true);
            }
          } catch (error) {
            console.error('Error checking check-in log:', error);
            gateVerifiedMap.set(item.index, false);
          }
        })
      );
    }

    // Transform data untuk frontend
    const transformedData = bookings.map((booking, index) => {
      // Nama member sudah diambil dari tabel member melalui JOIN
      const memberName = booking.member_name || 'Unknown Member';
      const ptName = booking.resource_name || 'Unknown PT';
      
      // Ambil gateVerified dari map (default: false)
      const gateVerified = gateVerifiedMap.get(index) || false;
      
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
      const formatTime = (time: Date | null): string => {
        if (!time) return '-';
        const date = new Date(time);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      };

      const startDateTime = formatDateTime(booking.daystarttime);

      return {
        nomor: index + 1, // Nomor urut (1, 2, 3, ...)
        member: memberName,
        pt: ptName,
        status: 'Belum Validasi', // Default status
        memberVerified: false,
        ptVerified: false,
        bookingId: booking.id ? Number(booking.id) : null, // ID booking untuk keperluan verifikasi
        memberId: booking.member_id ? Number(booking.member_id) : null,
        startDate: startDateTime.date,
        startTime: startDateTime.time,
        endTime: formatTime(booking.endtime),
        gateVerified: gateVerified, // Sudah dicek dari fr_checkin_logs
        bookingListVerified: false, // Default: belum terverifikasi
        faceVerified: false, // Default: belum terverifikasi (akan diupdate berdasarkan memberVerified && ptVerified)
      };
    });

    return NextResponse.json({
      success: true,
      data: transformedData,
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

