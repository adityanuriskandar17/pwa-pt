import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import crypto from 'crypto';
import { loginRateLimit } from '@/lib/rate-limit';
import { validateEmail, sanitizeString, validateBodySize } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await loginRateLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Terlalu banyak percobaan login. Silakan coba lagi setelah beberapa saat.',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
          }
        }
      );
    }

    // Validate request body size
    const bodySizeCheck = validateBodySize(await request.clone().json(), 10);
    if (!bodySizeCheck.valid) {
      return NextResponse.json(
        { error: bodySizeCheck.error || 'Request terlalu besar' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { email, password } = body;

    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email dan password harus diisi' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Format email tidak valid' },
        { status: 400 }
      );
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeString(email, 255).toLowerCase();
    const sanitizedPassword = sanitizeString(password, 100);

    // Password length check
    if (sanitizedPassword.length < 6 || sanitizedPassword.length > 100) {
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    // Query user dari database mobile_database (table: fr_user)
    interface UserRow {
      id: number;
      email: string;
      password: string;
      role_id: number | null;
      club_id: number | null;
    }
    
    let userData: UserRow | null;
    
    try {
      userData = await queryOne<UserRow>(
        `SELECT id, email, password, role_id, club_id
         FROM fr_user
         WHERE LOWER(email) = LOWER(?)
         LIMIT 1`,
        [sanitizedEmail]
      );
    } catch (dbError: any) {
      console.error('Database query error:', dbError);
      return NextResponse.json(
        { error: 'Terjadi kesalahan saat mengakses database. Pastikan database sedang berjalan.' },
        { status: 500 }
      );
    }

    if (!userData) {
      console.log('Login attempt failed: user not found');
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    console.log('Login attempt for user ID:', userData.id);

    // Verify password dengan format: SHA256('ftl#!' + password)
    const trimmedPassword = sanitizedPassword;
    const storedPassword = (userData.password || '').trim();
    
    const secretKey = process.env.PASSWORD_SECRET || 'ftl#!';
    const passwordWithSecret = secretKey + trimmedPassword;
    const hashedPassword = crypto.createHash('sha256').update(passwordWithSecret).digest('hex');
    
    // Constant-time comparison
    let isPasswordValid = false;
    if (storedPassword.length === hashedPassword.length) {
      try {
        isPasswordValid = crypto.timingSafeEqual(
          Buffer.from(storedPassword, 'hex'),
          Buffer.from(hashedPassword, 'hex')
        );
      } catch {
        isPasswordValid = false;
      }
    }
    
    // Fallback
    if (!isPasswordValid) {
      isPasswordValid = storedPassword === hashedPassword || 
                       storedPassword.toLowerCase() === hashedPassword.toLowerCase();
    }
    
    if (!isPasswordValid) {
      console.log('Login attempt failed: invalid password for user ID:', userData.id);
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }
    
    console.log('Login successful for user ID:', userData.id);

    // Jika role_id = 11, ambil club_name dari fr_door
    let clubName = null;
    if (userData.role_id && Number(userData.role_id) === 11 && userData.club_id) {
      try {
        const club = await queryOne<{ name: string }>(
          `SELECT name FROM fr_door WHERE id = ? LIMIT 1`,
          [userData.club_id]
        );
        if (club) {
          clubName = club.name;
          console.log('Club found:', { clubId: userData.club_id, clubName });
        }
      } catch (clubError: any) {
        console.error('Error fetching club:', clubError);
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
    console.error('Login error:', error.message || 'Unknown error');
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat login. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
