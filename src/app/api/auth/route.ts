import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

  if (password === adminPassword) {
    const cookieStore = await cookies();
    cookieStore.set('auth_token', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
}
