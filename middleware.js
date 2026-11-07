import { NextResponse } from "next/server";

const hostOf = (u) => {
  try {
    return new URL(u).host;
  } catch {
    return "";
  }
};

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/admin/")) {
    const host = request.headers.get("host") || "";
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const fetchSite = request.headers.get("sec-fetch-site");
    const ua = (request.headers.get("user-agent") || "").toLowerCase();

    const isSameOrigin =
      fetchSite === "same-origin" ||
      (origin && hostOf(origin) === host) ||
      (referer && hostOf(referer) === host);

    if (!isSameOrigin || ua.includes("python") || ua.includes("curl") || ua.includes("postman")) {
      return new NextResponse(
        JSON.stringify({
          error: "🚫 Erişim Reddedildi",
          message: "Bu alan sadece site yöneticisine açıktır. Dışarıdan erişim yasaktır.",
        }),
        { status: 403, headers: { "content-type": "application/json" } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/admin/:path*",
};
