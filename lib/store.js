/**
 * Sandık deposu — Upstash Redis (kalıcı). Redis yoksa belleğe düşer.
 */

const ONLY_COINS = Number(process.env.ONLY_COINS || 20);
const ONLY_PEOPLE = Number(process.env.ONLY_PEOPLE || 16);
const MAX = Number(process.env.SANDIK_MAX_BOXES || 200);
const API_TOKEN = (process.env.SANDIK_API_TOKEN || "sandik20-16-secret").trim();

const REDIS_URL = (
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  ""
).replace(/\/$/, "");
const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";
const LIST_KEY = "sandik:boxes";

function useRedis() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

async function redis(cmd) {
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

async function redisPipeline(cmds) {
  const r = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  const j = await r.json();
  if (!Array.isArray(j)) throw new Error("pipeline hata");
  const bad = j.find((x) => x && x.error);
  if (bad) throw new Error(bad.error);
  return j;
}

function g() {
  if (!globalThis.__sandikBoxes) globalThis.__sandikBoxes = [];
  return globalThis.__sandikBoxes;
}

export function storageMode() {
  return useRedis() ? "redis" : "memory";
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

export async function listBoxes(limit = 50) {
  const n = Math.min(limit, MAX);
  if (useRedis()) {
    try {
      const rows = await redis(["LRANGE", LIST_KEY, "0", String(n - 1)]);
      return (rows || [])
        .map((x) => {
          try {
            return JSON.parse(x);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    } catch (e) {
      console.error("redis list hata:", e.message);
      return [];
    }
  }
  return g().slice(0, n);
}

function parseUser(body) {
  let raw = String(body.user || body.live_url || body.url || "").trim();
  const m = raw.match(/tiktok\.com\/@([A-Za-z0-9_.]{2,24})/i);
  if (m) raw = m[1];
  const u = raw.replace(/^@/, "").replace(/[\/?#].*$/, "").toLowerCase();
  return /^[a-z0-9_.]{2,24}$/.test(u) ? u : "";
}

export async function addBox(body) {
  const coins = Number(body.coins ?? ONLY_COINS);
  const people = Number(body.people ?? ONLY_PEOPLE);
  if (coins !== ONLY_COINS || people !== ONLY_PEOPLE) {
    return { error: `Sadece ${ONLY_COINS}/${ONLY_PEOPLE} kabul`, status: 400 };
  }
  const user = parseUser(body);
  if (!user || user.length < 2) {
    return { error: "user gerekli", status: 400 };
  }
  const now = Date.now() / 1000;
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

  if (useRedis()) {
    try {
      // 90 sn dedup (atomik)
      const ok = await redis(["SET", `sandik:dup:${user}`, "1", "NX", "EX", "90"]);
      if (ok === null) return { ok: true, dedup: true };
      await redisPipeline([
        ["LPUSH", LIST_KEY, JSON.stringify(item)],
        ["LTRIM", LIST_KEY, "0", String(MAX - 1)],
      ]);
      return { ok: true, box: item };
    } catch (e) {
      console.error("redis add hata:", e.message);
      return { error: "Depo hatası: " + e.message, status: 500 };
    }
  }

  const boxes = g();
  const dup = boxes.find((b) => b.user === user && now - (b.ts || 0) < 90);
  if (dup) return { ok: true, dedup: true, box: dup };
  boxes.unshift(item);
  if (boxes.length > MAX) boxes.length = MAX;
  return { ok: true, box: item };
}

export { ONLY_COINS, ONLY_PEOPLE, API_TOKEN };
