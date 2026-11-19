import { freeState } from "../../../lib/free";
import { getKey } from "../../../lib/keys";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Site her açılışta ve birkaç dakikada bir çağırır: /api/check?key=...
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key") || "";
  const now = Math.floor(Date.now() / 1000);
  const free = freeState(now);

  let paid = 0;
  let revoked = false;
  if (key) {
    try {
      const rec = await getKey(key);
      if (rec && Number(rec.expires) > now) paid = Number(rec.expires);
      else revoked = true;
    } catch (error) {
      console.error("Redis Error:", error);
    }
  }

  if (free.open) {
    const end = free.end ? Math.max(free.end, paid) : paid;
    return NextResponse.json({ ok: true, free: true, expires: end || undefined });
  }
  if (paid) return NextResponse.json({ ok: true, expires: paid });
  return NextResponse.json({ ok: false, revoked, nextFree: free.next || undefined });
}
