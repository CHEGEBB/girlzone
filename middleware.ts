import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Middleware to handle referral tracking
export function middleware(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const affiliateCode = searchParams.get('ref');

  if (affiliateCode) {
    // Create a response and set a cookie for the affiliate code
    const response = NextResponse.next();

    // Set cookie to persist the affiliate code for tracking across pages
    response.cookies.set('affiliate_ref', affiliateCode, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false, // Allow client-side access
    });

    return response;
  }

  // Continue with the response
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
