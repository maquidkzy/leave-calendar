import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const password = process.env.ADMIN_PASSWORD || 'admin';
  
  // Exclude auth routes and api routes if needed
  if (request.nextUrl.pathname.startsWith('/api/auth') || request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('auth_token')?.value;

  if (authCookie !== password) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
