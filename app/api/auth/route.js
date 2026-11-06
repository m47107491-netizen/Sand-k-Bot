import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const authHeader = req.headers.get('authorization');
  // Botun şifresi (Vercel'de Environment Variable olarak API_SECRET ekle)
  if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { device_id, expires, action } = await req.json();

    if (action === 'remove') {
      await kv.del(`device:${device_id}`);
      return NextResponse.json({ ok: true });
    }

    // expires: unix timestamp (saniye)
    await kv.set(`device:${device_id}`, expires);
    return NextResponse.json({ ok: true, device_id, expires });
  } catch (error) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
