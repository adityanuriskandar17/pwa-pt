import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
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
    const bodySizeCheck = validateBodySize(await request.clone().json(), 10); // Max 10KB
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
        { error: 'Email atau password salah' }, // Generic error untuk security
        { status: 401 }
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
      // Use LOWER() for case-insensitive email comparison dengan sanitized input
      const result = await db.execute(sql`
        SELECT 
          id,
          email,
          password,
          role_id,
          club_id
        FROM user
        WHERE LOWER(email) = LOWER(${sanitizedEmail})
        LIMIT 1
      `);
      
      // Drizzle dengan mysql2 mengembalikan [rows, metadata]
      const rows = Array.isArray(result) && result.length > 0 ? result[0] : [];
      user = rows as Array<{
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
      // Jangan log email untuk security (prevent user enumeration)
      console.log('Login attempt failed: user not found');
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }

    const userData = user[0];
    // Jangan log sensitive info
    console.log('Login attempt for user ID:', userData.id);

    // Verify password dengan format: SHA256('ftl#!' + password)
    // Note: SHA256 bukan best practice untuk password hashing, tapi ini untuk backward compatibility
    // Idealnya pakai bcrypt/argon2, tapi perlu migration semua password di database
    const trimmedPassword = sanitizedPassword;
    const storedPassword = (userData.password || '').trim();
    
    // Format yang benar: SHA256(secret + password)
    // Gunakan environment variable untuk secret key (WAJIB diubah di production!)
    const secretKey = process.env.PASSWORD_SECRET || 'ftl#!';
    const passwordWithSecret = secretKey + trimmedPassword;
    const hashedPassword = crypto.createHash('sha256').update(passwordWithSecret).digest('hex');
    
    // Constant-time comparison untuk prevent timing attacks
    // Note: timingSafeEqual hanya bekerja jika kedua string length sama
    let isPasswordValid = false;
    if (storedPassword.length === hashedPassword.length) {
      try {
        isPasswordValid = crypto.timingSafeEqual(
          Buffer.from(storedPassword, 'hex'),
          Buffer.from(hashedPassword, 'hex')
        );
      } catch {
        // Fallback jika tidak valid hex
        isPasswordValid = false;
      }
    }
    
    // Fallback untuk backward compatibility (case-insensitive comparison)
    if (!isPasswordValid) {
      isPasswordValid = storedPassword === hashedPassword || 
                       storedPassword.toLowerCase() === hashedPassword.toLowerCase();
    }
    
    if (!isPasswordValid) {
      // Jangan log password details untuk security
      console.log('Login attempt failed: invalid password for user ID:', userData.id);
      return NextResponse.json(
        { error: 'Email atau password salah' },
        { status: 401 }
      );
    }
    
    console.log('Login successful for user ID:', userData.id);

    // Jika role_id = 11 (Personal Trainer), ambil club_name dari tabel club
    let clubName = null;
    if (userData.role_id && Number(userData.role_id) === 11 && userData.club_id) {
      try {
        const clubResult = await db.execute(sql`
          SELECT name
          FROM club
          WHERE id = ${userData.club_id}
          LIMIT 1
        `);
        // Drizzle dengan mysql2 mengembalikan [rows, metadata]
        const club = Array.isArray(clubResult) && clubResult.length > 0 ? clubResult[0] : [];

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
    // Jangan expose error details untuk security
    console.error('Login error:', error.message || 'Unknown error');
    
    // Generic error message untuk prevent information leakage
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat login. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}
