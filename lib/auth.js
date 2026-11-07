import { createHash, timingSafeEqual } from "crypto";

function safeEqual(a, b) {
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

// Admin panel anahtarı: header "x-admin-key" ile gelir, ADMIN_SECRET ile karşılaştırılır
export function checkAdmin(req) {
  const secret = (process.env.ADMIN_SECRET || "").trim();
  if (!secret) {
    return { ok: false, status: 503, error: "ADMIN_SECRET Vercel'de ayarlanmamış" };
  }
  const given = (req.headers.get("x-admin-key") || "").trim();
  if (!given || !safeEqual(given, secret)) {
    return { ok: false, status: 401, error: "Yetkisiz" };
  }
  return { ok: true };
}

// Bot -> /api/auth için: "Authorization: Bearer <API_SECRET>"
export function checkApiSecret(req) {
  const secret = (process.env.API_SECRET || "").trim();
  if (!secret) {
    return { ok: false, status: 503, error: "API_SECRET Vercel'de ayarlanmamış" };
  }
  const header = req.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!given || !safeEqual(given, secret)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}

export const DEVICE_RE = /^device_[A-Za-z0-9_-]{1,64}$/;
