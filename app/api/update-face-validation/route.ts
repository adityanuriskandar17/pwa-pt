import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { deleteCachePattern } from '@/lib/redis';
import { apiRateLimit } from '@/lib/rate-limit';
import { validateBigInt, sanitizeString, validateBodySize, validateDateString } from '@/lib/validation';

export async function POST(request: NextRequest) {
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

    // Validate request body size
    const bodySizeCheck = validateBodySize(await request.clone().json(), 50); // Max 50KB
    if (!bodySizeCheck.valid) {
      return NextResponse.json(
        { error: bodySizeCheck.error || 'Request terlalu besar' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { memberName, memberId, bookingId, type, date } = body;

    // Input validation
    if (!memberName || !bookingId || !type || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: memberName, bookingId, type, date' },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== 'member' && type !== 'pt') {
      return NextResponse.json(
        { error: 'Type must be "member" or "pt"' },
        { status: 400 }
      );
    }

    // Validate and sanitize inputs
    const sanitizedMemberName = sanitizeString(memberName, 255);
    const validatedBookingId = validateBigInt(bookingId);
    
    if (!validatedBookingId) {
      return NextResponse.json(
        { error: 'Invalid bookingId' },
        { status: 400 }
      );
    }

    if (!validateDateString(date)) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Update list_booking berdasarkan bookingId (dengan validated input)
    // Update face_booking_member jika type = 'member'
    // Update face_booking_pt jika type = 'pt'
    let result;
    if (type === 'member') {
      result = await db.execute(sql`
        UPDATE list_booking
        SET face_booking_member = 1
        WHERE id = ${validatedBookingId}
      `);
    } else {
      result = await db.execute(sql`
        UPDATE list_booking
        SET face_booking_pt = 1
        WHERE id = ${validatedBookingId}
      `);
    }

    // Drizzle dengan mysql2 mengembalikan [result, metadata] untuk UPDATE
    const updateResult = Array.isArray(result) && result.length > 0 ? result[0] : result;
    const affectedRows = (updateResult as any)?.affectedRows || 0;

    // Invalidate semua cache bookings karena data sudah berubah
    await deleteCachePattern('bookings:*');

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

