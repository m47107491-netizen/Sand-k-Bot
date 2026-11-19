import { NextResponse } from "next/server";
import { checkApiSecret } from "../../../lib/auth";
import { KEY_RE, TT_RE, putKey, revokeKey, revokeByTiktok } from "../../../lib/keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bot -> site. Header: Authorization: Bearer <API_SECRET>
// {action:"create", key, tiktok, tg_id, expires}  |  {action:"revoke", key}  |  {action:"revoke_tiktok", tiktok}
export async function POST(req) {
  const a = await checkApiSecret(req);
  if (!a.ok) return NextResponse.json({ error: a.error }, { status: a.status });
  try {
    const b = await req.json();
    if (b.action === "create") {
      const tiktok = String(b.tiktok || "").toLowerCase().replace(/^@/, "");
      const exp = Number(b.expires);
      if (!KEY_RE.test(String(b.key || "")) || !TT_RE.test(tiktok) || !Number.isFinite(exp)) {
        return NextResponse.json({ error: "Bad request" }, { status: 400 });
      }
      const ok = await putKey(b.key, tiktok, Number(b.tg_id) || 0, exp);
      return NextResponse.json({ ok });
    }
    if (b.action === "revoke") {
      return NextResponse.json({ ok: await revokeKey(String(b.key || "")) });
    }
    if (b.action === "revoke_tiktok") {
      const tiktok = String(b.tiktok || "").toLowerCase().replace(/^@/, "");
      return NextResponse.json({ ok: await revokeByTiktok(tiktok) });
    }
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
