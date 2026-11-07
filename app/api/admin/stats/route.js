import { checkAdmin } from "../../../../lib/auth";
import { countBoxes, storageMode, filter } from "../../../../lib/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const a = await checkAdmin(req);
  if (!a.ok) return NextResponse.json({ ok: false, error: a.error }, { status: a.status });
  try {
    const [boxes, mor, all] = await Promise.all([countBoxes("boxes"), countBoxes("mor"), countBoxes("all")]);
    return NextResponse.json({
      ok: true,
      storage: storageMode(),
      filter: filter(),
      counts: { boxes, mor, all },
      env: {
        ADMIN_SECRET: Boolean(process.env.ADMIN_SECRET),
        API_SECRET: Boolean(process.env.API_SECRET),
        SANDIK_API_TOKEN: Boolean(process.env.SANDIK_API_TOKEN),
      },
      time: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Depo hatası" }, { status: 500 });
  }
}
