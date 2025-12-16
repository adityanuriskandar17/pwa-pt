import { NextRequest, NextResponse } from 'next/server';
import { apiRateLimit } from '@/lib/rate-limit';
import { validateBase64Image, validateBodySize } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = await apiRateLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak request. Silakan coba lagi nanti.' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    // Validate request body size (image bisa besar, tapi limit 10MB)
    const bodySizeCheck = validateBodySize(await request.clone().json(), 10240); // Max 10MB
    if (!bodySizeCheck.valid) {
      return NextResponse.json(
        { error: bodySizeCheck.error || 'Request terlalu besar' },
        { status: 413 }
      );
    }

    const body = await request.json();
    const { image_b64, type } = body;

    if (!image_b64) {
      return NextResponse.json(
        { error: 'image_b64 is required' },
        { status: 400 }
      );
    }

    // Validate base64 image
    const imageValidation = validateBase64Image(image_b64, 5); // Max 5MB
    if (!imageValidation.valid) {
      return NextResponse.json(
        { error: imageValidation.error || 'Invalid image' },
        { status: 400 }
      );
    }

    // Get API URL based on type (member or pt)
    // PT uses different endpoint: FACE_PT_API_URL
    // Member uses: FACE_API_URL
    const faceApiUrl = type === 'pt' 
      ? (process.env.FACE_PT_API_URL || 'https://identity.ftlgym.com/api/validate-face-pt')
      : (process.env.FACE_API_URL || 'https://identity.ftlgym.com/api/validate-face');
    
    const faceApiKey = process.env.STAFF_FACE_API_KEY;

    // Validate API key is configured
    if (!faceApiKey) {
      console.error('STAFF_FACE_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    console.log(`Calling face recognition API for ${type || 'member'}:`, faceApiUrl);

    const response = await fetch(faceApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': faceApiKey,
      },
      body: JSON.stringify({
        image_b64: image_b64,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Face API error:', response.status, errorText);
      return NextResponse.json(
        { error: `Face recognition API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    // Jangan expose error details untuk security
    console.error('Face validation error:', error.message || 'Unknown error');
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat validasi wajah. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}

