import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('device');

  if (!deviceId) return NextResponse.json({ ok: false });

  const expires = await kv.get(`device:${deviceId}`);
  const now = Math.floor(Date.now() / 1000);

  if (expires && expires > now) {
    return NextResponse.json({ ok: true, expires });
  }
  return NextResponse.json({ ok: false });
}
