import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

// Tüm cihazları listeleme
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('auth') !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
  }

  const keys = await kv.keys('device:*');
  const devices = [];
  
  for (const key of keys) {
    const expires = await kv.get(key);
    const id = key.replace('device:', '');
    devices.push({ id, expires });
  }
  
  return NextResponse.json({ ok: true, devices });
}

// Yeni cihaz ekleme
export async function POST(req) {
  try {
    const { auth, device_id, expires } = await req.json();
    if (auth !== process.env.ADMIN_SECRET) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    
    await kv.set(`device:${device_id}`, expires);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}

// Cihaz silme
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get('auth') !== process.env.ADMIN_SECRET) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });
    
    const device_id = searchParams.get('device_id');
    await kv.del(`device:${device_id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Hata' }, { status: 500 });
  }
}
