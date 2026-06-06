import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session');

  if (!session?.value) {
    return NextResponse.json({ error: 'Brak sesji' }, { status: 401 });
  }

  try {
    const data = JSON.parse(session.value);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Nieprawidłowa sesja' }, { status: 401 });
  }
}
