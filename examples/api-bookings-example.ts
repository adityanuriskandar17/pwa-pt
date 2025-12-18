// Example: Get bookings with filters
// File: app/api/bookings/route.ts

import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/drizzle';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const clubName = searchParams.get('club');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build query conditions
        const conditions = [];

        if (clubName) {
            conditions.push(eq(schema.listBooking.clubName, clubName));
        }

        if (startDate) {
            conditions.push(gte(schema.listBooking.day, new Date(startDate)));
        }

        if (endDate) {
            conditions.push(lte(schema.listBooking.day, new Date(endDate)));
        }

        // Execute query
        const bookings = await db
            .select({
                id: schema.listBooking.id,
                day: schema.listBooking.day,
                starttime: schema.listBooking.starttime,
                endtime: schema.listBooking.endtime,
                resourceName: schema.listBooking.resourceName,
                clubName: schema.listBooking.clubName,
                type: schema.listBooking.type,
                memberId: schema.listBooking.memberId,
                isCancelled: schema.listBooking.isCancelled,
            })
            .from(schema.listBooking)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(schema.listBooking.day))
            .limit(100);

        return NextResponse.json({
            success: true,
            data: bookings,
            count: bookings.length,
            filters: {
                club: clubName,
                startDate,
                endDate,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}
