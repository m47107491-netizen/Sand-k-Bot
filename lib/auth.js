import { createHash, timingSafeEqual } from "crypto";
import { redis } from "./redis";

const MAX_FAILS = 5; // 15 dk içinde en fazla 5 yanlış deneme
const WINDOW_SEC = 900;

function safeEqual(a, b) {
  const ha = createHash("sha256").update(String(a)).digest();
  const hb = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

function ipOf(req) {
  const xf = req.headers.get("x-forwarded-for") || "";
  return xf.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

async function isBlocked(key) {
  try {
    return (Number(await redis.get(key)) || 0) >= MAX_FAILS;
  } catch {
    return false;
  }
}

async function addFail(key) {
  try {
    await redis.incr(key);
    await redis.expire(key, WINDOW_SEC);
  } catch {}
}

async function clearFails(key) {
  try {
    await redis.del(key);
  } catch {}
}

const BLOCK_MSG = "Çok fazla yanlış deneme. 15 dakika sonra tekrar dene.";

// Admin panel anahtarı: header "x-admin-key" ile gelir, ADMIN_SECRET ile karşılaştırılır
export async function checkAdmin(req) {
  const secret = (process.env.ADMIN_SECRET || "").trim();
  if (!secret) {
    return { ok: false, status: 503, error: "ADMIN_SECRET Vercel'de ayarlanmamış" };
  }
  const key = `rl:admin:${ipOf(req)}`;
  if (await isBlocked(key)) return { ok: false, status: 429, error: BLOCK_MSG };

  const given = (req.headers.get("x-admin-key") || "").trim();
  if (!given || !safeEqual(given, secret)) {
    await addFail(key);
    return { ok: false, status: 401, error: "Yetkisiz" };
  }
  await clearFails(key);
  return { ok: true };
}

// Bot -> /api/auth için: "Authorization: Bearer <API_SECRET>"
export async function checkApiSecret(req) {
  const secret = (process.env.API_SECRET || "").trim();
  if (!secret) {
    return { ok: false, status: 503, error: "API_SECRET Vercel'de ayarlanmamış" };
  }
  const key = `rl:api:${ipOf(req)}`;
  if (await isBlocked(key)) return { ok: false, status: 429, error: BLOCK_MSG };

  const header = req.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!given || !safeEqual(given, secret)) {
    await addFail(key);
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  await clearFails(key);
  return { ok: true };
}

export const DEVICE_RE = /^device_[A-Za-z0-9_-]{1,64}$/;
