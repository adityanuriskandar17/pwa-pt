// Example: Get all active trainers
// File: app/api/trainers/route.ts

import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/drizzle';
import { eq } from 'drizzle-orm';

export async function GET() {
    try {
        const trainers = await db
            .select({
                id: schema.frUser.id,
                firstName: schema.frUser.firstName,
                lastName: schema.frUser.lastName,
                email: schema.frUser.email,
                phone: schema.frUser.phone,
                ptLevel: schema.frUser.ptLevel,
                clubId: schema.frUser.clubId,
                status: schema.frUser.status,
            })
            .from(schema.frUser)
            .where(eq(schema.frUser.status, 'active'));

        return NextResponse.json({
            success: true,
            data: trainers,
            count: trainers.length,
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
