import { redis } from "./redis";

export const KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;
export const TT_RE = /^[a-z0-9_.]{1,40}$/;

// Redis: key:<KEY> -> {tiktok, tg_id, expires}   |  tt:<tiktok> -> <KEY>
export async function getKey(key) {
  if (!KEY_RE.test(String(key || ""))) return null;
  const v = await redis.get(`key:${key}`);
  if (!v) return null;
  return typeof v === "string" ? JSON.parse(v) : v;
}

export async function putKey(key, tiktok, tgId, expires) {
  const ttl = expires - Math.floor(Date.now() / 1000);
  if (ttl <= 0) return false;
  if (tiktok) {
    const old = await redis.get(`tt:${tiktok}`);
    if (old && old !== key) await redis.del(`key:${old}`);
  }
  await redis.set(`key:${key}`, JSON.stringify({ tiktok: tiktok || "", tg_id: tgId || 0, expires }), { ex: ttl });
  if (tiktok) await redis.set(`tt:${tiktok}`, key, { ex: ttl });
  return true;
}

export async function revokeKey(key) {
  const rec = await getKey(key);
  await redis.del(`key:${key}`);
  if (rec?.tiktok) await redis.del(`tt:${rec.tiktok}`);
  return !!rec;
}

export async function revokeByTiktok(tiktok) {
  const key = await redis.get(`tt:${tiktok}`);
  if (!key) return false;
  return revokeKey(key);
}

// Admin paneli için: tüm aktif key'ler (SCAN, KEYS değil)
export async function listKeys() {
  const names = [];
  let cursor = "0";
  let guard = 0;
  do {
    const [next, batch] = await redis.scan(cursor, { match: "key:*", count: 200 });
    cursor = String(next);
    names.push(...batch);
  } while (cursor !== "0" && ++guard < 200);
  if (!names.length) return [];
  const values = await redis.mget(...names);
  return names.map((n, i) => {
    const v = typeof values[i] === "string" ? JSON.parse(values[i]) : values[i] || {};
    return { id: n.slice(4), tiktok: v.tiktok || "", tg_id: v.tg_id || 0, expires: Number(v.expires) || 0 };
  });
}
