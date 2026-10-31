import { listBoxes, filter } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 50);
  const boxes = listBoxes(Number.isFinite(limit) && limit > 0 ? limit : 50);
  return Response.json({
    ok: true,
    filter: filter(),
    count: boxes.length,
    boxes,
  });
}
