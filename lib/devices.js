import { redis } from "./redis";

// KEYS yerine SCAN: cihaz sayısı artınca Redis'i kilitlemez
export async function listDevices() {
  const keys = [];
  let cursor = "0";
  let guard = 0;
  do {
    const [next, batch] = await redis.scan(cursor, { match: "device:*", count: 200 });
    cursor = String(next);
    keys.push(...batch);
  } while (cursor !== "0" && ++guard < 200);
  if (!keys.length) return [];
  const values = await redis.mget(...keys);
  return keys.map((key, i) => ({
    id: key.replace("device:", ""),
    expires: Number(values[i]) || 0,
  }));
}

