// Next.js (App Router): /api/go?u=<base64url(VHN linki)>  ->  302 yönlendirme
// Sadece https://vohoainamtv.github.io adresine yönlendirir.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET(request) {
  try {
    const u = request.nextUrl.searchParams.get("u") || "";
    const b64 = u.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const target = Buffer.from(padded, "base64").toString("utf8");
    const url = new URL(target);
    if (url.protocol !== "https:" || url.hostname !== "vohoainamtv.github.io") {
      return new NextResponse("gecersiz link", { status: 400 });
    }
    const res = NextResponse.redirect(url.toString(), 302);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    return new NextResponse("gecersiz link", { status: 400 });
  }
}
