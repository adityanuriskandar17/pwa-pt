import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { getCache, setCache } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = new URL(request.url).searchParams.get('force_refresh') === 'true';
    const cacheKey = 'clubs:list';
    
    // Cek Redis cache terlebih dahulu
    if (!forceRefresh) {
      const cachedData = await getCache(cacheKey);
      if (cachedData) {
        console.log('Using Redis cache for clubs list');
        return NextResponse.json({
          success: true,
          data: cachedData,
          cached: true,
        });
      }
    }
    
    // Fetch unique club names from list_booking
    // Query sudah optimal: hanya SELECT club_name, ada WHERE filter, ada ORDER BY
    const clubsResult = await db.execute(sql`
      SELECT DISTINCT club_name
      FROM list_booking
      WHERE club_name IS NOT NULL 
        AND club_name != ''
        AND (is_cancelled IS NULL OR is_cancelled = 0)
      ORDER BY club_name ASC
    `);
    // Drizzle dengan mysql2 mengembalikan [rows, metadata]
    const clubs = Array.isArray(clubsResult) && clubsResult.length > 0 ? clubsResult[0] : [];

    // Extract club names and filter out null/empty values
    const clubNames = clubs
      .map(c => c.club_name)
      .filter((name): name is string => name !== null && name.trim() !== '');

    // Simpan ke Redis cache dengan TTL 10 menit (clubs jarang berubah)
    await setCache(cacheKey, clubNames, 600);

    return NextResponse.json({
      success: true,
      data: clubNames,
      cached: false,
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

