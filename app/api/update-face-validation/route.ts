import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberName, memberId, bookingId, type, date } = body;

    if (!memberName || !bookingId || !type || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: memberName, bookingId, type, date' },
        { status: 400 }
      );
    }

    if (type !== 'member' && type !== 'pt') {
      return NextResponse.json(
        { error: 'Type must be "member" or "pt"' },
        { status: 400 }
      );
    }

    // Format date ke YYYY-MM-DD
    const dateStr = typeof date === 'string' ? date.split('T')[0] : date;
    
    // Update fr_checkin_logs berdasarkan member name dan date
    // Update face_booking_member jika type = 'member'
    // Update face_booking_pt jika type = 'pt'
    // Jika memberId ada, gunakan untuk filter tambahan, jika tidak, hanya gunakan name dan date
    let result;
    if (type === 'member') {
      if (memberId) {
        result = await prisma.$executeRaw`
          UPDATE fr_checkin_logs
          SET face_booking_member = 1
          WHERE LOWER(TRIM(name)) = LOWER(TRIM(${memberName}))
            AND date = ${dateStr}
            AND member_id = ${BigInt(memberId)}
        `;
      } else {
        result = await prisma.$executeRaw`
          UPDATE fr_checkin_logs
          SET face_booking_member = 1
          WHERE LOWER(TRIM(name)) = LOWER(TRIM(${memberName}))
            AND date = ${dateStr}
        `;
      }
    } else {
      if (memberId) {
        result = await prisma.$executeRaw`
          UPDATE fr_checkin_logs
          SET face_booking_pt = 1
          WHERE LOWER(TRIM(name)) = LOWER(TRIM(${memberName}))
            AND date = ${dateStr}
            AND member_id = ${BigInt(memberId)}
        `;
      } else {
        result = await prisma.$executeRaw`
          UPDATE fr_checkin_logs
          SET face_booking_pt = 1
          WHERE LOWER(TRIM(name)) = LOWER(TRIM(${memberName}))
            AND date = ${dateStr}
        `;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Face validation ${type} updated successfully`,
      updated: Number(result),
    });
  } catch (error: any) {
    console.error('Error updating face validation:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to update face validation'
      },
      { status: 500 }
    );
  }
}

