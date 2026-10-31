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
const MOR_KEY = "sandik:mor";

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

function gm() {
  if (!globalThis.__sandikMor) globalThis.__sandikMor = [];
  return globalThis.__sandikMor;
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

export async function listBoxes(limit = 50, key = LIST_KEY) {
  const n = Math.min(limit, MAX);
  if (useRedis()) {
    try {
      const rows = await redis(["LRANGE", key, "0", String(n - 1)]);
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
  return (key === MOR_KEY ? gm() : g()).slice(0, n);
}

export async function listMor(limit = 50) {
  return listBoxes(limit, MOR_KEY);
}

const TT_NAME = /tiktok\.com\/@([A-Za-z0-9_.]{2,24})/i;

function isTikTokHost(u) {
  try {
    const h = new URL(u).hostname.toLowerCase();
    return h === "tiktok.com" || h.endsWith(".tiktok.com");
  } catch {
    return false;
  }
}

// vt.tiktok.com / vm.tiktok.com kısa linkini açıp @kullanıcı adını bulur
async function resolveShort(url) {
  let cur = url;
  for (let i = 0; i < 4; i++) {
    const m = cur.match(TT_NAME);
    if (m) return m[1];
    if (!isTikTokHost(cur)) return null;
    const res = await fetch(cur, {
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });
    const loc = res.headers.get("location");
    if (!loc) {
      const txt = await res.text();
      const mm = txt.match(TT_NAME);
      return mm ? mm[1] : null;
    }
    cur = new URL(loc, cur).toString();
  }
  return null;
}

async function resolveUser(body) {
  const raw = String(body.user || body.live_url || body.url || "").trim();
  let name = raw;
  const m = raw.match(TT_NAME);
  if (m) {
    name = m[1];
  } else if (/^(?:https?:\/\/)?(?:[a-z0-9-]+\.)?tiktok\.com\//i.test(raw)) {
    try {
      const url = raw.startsWith("http") ? raw : `https://${raw}`;
      name = (await resolveShort(url)) || "";
    } catch (e) {
      console.error("kısa link çözülemedi:", e.message);
      name = "";
    }
  }
  const u = name.replace(/^@/, "").replace(/[\/?#].*$/, "").toLowerCase();
  return /^[a-z0-9_.]{2,24}$/.test(u) ? u : "";
}

export async function addBox(body) {
  const coins = Number(body.coins ?? ONLY_COINS);
  const people = Number(body.people ?? ONLY_PEOPLE);
  if (coins !== ONLY_COINS || people !== ONLY_PEOPLE) {
    return { error: `Sadece ${ONLY_COINS}/${ONLY_PEOPLE} kabul`, status: 400 };
  }
  const user = await resolveUser(body);
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
    live_url: TT_NAME.test(body.live_url || "")
      ? body.live_url
      : `https://www.tiktok.com/@${user}`,
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

// ---- MOR SANDIK (coin/kişi filtresi yok, ayrı liste) ----
function numOrNull(v) {
  const n = Number(v);
  return v === undefined || v === null || v === "" || !Number.isFinite(n) ? null : n;
}

export async function addMor(body) {
  const user = await resolveUser(body);
  if (!user || user.length < 2) {
    return { error: "user gerekli", status: 400 };
  }
  const coins = numOrNull(body.coins);
  const people = numOrNull(body.people);
  const now = Date.now() / 1000;
  const item = {
    id: `mor-${user}-${Date.now()}`,
    kind: "mor",
    user,
    coins,
    people,
    viewers: body.viewers ?? null,
    time_raw: body.time_raw || "",
    source: body.source || "",
    live_url: TT_NAME.test(body.live_url || "")
      ? body.live_url
      : `https://www.tiktok.com/@${user}`,
    comment: String(body.comment || "").slice(0, 120),
    ts: now,
    at: new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
    ratio: coins && people ? Math.round((coins / people) * 100) / 100 : 0,
  };

  if (useRedis()) {
    try {
      const ok = await redis(["SET", `sandik:mordup:${user}`, "1", "NX", "EX", "90"]);
      if (ok === null) return { ok: true, dedup: true };
      await redisPipeline([
        ["LPUSH", MOR_KEY, JSON.stringify(item)],
        ["LTRIM", MOR_KEY, "0", String(MAX - 1)],
      ]);
      return { ok: true, box: item };
    } catch (e) {
      console.error("redis mor add hata:", e.message);
      return { error: "Depo hatası: " + e.message, status: 500 };
    }
  }

  const boxes = gm();
  const dup = boxes.find((b) => b.user === user && now - (b.ts || 0) < 90);
  if (dup) return { ok: true, dedup: true, box: dup };
  boxes.unshift(item);
  if (boxes.length > MAX) boxes.length = MAX;
  return { ok: true, box: item };
}

export { ONLY_COINS, ONLY_PEOPLE, API_TOKEN };
