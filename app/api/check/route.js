import { redis } from '../../../lib/redis';
import { DEVICE_RE } from '../../../lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('device');

  if (!deviceId || !DEVICE_RE.test(deviceId)) return NextResponse.json({ ok: false });

  try {
    const expires = await redis.get(`device:${deviceId}`);
    const now = Math.floor(Date.now() / 1000);

    if (expires && Number(expires) > now) {
      return NextResponse.json({ ok: true, expires: Number(expires) });
    }
  } catch (error) {
    console.error("Redis Error:", error);
  }
  
  return NextResponse.json({ ok: false });
}
