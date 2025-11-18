import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get current server time
    const serverTime = new Date();
    
    return NextResponse.json({
      success: true,
      time: serverTime.toISOString(),
      timestamp: serverTime.getTime(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  } catch (error: any) {
    console.error('Error getting server time:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to get server time' 
      },
      { status: 500 }
    );
  }
}

