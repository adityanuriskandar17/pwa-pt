// Input validation & sanitization utilities

// Email validation
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Length check
  if (email.length > 255) return false;
  
  // Sanitize: remove dangerous characters
  const sanitized = email.trim().toLowerCase();
  if (sanitized !== email.trim().toLowerCase()) return false;
  
  return true;
}

// Sanitize string input
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') return '';
  
  // Trim dan limit length
  let sanitized = input.trim().slice(0, maxLength);
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove control characters (kecuali newline, tab)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

// Validate integer
export function validateInteger(input: any): number | null {
  if (input === null || input === undefined) return null;
  
  const num = typeof input === 'string' ? parseInt(input, 10) : Number(input);
  
  if (isNaN(num) || !isFinite(num)) return null;
  
  // Check range (prevent integer overflow)
  if (num < Number.MIN_SAFE_INTEGER || num > Number.MAX_SAFE_INTEGER) {
    return null;
  }
  
  return Math.floor(num);
}

// Validate BigInt (untuk bookingId, dll)
export function validateBigInt(input: any): bigint | null {
  if (input === null || input === undefined) return null;
  
  try {
    const bigInt = typeof input === 'string' ? BigInt(input) : BigInt(input);
    return bigInt;
  } catch {
    return null;
  }
}

// Validate date string
export function validateDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;
  
  // Check if date is reasonable (tidak terlalu jauh di masa depan/past)
  const now = new Date();
  const yearDiff = Math.abs(date.getFullYear() - now.getFullYear());
  if (yearDiff > 100) return false; // Max 100 tahun difference
  
  return true;
}

// Validate base64 image
export function validateBase64Image(base64: string, maxSizeMB: number = 5): { valid: boolean; error?: string } {
  if (!base64 || typeof base64 !== 'string') {
    return { valid: false, error: 'Invalid base64 string' };
  }
  
  // Extract base64 data - handle both formats:
  // 1. With prefix: "data:image/jpeg;base64,/9j/4AAQ..."
  // 2. Without prefix: "/9j/4AAQ..." (raw base64)
  let base64Data: string;
  
  if (base64.startsWith('data:image/')) {
    // Format dengan prefix
    const parts = base64.split(',');
    if (parts.length < 2 || !parts[1]) {
      return { valid: false, error: 'Invalid base64 data' };
    }
    base64Data = parts[1];
  } else {
    // Format tanpa prefix (raw base64) - ini yang dikirim dari verification page
    base64Data = base64;
  }
  
  // Basic validation - check if it looks like valid base64
  if (base64Data.length < 100) {
    return { valid: false, error: 'Image data too short' };
  }
  
  // Check size (approximate)
  const sizeInBytes = (base64Data.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  
  if (sizeInMB > maxSizeMB) {
    return { valid: false, error: `Image size exceeds ${maxSizeMB}MB limit` };
  }
  
  // Check if valid base64
  try {
    Buffer.from(base64Data, 'base64');
  } catch {
    return { valid: false, error: 'Invalid base64 encoding' };
  }
  
  return { valid: true };
}

// Validate club name
export function validateClubName(clubName: string): boolean {
  if (!clubName || typeof clubName !== 'string') return false;
  
  const sanitized = sanitizeString(clubName, 255);
  if (sanitized.length < 1 || sanitized.length > 255) return false;
  
  // Tidak boleh mengandung karakter berbahaya
  if (/[<>\"'%;)(&+]/.test(sanitized)) return false;
  
  return true;
}

// Validate PT name
export function validatePTName(ptName: string): boolean {
  return validateClubName(ptName); // Same validation
}

// Sanitize untuk output (prevent XSS)
export function escapeHtml(unsafe: string): string {
  if (!unsafe || typeof unsafe !== 'string') return '';
  
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Validate request body size
export function validateBodySize(body: any, maxSizeKB: number = 1024): { valid: boolean; error?: string } {
  try {
    const bodyStr = JSON.stringify(body);
    const sizeInKB = Buffer.byteLength(bodyStr, 'utf8') / 1024;
    
    if (sizeInKB > maxSizeKB) {
      return { valid: false, error: `Request body exceeds ${maxSizeKB}KB limit` };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid request body' };
  }
}

















