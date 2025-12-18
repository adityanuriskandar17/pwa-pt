import { NextRequest, NextResponse } from 'next/server';
import { execute } from '@/lib/db';
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

    const bodySizeCheck = validateBodySize(await request.clone().json(), 50);
    if (!bodySizeCheck.valid) {
      return NextResponse.json(
        { error: bodySizeCheck.error || 'Request terlalu besar' },
        { status: 413 }
      );
    }

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

    const validatedBookingId = validateBigInt(bookingId);
    if (!validatedBookingId) {
      return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
    }

    if (!validateDateString(date)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    // Update list_booking
    const column = type === 'member' ? 'face_booking_member' : 'face_booking_pt';
    const result = await execute(
      `UPDATE list_booking SET ${column} = 1 WHERE id = ?`,
      [validatedBookingId]
    );

    // Invalidate cache
    await deleteCachePattern('bookings:*');

    return NextResponse.json({
      success: true,
      message: `Face validation ${type} updated successfully`,
      updated: result.affectedRows,
    });
  } catch (error: any) {
    console.error('Error updating face validation:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update face validation' },
      { status: 500 }
    );
  }
}
