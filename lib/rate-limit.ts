import { NextRequest } from 'next/server';
import { getCache, setCache } from './redis';

// Type definition untuk rate limit result
interface RateLimitResult {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string;
}

// In-memory rate limit store (fallback jika Redis tidak ada)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup expired entries setiap 5 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetTime < now) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const { windowMs, maxRequests, keyGenerator } = options;
  
  // Generate key untuk rate limiting
  const key = keyGenerator 
    ? keyGenerator(request)
    : `ratelimit:${request.ip || 'unknown'}:${request.url}`;
  
  const cacheKey = `ratelimit:${key}`;
  const now = Date.now();
  const resetTime = now + windowMs;
  
  try {
    // Coba pakai Redis dulu
    const cached = await getCache(cacheKey);
    
    if (cached) {
      const { count, resetTime: cachedResetTime } = cached as RateLimitResult;
      
      // Jika sudah reset, mulai dari 0
      if (cachedResetTime < now) {
        await setCache(cacheKey, { count: 1, resetTime }, Math.ceil(windowMs / 1000));
        return { allowed: true, remaining: maxRequests - 1, resetTime };
      }
      
      // Cek apakah sudah melebihi limit
      if (count >= maxRequests) {
        return { allowed: false, remaining: 0, resetTime: cachedResetTime };
      }
      
      // Increment count
      await setCache(cacheKey, { count: count + 1, resetTime: cachedResetTime }, Math.ceil(windowMs / 1000));
      return { allowed: true, remaining: maxRequests - (count + 1), resetTime: cachedResetTime };
    } else {
      // First request
      await setCache(cacheKey, { count: 1, resetTime }, Math.ceil(windowMs / 1000));
      return { allowed: true, remaining: maxRequests - 1, resetTime };
    }
  } catch (error) {
    // Fallback ke memory store jika Redis tidak ada
    const memoryKey = cacheKey;
    const stored = memoryStore.get(memoryKey);
    
    if (stored) {
      if (stored.resetTime < now) {
        // Reset
        memoryStore.set(memoryKey, { count: 1, resetTime });
        return { allowed: true, remaining: maxRequests - 1, resetTime };
      }
      
      if (stored.count >= maxRequests) {
        return { allowed: false, remaining: 0, resetTime: stored.resetTime };
      }
      
      stored.count++;
      return { allowed: true, remaining: maxRequests - stored.count, resetTime: stored.resetTime };
    } else {
      memoryStore.set(memoryKey, { count: 1, resetTime });
      return { allowed: true, remaining: maxRequests - 1, resetTime };
    }
  }
}

// Rate limit untuk login (5 attempts per 15 menit)
export async function loginRateLimit(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  return rateLimit(request, {
    windowMs: 15 * 60 * 1000, // 15 menit
    maxRequests: 5, // 5 attempts
    keyGenerator: (req) => `login:${ip}`,
  });
}

// Rate limit untuk API (100 requests per menit)
export async function apiRateLimit(request: NextRequest) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  return rateLimit(request, {
    windowMs: 60 * 1000, // 1 menit
    maxRequests: 100, // 100 requests
    keyGenerator: (req) => `api:${ip}`,
  });
}






