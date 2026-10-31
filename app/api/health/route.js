import { storageMode } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    storage: storageMode(),
    time: new Date().toISOString(),
  });
}
