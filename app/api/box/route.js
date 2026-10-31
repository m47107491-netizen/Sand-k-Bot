import { addBox, checkToken } from "../../../lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const result = await addBox(body);
  if (result.error) {
    return Response.json({ error: result.error }, { status: result.status || 400 });
  }
  return Response.json(result);
}
