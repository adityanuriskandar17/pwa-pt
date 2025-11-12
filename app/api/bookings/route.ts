import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get club_name from query parameter
    const { searchParams } = new URL(request.url);
    const clubName = searchParams.get('club_name');

    if (!clubName) {
      return NextResponse.json(
        { 
          success: false,
          error: 'club_name parameter is required',
          data: []
        },
        { status: 400 }
      );
    }

    // Fetch bookings dengan JOIN ke tabel member untuk mendapatkan nama member
    // Filter berdasarkan club_name yang dipilih
    const bookings = await prisma.$queryRaw`
      SELECT 
        lb.id,
        lb.member_id,
        lb.resource_name,
        lb.club_name,
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
    }>;

    // Transform data untuk frontend
    const transformedData = bookings.map((booking, index) => {
      // Nama member sudah diambil dari tabel member melalui JOIN
      const memberName = booking.member_name || 'Unknown Member';
      const ptName = booking.resource_name || 'Unknown PT';
      
      // Default status: belum verifikasi untuk member dan PT
      // Status akan diupdate berdasarkan sessionStorage di frontend
      return {
        nomor: index + 1, // Nomor urut (1, 2, 3, ...)
        member: memberName,
        pt: ptName,
        status: 'Belum Validasi', // Default status
        memberVerified: false,
        ptVerified: false,
        bookingId: booking.id ? Number(booking.id) : null, // ID booking untuk keperluan verifikasi
        memberId: booking.member_id ? Number(booking.member_id) : null,
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

