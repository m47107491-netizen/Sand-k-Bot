import { redis } from '../../../lib/redis';
import { DEVICE_RE } from '../../../lib/auth';
import { freeState } from '../../../lib/free';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const deviceId = searchParams.get('device');
  const now = Math.floor(Date.now() / 1000);
  const free = freeState(now);

  let paid = 0;
  if (deviceId && DEVICE_RE.test(deviceId)) {
    try {
      const expires = Number(await redis.get(`device:${deviceId}`)) || 0;
      if (expires > now) paid = expires;
    } catch (error) {
      console.error("Redis Error:", error);
    }
  }

  // Ücretsiz pencere açıksa herkes girer; bitiş = ücretsiz bitiş ya da cihazın kendi süresi (hangisi sonraysa)
  if (free.open) {
    const end = free.end ? Math.max(free.end, paid) : paid;
    return NextResponse.json({ ok: true, free: true, expires: end || undefined });
  }
  if (paid) return NextResponse.json({ ok: true, expires: paid });

  return NextResponse.json({ ok: false, nextFree: free.next || undefined });
}
