import { addAll, listAll, checkToken } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/tumsandiklar  -> her oranda sandık ekle (token gerekli)
export async function POST(req) {
  if (!checkToken(req)) {
    return Response.json({ error: "Geçersiz API token" }, { status: 401 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON gerekli" }, { status: 400 });
  }
  const result = await addAll(body);
  if (result.error) {
    return Response.json({ error: result.error }, { status: result.status || 400 });
  }
  return Response.json(result);
}

// GET /api/tumsandiklar?limit=50  -> tüm sandıklar
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 50);
  const boxes = await listAll(Number.isFinite(limit) && limit > 0 ? limit : 50);
  return Response.json({ ok: true, kind: "all", count: boxes.length, boxes });
}
