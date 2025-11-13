import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }

    // Query user dari database (case-insensitive email)
    let user: Array<{
      id: bigint;
      email: string;
      password: string;
      role_id: bigint | null;
      club_id: bigint | null;
    }>;
    
    try {
      // Use LOWER() for case-insensitive email comparison
      user = await prisma.$queryRaw`
        SELECT 
          id,
          email,
          password,
          role_id,
          club_id
        FROM user
        WHERE LOWER(email) = LOWER(${email})
        LIMIT 1
      ` as Array<{
        id: bigint;
        email: string;
        password: string;
        role_id: bigint | null;
        club_id: bigint | null;
      }>;
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      console.error('Error details:', {
        message: dbError.message,
        code: dbError.code,
        sqlState: dbError.sqlState
      });
      return NextResponse.json(
        { error: 'Terjadi kesalahan saat mengakses database. Pastikan database sedang berjalan.' },
        { status: 500 }
      );
    }

    if (!user || user.length === 0) {
      console.log('User not found for email:', email);
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const userData = user[0];
    console.log('User found:', { id: userData.id, email: userData.email, hasPassword: !!userData.password });

    // Verify password dengan format: SHA256('ftl#!' + password)
    const trimmedPassword = password.trim();
    const storedPassword = (userData.password || '').trim();
    
    // Format yang benar: SHA256('ftl#!' + password)
    const secretKey = 'ftl#!';
    const passwordWithSecret = secretKey + trimmedPassword;
    const hashedPassword = crypto.createHash('sha256').update(passwordWithSecret).digest('hex');
    
    // Compare dengan stored password
    const isPasswordValid = storedPassword === hashedPassword || 
                           storedPassword.toLowerCase() === hashedPassword.toLowerCase();
    
    if (!isPasswordValid) {
      console.log('Password mismatch:', {
        providedLength: trimmedPassword.length,
        storedLength: storedPassword.length,
        storedFirstChars: storedPassword.substring(0, 10) + '...',
        hashedFirstChars: hashedPassword.substring(0, 10) + '...',
        match: storedPassword === hashedPassword,
        lowerMatch: storedPassword.toLowerCase() === hashedPassword.toLowerCase()
      });
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }
    
    console.log('Password verified successfully');

    // Jika role_id = 11 (Personal Trainer), ambil club_name dari tabel club
    let clubName = null;
    if (userData.role_id && Number(userData.role_id) === 11 && userData.club_id) {
      try {
        const club = await prisma.$queryRaw`
          SELECT name
          FROM club
          WHERE id = ${userData.club_id}
          LIMIT 1
        ` as Array<{
          name: string | null;
        }>;

        if (club && club.length > 0 && club[0].name) {
          clubName = club[0].name;
          console.log('Club found:', { clubId: userData.club_id, clubName });
        } else {
          console.warn('Club not found for club_id:', userData.club_id);
        }
      } catch (clubError: any) {
        console.error('Error fetching club:', clubError);
        // Continue without club name - user can still login
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: Number(userData.id),
        email: userData.email,
        roleId: userData.role_id ? Number(userData.role_id) : null,
        clubId: userData.club_id ? Number(userData.club_id) : null,
        clubName: clubName,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    let errorMessage = 'Terjadi kesalahan saat login';
    
    if (error.message?.includes('Database')) {
      errorMessage = 'Tidak dapat terhubung ke database. Pastikan database sedang berjalan dan konfigurasi benar.';
    } else {
      errorMessage = error.message || 'Terjadi kesalahan saat login';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

