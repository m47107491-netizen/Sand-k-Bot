import { redis } from "../../../lib/redis";
import { checkApiSecret, DEVICE_RE } from "../../../lib/auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  const a = checkApiSecret(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });

  try {
    const { device_id, expires } = await req.json();
    const exp = Number(expires);
    if (!DEVICE_RE.test(String(device_id || "")) || !Number.isFinite(exp) || exp <= 0) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    await redis.set(`device:${device_id}`, exp);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
