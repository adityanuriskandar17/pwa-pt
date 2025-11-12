import { NextRequest, NextResponse } from 'next/server';

// Temporary: Simple authentication without database
// TODO: Replace with Prisma database query

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

    // TODO: Replace with actual database query using Prisma
    // For now, using simple validation
    // Example: Check against database using Prisma
    // const user = await prisma.user.findFirst({
    //   where: {
    //     email: email,
    //     password: hashedPassword,
    //   },
    // });

    // Temporary mock response for testing
    // Remove this when database is connected
    if (email && password) {
      return NextResponse.json({
        success: true,
        user: {
          id: 1,
          email: email,
        },
      });
    }

    return NextResponse.json(
      { error: 'Email atau password salah' },
      { status: 401 }
    );
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

