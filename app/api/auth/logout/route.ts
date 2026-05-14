import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ data: { success: true } }, { status: 200 });
  
  response.cookies.set({
    name: 'token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });

  return response;
}
