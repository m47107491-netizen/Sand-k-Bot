import { redis } from "../../../../lib/redis";
import { checkAdmin, DEVICE_RE } from "../../../../lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function deny(a) {
  return NextResponse.json({ ok: false, error: a.error }, { status: a.status });
}

export async function GET(req) {
  const a = checkAdmin(req);
  if (!a.ok) return deny(a);

  try {
    const keys = await redis.keys("device:*");
    const devices = await Promise.all(
      keys.map(async (key) => {
        const expires = await redis.get(key);
        return { id: key.replace("device:", ""), expires: Number(expires) };
      })
    );
    return NextResponse.json({ ok: true, devices });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Redis hatası" }, { status: 500 });
  }
}

export async function POST(req) {
  const a = checkAdmin(req);
  if (!a.ok) return deny(a);

  try {
    const { device_id, expires } = await req.json();
    const exp = Number(expires);
    if (!DEVICE_RE.test(String(device_id || "")) || !Number.isFinite(exp) || exp <= 0) {
      return NextResponse.json({ ok: false, error: "Geçersiz device_id veya süre" }, { status: 400 });
    }
    await redis.set(`device:${device_id}`, exp);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Hata" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const a = checkAdmin(req);
  if (!a.ok) return deny(a);

  try {
    const { searchParams } = new URL(req.url);
    const device_id = searchParams.get("device_id") || "";
    if (!DEVICE_RE.test(device_id)) {
      return NextResponse.json({ ok: false, error: "Geçersiz device_id" }, { status: 400 });
    }
    await redis.del(`device:${device_id}`);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: "Hata" }, { status: 500 });
  }
}
