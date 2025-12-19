import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware untuk security checks
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // Security headers (tambahan dari next.config)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Set Permissions-Policy based on route
  // Verification page needs camera access
  if (pathname === '/verification' || pathname.startsWith('/verification')) {
    response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  } else {
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  }
  
  // Prevent caching of verification page to ensure fresh headers
  if (pathname === '/verification' || pathname.startsWith('/verification')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // CORS headers (jika diperlukan)
  const origin = request.headers.get('origin');
  if (origin && process.env.ALLOWED_ORIGINS?.split(',').includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Block suspicious requests
  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /\.\.\//, // Path traversal
    /<script/i, // XSS attempt
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent) || pattern.test(request.url)) {
      console.warn('Blocked suspicious request:', { url: request.url, userAgent });
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return response;
}

// Apply middleware ke semua routes kecuali static files dan API
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - verification (allow camera and TensorFlow.js)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};













