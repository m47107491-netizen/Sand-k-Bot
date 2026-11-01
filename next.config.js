/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /api/tümsandiklar (Türkçe karakterli) adresi, /api/tumsandiklar'a yönlenir
  async rewrites() {
    return [
      { source: "/api/tümsandiklar", destination: "/api/tumsandiklar" },
      { source: "/api/t%C3%BCmsandiklar", destination: "/api/tumsandiklar" },
    ];
  },
};

module.exports = nextConfig;
