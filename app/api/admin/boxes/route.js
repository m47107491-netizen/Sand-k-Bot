import { checkAdmin } from "../../../../lib/auth";
import { listBoxes, removeBox, clearBoxes, isKind } from "../../../../lib/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function deny(a) {
  return NextResponse.json({ ok: false, error: a.error }, { status: a.status });
}

const keyFor = { boxes: undefined, mor: "sandik:mor", all: "sandik:all" };

// GET /api/admin/boxes?kind=boxes|mor|all
export async function GET(req) {
  const a = await checkAdmin(req);
  if (!a.ok) return deny(a);
  const kind = new URL(req.url).searchParams.get("kind") || "boxes";
  if (!isKind(kind)) return NextResponse.json({ ok: false, error: "Geçersiz tür" }, { status: 400 });
  const boxes = await listBoxes(200, keyFor[kind]);
  return NextResponse.json({ ok: true, kind, count: boxes.length, boxes });
}

// DELETE /api/admin/boxes?kind=...&id=...   -> tek sandık
// DELETE /api/admin/boxes?kind=...&all=1    -> listeyi temizle
export async function DELETE(req) {
  const a = await checkAdmin(req);
  if (!a.ok) return deny(a);
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind") || "";
  if (!isKind(kind)) return NextResponse.json({ ok: false, error: "Geçersiz tür" }, { status: 400 });
  try {
    if (sp.get("all") === "1") {
      await clearBoxes(kind);
      return NextResponse.json({ ok: true });
    }
    const id = (sp.get("id") || "").slice(0, 120);
    if (!id) return NextResponse.json({ ok: false, error: "id gerekli" }, { status: 400 });
    const removed = await removeBox(kind, id);
    return NextResponse.json({ ok: removed, error: removed ? undefined : "Bulunamadı" }, { status: removed ? 200 : 404 });
  } catch {
    return NextResponse.json({ ok: false, error: "Depo hatası" }, { status: 500 });
  }
}
