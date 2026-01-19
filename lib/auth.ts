import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// Session management dengan secure httpOnly cookies
export interface UserSession {
  id: number;
  email: string;
  roleId: number | null;
  clubId: number | null;
  clubName: string | null;
  name?: string;
}

// Generate secure session token
export function generateSessionToken(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// Set session cookie
export async function setSession(sessionData: UserSession): Promise<string> {
  const token = generateSessionToken();
  const expires = new Date();
  expires.setTime(expires.getTime() + 24 * 60 * 60 * 1000); // 24 jam

  // Store session in Redis atau database (untuk production)
  // Untuk sekarang, kita simpan di cookie dengan httpOnly
  const cookieStore = await cookies();
  cookieStore.set('session_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expires,
    path: '/',
  });

  // Simpan session data ke Redis/database dengan key = token
  // Untuk sekarang, kita return token dan simpan di client (temporary)
  return token;
}

// Get session from request
export async function getSession(request: NextRequest): Promise<UserSession | null> {
  try {
    // Cek dari cookie
    const token = request.cookies.get('session_token')?.value;
    
    if (!token) {
      // Fallback: cek dari Authorization header (untuk API calls)
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const bearerToken = authHeader.substring(7);
        // Validate token dari Redis/database
        // Untuk sekarang, return null (perlu implementasi)
        return null;
      }
      return null;
    }

    // Validate token dari Redis/database
    // Untuk sekarang, kita cek dari sessionStorage di client (temporary)
    // TODO: Implement proper session storage di Redis
    return null;
  } catch (error) {
    return null;
  }
}

// Validate session dari client (untuk client-side check)
export function validateClientSession(): UserSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) return null;
    
    const user = JSON.parse(userStr) as UserSession;
    
    // Basic validation
    if (!user.id || !user.email) return null;
    
    return user;
  } catch {
    return null;
  }
}

// Clear session
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session_token');
}






























