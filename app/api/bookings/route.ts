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
      endtime: Date | null;
    }>;

    // Build query dengan conditional WHERE clause menggunakan Prisma template literal
    if (ptName && !isAllClubs) {
      // Filter untuk PT dan Club
      bookings = await prisma.$queryRaw`
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
          lb.endtime
        FROM log_webhook lw
        LEFT JOIN member m ON lw.memberid = m.member_id
        JOIN list_booking lb ON lw.bookingid = lb.id
        WHERE lb.club_name = ${clubName}
          AND LOWER(TRIM(lb.resource_name)) = LOWER(TRIM(${ptName}))
        ORDER BY lw.timestamp DESC
        LIMIT 100
      ` as Array<{
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
        endtime: Date | null;
      }>;
    } else if (ptName && isAllClubs) {
      // Filter untuk PT saja (All Clubs)
      bookings = await prisma.$queryRaw`
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
          lb.endtime
        FROM log_webhook lw
        LEFT JOIN member m ON lw.memberid = m.member_id
        JOIN list_booking lb ON lw.bookingid = lb.id
        WHERE LOWER(TRIM(lb.resource_name)) = LOWER(TRIM(${ptName}))
        ORDER BY lw.timestamp DESC
        LIMIT 100
      ` as Array<{
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
        endtime: Date | null;
      }>;
    } else if (!ptName && !isAllClubs) {
      // Filter untuk Club saja
      bookings = await prisma.$queryRaw`
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
          lb.endtime
        FROM log_webhook lw
        LEFT JOIN member m ON lw.memberid = m.member_id
        JOIN list_booking lb ON lw.bookingid = lb.id
        WHERE lb.club_name = ${clubName}
        ORDER BY lw.timestamp DESC
        LIMIT 100
      ` as Array<{
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
        endtime: Date | null;
      }>;
    } else {
      // Tanpa filter (All Clubs, All PT)
      bookings = await prisma.$queryRaw`
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
          lb.endtime
        FROM log_webhook lw
        LEFT JOIN member m ON lw.memberid = m.member_id
        JOIN list_booking lb ON lw.bookingid = lb.id
        ORDER BY lw.timestamp DESC
        LIMIT 100
      ` as Array<{
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
        endtime: Date | null;
      }>;
    }

    // Gate verification: checklist jika booking_checkin = 1 DAN access = 'granted'
    // Data sudah ada di hasil query, tidak perlu query tambahan

    // Query face validation status dari fr_checkin_logs
    const faceValidationMap = new Map<string, { faceBookingMember: number; faceBookingPt: number }>();
    
    if (bookings.length > 0) {
      // Prepare data untuk query face validation
      const faceValidationData: Array<{ memberName: string; date: string; index: number }> = [];
      bookings.forEach((booking, index) => {
        const memberName = booking.member_name || 'Unknown Member';
        if (booking.daystarttime && memberName && memberName !== 'Unknown Member') {
          const bookingDate = new Date(booking.daystarttime);
          const year = bookingDate.getFullYear();
          const month = String(bookingDate.getMonth() + 1).padStart(2, '0');
          const day = String(bookingDate.getDate()).padStart(2, '0');
          const bookingDateStr = `${year}-${month}-${day}`;
          faceValidationData.push({ memberName, date: bookingDateStr, index });
        }
      });

      // Query face validation untuk semua booking (parallel execution)
      if (faceValidationData.length > 0) {
        await Promise.all(
          faceValidationData.map(async (item) => {
            try {
              const faceValidation = await prisma.$queryRaw<Array<{
                face_booking_member: number;
                face_booking_pt: number;
              }>>`
                SELECT 
                  COALESCE(MAX(face_booking_member), 0) as face_booking_member,
                  COALESCE(MAX(face_booking_pt), 0) as face_booking_pt
                FROM fr_checkin_logs
                WHERE LOWER(TRIM(name)) = LOWER(TRIM(${item.memberName}))
                  AND date = ${item.date}
              `;
              
              if (faceValidation && faceValidation.length > 0) {
                faceValidationMap.set(item.index.toString(), {
                  faceBookingMember: Number(faceValidation[0].face_booking_member),
                  faceBookingPt: Number(faceValidation[0].face_booking_pt),
                });
              }
            } catch (error) {
              console.error('Error checking face validation:', error);
            }
          })
        );
      }
    }

    // Debug: Log first booking untuk check timestamp_gate
    if (bookings.length > 0) {
      console.log('First booking timestamp_gate:', bookings[0].timestamp_gate, 'Type:', typeof bookings[0].timestamp_gate);
    }

    // Transform data untuk frontend
    const transformedData = bookings.map((booking, index) => {
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
      const formatTime = (time: Date | null): string => {
        if (!time) return '-';
        const date = new Date(time);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
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

      // Get face validation status dari map
      const faceValidation = faceValidationMap.get(index.toString());
      const faceBookingMember = faceValidation?.faceBookingMember === 1;
      const faceBookingPt = faceValidation?.faceBookingPt === 1;

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

