import { NextResponse } from 'next/server';

const BOT_API = process.env.BOT_API_URL || 'http://localhost:3001';

export async function GET(request, { params }) {
  const path = (await params).path?.join('/') || '';
  try {
    // DODANO /api/ przed path, ponieważ bot ma endpointy z tym prefiksem
    const res = await fetch(`${BOT_API}/api/${path}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const path = (await params).path?.join('/') || '';
  try {
    const body = await request.text();
    const res = await fetch(`${BOT_API}/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
  }
}
