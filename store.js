/**
 * Sandık deposu — Vercel'de globalThis ile warm instance'larda kalır.
 * Kalıcı için Vercel KV / Upstash bağlanabilir (opsiyonel).
 */

const ONLY_COINS = Number(process.env.ONLY_COINS || 20);
const ONLY_PEOPLE = Number(process.env.ONLY_PEOPLE || 16);
const MAX = Number(process.env.SANDIK_MAX_BOXES || 200);
const API_TOKEN = (process.env.SANDIK_API_TOKEN || "sandik20-16-secret").trim();

function g() {
  if (!globalThis.__sandikBoxes) {
    globalThis.__sandikBoxes = [];
  }
  return globalThis.__sandikBoxes;
}

export function filter() {
  return `${ONLY_COINS}/${ONLY_PEOPLE}`;
}

export function checkToken(req) {
  const auth = req.headers.get("authorization") || "";
  const key = req.headers.get("x-api-key") || "";
  let token = "";
  if (auth.toLowerCase().startsWith("bearer ")) token = auth.slice(7).trim();
  if (!token) token = key.trim();
  return token && token === API_TOKEN;
}

export function listBoxes(limit = 50) {
  const boxes = g();
  return boxes.slice(0, Math.min(limit, MAX));
}

export function addBox(body) {
  const coins = Number(body.coins ?? ONLY_COINS);
  const people = Number(body.people ?? ONLY_PEOPLE);
  if (coins !== ONLY_COINS || people !== ONLY_PEOPLE) {
    return { error: `Sadece ${ONLY_COINS}/${ONLY_PEOPLE} kabul`, status: 400 };
  }
  const user = String(body.user || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
  if (!user || user.length < 2) {
    return { error: "user gerekli", status: 400 };
  }
  const now = Date.now() / 1000;
  const boxes = g();
  // 90 sn dedup
  const dup = boxes.find(
    (b) => b.user === user && now - (b.ts || 0) < 90
  );
  if (dup) return { ok: true, dedup: true, box: dup };

  const item = {
    id: `${user}-${Date.now()}`,
    user,
    coins,
    people,
    viewers: body.viewers ?? null,
    time_raw: body.time_raw || "",
    source: body.source || "",
    live_url: body.live_url || `https://www.tiktok.com/@${user}/live`,
    comment: String(body.comment || "").slice(0, 120),
    ts: now,
    at: new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
    ratio: people ? Math.round((coins / people) * 100) / 100 : 0,
  };
  boxes.unshift(item);
  if (boxes.length > MAX) boxes.length = MAX;
  return { ok: true, box: item };
}

export { ONLY_COINS, ONLY_PEOPLE, API_TOKEN };
