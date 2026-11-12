// Link token çözücü — Python tarafındaki make_token() ile birebir aynı şema.
// ?u=mzxw6ytboi...  →  gerçek TikTok kullanıcı adı
// Anahtar iki tarafta da aynı olmalı (LINK_KEY). Bu bir gizleme katmanıdır, şifreleme değil.

export const LINK_KEY = "sandik-k3y";
const ALPHA = "abcdefghijklmnopqrstuvwxyz234567";
const USER_RE = /^[A-Za-z0-9_.]{1,40}$/;

function sums(bytes) {
  let a = 0;
  let b = 0;
  bytes.forEach((x, i) => {
    a = (a + x) & 255;
    b = (b + x * (i + 1)) & 255;
  });
  return [a, b];
}

function b32decode(s) {
  let bits = 0;
  let val = 0;
  const out = [];
  for (const ch of s) {
    const idx = ALPHA.indexOf(ch);
    if (idx < 0) return null;
    val = ((val << 5) | idx) & 0xffff;
    bits += 5;
    if (bits >= 8) {
      out.push((val >> (bits - 8)) & 255);
      bits -= 8;
      val &= (1 << bits) - 1;
    }
  }
  return out;
}

// Geçerli token ise gerçek kullanıcı adını, değilse null döner.
export function decodeToken(token) {
  try {
    const s = String(token || "").toLowerCase();
    if (!/^[a-z2-7]{8,}$/.test(s)) return null;
    const raw = b32decode(s);
    if (!raw || raw.length < 4) return null;
    const [n, c1, c2, ...enc] = raw;
    const key = Array.from(LINK_KEY).map((c) => c.charCodeAt(0));
    const data = enc.map((b, i) => b ^ key[i % key.length] ^ n);
    const [a, b] = sums(data);
    if (a !== c1 || b !== c2) return null;
    const user = new TextDecoder().decode(new Uint8Array(data));
    return USER_RE.test(user) ? user : null;
  } catch {
    return null;
  }
}

// Eski linkler (?u=user072___user düz isim) çalışmaya devam eder.
export function resolveUser(param) {
  if (!param) return "";
  const decoded = decodeToken(param);
  if (decoded) return decoded;
  return USER_RE.test(param) ? param : "";
}
