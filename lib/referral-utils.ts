/**
 * Utility functions for referral system
 */

export function validateReferralCodeFormat(code: string): boolean {
  // Check if code is 4-12 characters, contains only letters and numbers, uppercase
  return /^[A-Z0-9]{4,12}$/.test(code);
}

export function generateReferralCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function getClientIP(request: Request): string {
  // Get IP from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');

  if (cfConnectingIP) return cfConnectingIP;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIP) return realIP;
  if (clientIP) return clientIP;

  // For Next.js requests, try to get from the connection
  // This is a fallback - in production you might want to use a service like Cloudflare
  return '127.0.0.1';
}
