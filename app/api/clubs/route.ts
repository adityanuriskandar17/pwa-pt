import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Fetch unique club names from list_booking
    const clubs = await prisma.$queryRaw`
      SELECT DISTINCT club_name
      FROM list_booking
      WHERE club_name IS NOT NULL 
        AND club_name != ''
        AND (is_cancelled IS NULL OR is_cancelled = 0)
      ORDER BY club_name ASC
    ` as Array<{
      club_name: string | null;
    }>;

    // Extract club names and filter out null/empty values
    const clubNames = clubs
      .map(c => c.club_name)
      .filter((name): name is string => name !== null && name.trim() !== '');

    return NextResponse.json({
      success: true,
      data: clubNames,
    });
  } catch (error: any) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to fetch clubs',
        data: []
      },
      { status: 500 }
    );
  }
}

