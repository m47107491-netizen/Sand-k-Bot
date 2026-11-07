/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // /api/tümsandiklar (Türkçe karakterli) adresi, /api/tumsandiklar'a yönlenir
  async rewrites() {
    return [
      { source: "/api/tümsandiklar", destination: "/api/tumsandiklar" },
      { source: "/api/t%C3%BCmsandiklar", destination: "/api/tumsandiklar" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/api/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

module.exports = nextConfig;
