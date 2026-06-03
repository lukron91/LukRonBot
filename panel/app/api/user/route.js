import { NextResponse } from 'next/server';

export async function GET(request) {
  const sessionCookie = request.cookies.get('session');
  
  if (!sessionCookie) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const sessionData = JSON.parse(atob(sessionCookie.value));
    return NextResponse.json(sessionData);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
}
