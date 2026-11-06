import { redis } from '../../../../lib/redis';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('auth') !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  try {
    const keys = await redis.keys('device:*');
    const devices = [];
    
    for (const key of keys) {
      const expires = await redis.get(key);
      const id = key.replace('device:', '');
      devices.push({ id, expires: Number(expires) });
    }
    
    return NextResponse.json({ ok: true, devices });
  } catch (error) {
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { auth, device_id, expires } = await req.json();
    if (auth !== process.env.ADMIN_SECRET) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    
    await redis.set(`device:${device_id}`, expires);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('auth') !== process.env.ADMIN_SECRET) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    
    const device_id = searchParams.get('device_id');
    await redis.del(`device:${device_id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}
