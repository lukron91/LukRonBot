import { NextResponse } from 'next/server';

const BOT_API = process.env.BOT_API_URL || 'http://localhost:3001';

export async function GET(request, { params }) {
  const path = (await params).path?.join('/') || '';
  const { search } = new URL(request.url);
  
  try {
    const res = await fetch(`${BOT_API}/${path}${search}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'Bot API niedostępne' }, { status: 503 });
  }
}

export async function POST(request, { params }) {
  const path = (await params).path?.join('/') || '';
  
  try {
    const body = await request.json().catch(() => null);
    const res = await fetch(`${BOT_API}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ error: 'Bot API niedostępne' }, { status: 503 });
  }
}
