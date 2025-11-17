import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image_b64 } = body;

    if (!image_b64) {
      return NextResponse.json(
        { error: 'Gambar wajah harus diisi' },
        { status: 400 }
      );
    }

    // Get API URL from environment variable
    const faceApiUrl = process.env.FACE_API_URL || 'https://identity.ftlgym.com/api/validate-face';

    console.log('Calling face recognition API for login:', faceApiUrl);

    // Validate face dengan face recognition API
    const faceResponse = await fetch(faceApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_b64: image_b64,
      }),
    });

    if (!faceResponse.ok) {
      const errorText = await faceResponse.text();
      console.error('Face API error:', faceResponse.status, errorText);
      return NextResponse.json(
        { error: 'Wajah tidak terdaftar atau tidak dapat dikenali' },
        { status: 401 }
      );
    }

    const faceData = await faceResponse.json();

    // Check if face is matched - jika wajah terdeteksi dan terdaftar, izinkan login
    if (!faceData.ok || !faceData.matched) {
      console.log('Face not matched:', faceData);
      return NextResponse.json(
        { error: 'Wajah tidak terdaftar atau tidak cocok' },
        { status: 401 }
      );
    }

    // Wajah terdeteksi dan terdaftar - izinkan login
    console.log('Face matched successfully:', faceData.candidate);

    // Ambil data dari face recognition result
    const candidate = faceData.candidate || {};
    const email = candidate.email;
    const name = candidate.name || `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim();

    // Coba cari user di database berdasarkan email (opsional - untuk mendapatkan role_id dan club_id)
    let userData: {
      id: bigint;
      email: string;
      role_id: bigint | null;
      club_id: bigint | null;
    } | null = null;

    if (email) {
      try {
        const user = await prisma.$queryRaw`
          SELECT 
            id,
            email,
            role_id,
            club_id
          FROM user
          WHERE LOWER(email) = LOWER(${email})
          LIMIT 1
        ` as Array<{
          id: bigint;
          email: string;
          role_id: bigint | null;
          club_id: bigint | null;
        }>;

        if (user && user.length > 0) {
          userData = user[0];
          console.log('User found in database:', { id: userData.id, email: userData.email });
        } else {
          console.log('User not found in database, using face recognition data only');
        }
      } catch (dbError: any) {
        console.error('Database query error (non-critical):', dbError);
        // Continue without database data - use face recognition data only
      }
    }

    // Jika user ditemukan di database, gunakan data dari database
    // Jika tidak, gunakan data dari face recognition
    let clubName = null;
    let roleId = null;
    let clubId = null;
    let userId = null;
    let userEmail = email || '';

    if (userData) {
      userId = Number(userData.id);
      userEmail = userData.email;
      roleId = userData.role_id ? Number(userData.role_id) : null;
      clubId = userData.club_id ? Number(userData.club_id) : null;

      // Jika role_id = 11 (Personal Trainer), ambil club_name dari tabel club
      if (roleId === 11 && clubId) {
        try {
          const club = await prisma.$queryRaw`
            SELECT name
            FROM club
            WHERE id = ${clubId}
            LIMIT 1
          ` as Array<{
            name: string | null;
          }>;

          if (club && club.length > 0 && club[0].name) {
            clubName = club[0].name;
            console.log('Club found:', { clubId, clubName });
          }
        } catch (clubError: any) {
          console.error('Error fetching club:', clubError);
        }
      }
    } else {
      // Gunakan data dari face recognition
      userId = candidate.member_pk || candidate.gym_member_id || null;
      console.log('Using face recognition data only:', { name, email, userId });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: userEmail,
        name: name || undefined,
        roleId: roleId,
        clubId: clubId,
        clubName: clubName,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    
    let errorMessage = 'Terjadi kesalahan saat login';
    
    if (error.message?.includes('Database')) {
      errorMessage = 'Tidak dapat terhubung ke database. Pastikan database sedang berjalan dan konfigurasi benar.';
    } else if (error.message?.includes('fetch')) {
      errorMessage = 'Tidak dapat terhubung ke server face recognition. Pastikan server berjalan.';
    } else {
      errorMessage = error.message || 'Terjadi kesalahan saat login';
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
