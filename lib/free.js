// Ücretsiz pencere: her FREE_CYCLE_DAYS günde bir FREE_ON_HOURS saat herkese açık.
// Varsayılan KAPALI: ücretsiz pencere yok. Açmak için FREE_MODE=on ortam değişkeni.
// Botla aynı anda açılıp kapanması için FREE_ANCHOR (unix saniye) ortam değişkenini
// botun /free komutunda yazan "anchor" değerine eşitle.
const CYCLE_DAYS = Number(process.env.FREE_CYCLE_DAYS || 2);
const ON_HOURS = Number(process.env.FREE_ON_HOURS || 12);
const MODE = (process.env.FREE_MODE || "off").toLowerCase(); // off (varsayılan) | on | cycle
// Varsayılan: Türkiye saatiyle gece yarısına hizalı (UTC+3)
const ANCHOR = Number(process.env.FREE_ANCHOR || -3 * 3600);

export function freeState(nowSec = Math.floor(Date.now() / 1000)) {
  if (MODE === "on") return { open: true, end: 0, next: 0 };
  if (MODE === "off") return { open: false, end: 0, next: 0 };
  const cyc = CYCLE_DAYS * 86400;
  const on = ON_HOURS * 3600;
  const pos = (((nowSec - ANCHOR) % cyc) + cyc) % cyc;
  if (pos < on) return { open: true, end: nowSec + (on - pos), next: 0 };
  return { open: false, end: 0, next: nowSec + (cyc - pos) };
}
