import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

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

    // Update list_booking berdasarkan bookingId
    // Update face_booking_member jika type = 'member'
    // Update face_booking_pt jika type = 'pt'
    let result;
    if (type === 'member') {
      result = await db.execute(sql`
        UPDATE list_booking
        SET face_booking_member = 1
        WHERE id = ${BigInt(bookingId)}
      `);
    } else {
      result = await db.execute(sql`
        UPDATE list_booking
        SET face_booking_pt = 1
        WHERE id = ${BigInt(bookingId)}
      `);
    }

    // Drizzle dengan mysql2 mengembalikan [result, metadata] untuk UPDATE
    const updateResult = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const affectedRows = (updateResult as any)?.affectedRows || 0;

    return NextResponse.json({
      success: true,
      message: `Face validation ${type} updated successfully`,
      updated: affectedRows,
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

