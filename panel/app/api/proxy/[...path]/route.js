import { NextResponse } from 'next/server';

const BOT_API = process.env.BOT_API_URL || 'http://localhost:3001';

async function proxyRequest(request, params, method) {
  const path = (await params).path?.join('/') || '';
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (method !== 'GET' && method !== 'DELETE') {
      options.body = await request.text();
    }
    const res = await fetch(BOT_API + '/' + path, options);
    const data = await res.text();
    const contentType = res.headers.get('content-type') || 'application/json';
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': contentType },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Proxy error: ' + error.message }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  return proxyRequest(request, params, 'GET');
}

export async function POST(request, { params }) {
  return proxyRequest(request, params, 'POST');
}

export async function PATCH(request, { params }) {
  return proxyRequest(request, params, 'PATCH');
}

export async function DELETE(request, { params }) {
  return proxyRequest(request, params, 'DELETE');
}

export async function PUT(request, { params }) {
  return proxyRequest(request, params, 'PUT');
}
