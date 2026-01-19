import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Query fr_created table untuk user test: Aditya Nur Iskandar
    const testEmail = 'adityanuriskandar7@gmail.com';
    const testName = 'Aditya Nur Iskandar';
    
    interface FRCreatedRow {
      id: number;
      name: string;
      email: string;
      member_pk?: number;
      gym_member_id?: number;
      created_at?: string;
      updated_at?: string;
    }
    
    // Try by email first
    let user: FRCreatedRow | null = await queryOne<FRCreatedRow>(
      `SELECT * FROM fr_created WHERE email = ? LIMIT 1`,
      [testEmail]
    );
    
    // If not found by email, try by name
    if (!user) {
      user = await queryOne<FRCreatedRow>(
        `SELECT * FROM fr_created WHERE name = ? LIMIT 1`,
        [testName]
      );
    }
    
    if (user) {
      return NextResponse.json({
        success: true,
        message: 'User ditemukan di database fr_created',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          member_pk: user.member_pk,
          gym_member_id: user.gym_member_id,
        },
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'User tidak ditemukan di database fr_created',
        searchedEmail: testEmail,
        searchedName: testName,
      });
    }
  } catch (error: any) {
    console.error('Test face user error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Terjadi kesalahan saat query database',
        details: error.message 
      },
      { status: 500 }
    );
  }
}



