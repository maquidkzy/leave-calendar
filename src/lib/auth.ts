import { NextResponse } from 'next/server';

/**
 * Verifies the edit password sent by the client in the `x-edit-password` header.
 * Returns a 401 response if the password is wrong, or null if it is valid.
 */
export function requireEditPassword(request: Request): NextResponse | null {
  const expected = process.env.ADMIN_PASSWORD || 'admin';
  const provided = request.headers.get('x-edit-password');

  if (provided !== expected) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
  return null;
}
