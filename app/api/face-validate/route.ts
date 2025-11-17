import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image_b64 } = body;

    if (!image_b64) {
      return NextResponse.json(
        { error: 'image_b64 is required' },
        { status: 400 }
      );
    }

    // Get API URL from environment variable (server-side, tidak perlu NEXT_PUBLIC_)
    const faceApiUrl = process.env.FACE_API_URL || 'https://identity.ftlgym.com/api/validate-face';

    console.log('Calling face recognition API:', faceApiUrl);

    const response = await fetch(faceApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
    console.error('Face validation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to connect to face recognition server' },
      { status: 500 }
    );
  }
}

