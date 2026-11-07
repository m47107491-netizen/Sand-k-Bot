"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const DEFAULT_DUR = 120;
const MAX_DUR = 900;
const GRACE = 60;

function durOf(b) {
  const first = String(b.time_raw || "").split("-")[0].trim();
  const p = first.split(":").map(Number);
  if (!first || p.some((x) => !Number.isFinite(x))) return DEFAULT_DUR;
  const d = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : 0;
  return d > 0 && d <= MAX_DUR ? d : DEFAULT_DUR;
}

function leftOf(b, now) {
  return (b.ts || 0) + durOf(b) - now;
}

const RING_R = 27;
const RING_C = 2 * Math.PI * RING_R;

// Erişim süresi: 1 günden fazlaysa "12g 4s 10dk", altındaysa saniye saniye "04:12:09"
function fmtAccess(sec) {
  const s = Math.max(0, Math.floor(sec));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}g ${h}s ${m}dk`;
  const p = (n) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s % 60)}`;
}

function accessTone(sec) {
  return sec < 3600 ? "crit" : sec < 86400 ? "warn" : "ok";
}

function Ring({ left, total, ended }) {
  const p = ended ? 0 : Math.min(1, Math.max(0, left / total));
  const urgent = !ended && left <= 20;
  return (
    <svg className="ring" viewBox="0 0 64 64" role="img" aria-label={ended ? "Sandık bitti" : `${fmt(left)} kaldı`}>
      <circle className="track" cx="32" cy="32" r={RING_R} />
      <circle className={`arc${urgent ? " urgent" : ""}`} cx="32" cy="32" r={RING_R} transform="rotate(-90 32 32)" strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - p)} />
      <text className={urgent ? "urgent" : ""} x="32" y={ended ? 36 : 37} style={ended ? { fontSize: 12 } : undefined}>
        {ended ? "bitti" : fmt(left)}
      </text>
    </svg>
  );
}

function fmt(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function safeLive(b) {
  const fallback = `https://www.tiktok.com/@${encodeURIComponent(String(b.user || ""))}/live`;
  try {
    const u = new URL(String(b.live_url || ""));
    const h = u.hostname.toLowerCase();
    const okProto = u.protocol === "https:" || u.protocol === "http:";
    if (okProto && (h === "tiktok.com" || h.endsWith(".tiktok.com"))) return u.toString();
  } catch {}
  return fallback;
}

function Home() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("normal");
  const [normal, setNormal] = useState([]);
  const [mor, setMor] = useState([]);
  const [all, setAll] = useState([]);
  const [status, setStatus] = useState("yükleniyor");
  const [now, setNow] = useState(Date.now() / 1000);

  const [deviceId, setDeviceId] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(null);
  const [expires, setExpires] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [targetUser, setTargetUser] = useState("");

  const isMor = tab === "mor";
  const isAll = tab === "all";
  const alive = (arr) => arr.filter((b) => leftOf(b, now) > -GRACE);
  const normalV = alive(normal);
  const morV = alive(mor);
  const allV = alive(all);
  const boxes = isMor ? morV : isAll ? allV : normalV;

  useEffect(() => {
    let did = localStorage.getItem("sandik_device_id");
    if (!did) {
      did = "device_" + Math.floor(100000000 + Math.random() * 900000000);
      localStorage.setItem("sandik_device_id", did);
    }
    setDeviceId(did);

    const u = searchParams.get("u");
    if (u) setTargetUser(u);

    fetch(`/api/check?device=${did}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setIsAuthorized(data.ok);
        if (data.ok && data.expires) setExpires(Number(data.expires));

        if (data.ok && u) {
          setRedirecting(true);
          setTimeout(() => {
            window.location.href = `https://www.tiktok.com/@${encodeURIComponent(u)}/live`;
          }, 1500);
        }
      })
      .catch(() => setIsAuthorized(false));
  }, [searchParams]);

  // Erişim süresi bitince kilit ekranına dön
  useEffect(() => {
    if (isAuthorized && expires && now >= expires) setIsAuthorized(false);
  }, [now, expires, isAuthorized]);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(deviceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleLiveClick = (e) => {
    if (!isAuthorized) e.preventDefault();
  };

  async function load() {
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch("/api/boxes?limit=60", { cache: "no-store" }),
        fetch("/api/mor?limit=60", { cache: "no-store" }),
        fetch("/api/tumsandiklar?limit=60", { cache: "no-store" }),
      ]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      const j3 = await r3.json();
      setNormal(j1.boxes || []);
      setMor(j2.boxes || []);
      setAll(j3.boxes || []);
      setStatus("canlı");
    } catch {
      setStatus("hata");
    }
  }

  useEffect(() => {
    if (isAuthorized !== true) return;
    load();
    const t = setInterval(load, 4000);
    const c = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, [isAuthorized]);

  if (redirecting) {
    return (
      <div className="app center">
        <div className="panel">
          <h2>Cihaz onaylandı</h2>
          <p style={{ margin: 0 }}>@{targetUser} yayınına yönlendiriliyorsun…</p>
        </div>
      </div>
    );
  }

  if (isAuthorized === null) {
    return <div className="app center" />;
  }

  if (isAuthorized === false) {
    return (
      <div className="app center">
        <div className="panel">
          <h2>Bu cihazın erişimi yok</h2>
          <p>Erişim almak ya da süreni uzatmak için aşağıdaki ID&apos;yi admine gönder.</p>
          <div className="idbox">{deviceId}</div>
          <button onClick={copyId} className="primary">{copied ? "Kopyalandı" : "ID'yi kopyala"}</button>
        </div>
      </div>
    );
  }

  const accessLeft = expires ? expires - now : null;
  const tone = accessLeft != null ? accessTone(accessLeft) : "ok";
  const kind = isMor ? "mor" : isAll ? "all" : "normal";
  const TABS = [
    ["normal", "20/16", normalV.length],
    ["mor", "Mor", morV.length],
    ["all", "Tümü", allV.length],
  ];

  return (
    <div className="app">
      <div className="top">
        <div className="bar">
          <div className="brand">
            <span className={`dot${status === "canlı" ? " on" : ""}`} title={status} />
            <h1>Sandık</h1>
          </div>
          {accessLeft != null && (
            <button className={`access ${tone}`} onClick={() => setSheetOpen((o) => !o)} aria-expanded={sheetOpen} aria-label="Erişim süresi">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="13" r="8" />
                <path d="M12 9v4l2.5 2M9 2h6" />
              </svg>
              {fmtAccess(accessLeft)}
            </button>
          )}
        </div>

        {sheetOpen && accessLeft != null && (
          <div className="sheet">
            <div className="sheet-inner">
              <div className="sheet-row"><span>Erişimin bitiyor</span><b>{new Date(expires * 1000).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}</b></div>
              <div className="sheet-row"><span>Kalan süre</span><b>{fmtAccess(accessLeft)}</b></div>
              <div className="sheet-row"><span>Cihaz ID</span><b>{deviceId}</b></div>
              <p className="sheet-note">Süre bitince sandıklar kilitlenir. Uzatmak için ID&apos;ni admine gönder.</p>
              <button className="ghost" onClick={copyId}>{copied ? "Kopyalandı" : "ID'yi kopyala"}</button>
            </div>
          </div>
        )}

        <nav className="tabs" role="tablist" aria-label="Sandık türü">
          {TABS.map(([k, label, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} data-kind={k} className="tab" onClick={() => setTab(k)}>
              {label}
              <span className="n">{n}</span>
            </button>
          ))}
        </nav>
      </div>

      <main className="list" data-kind={kind}>
        {!boxes.length && (
          <div className="empty">
            <b>{isMor ? "Mor sandık yok" : isAll ? "Sandık yok" : "20/16 sandık yok"}</b>
            Bot yeni bir sandık gönderince burada görünecek. Sayfa kendiliğinden yenilenir.
          </div>
        )}
        {boxes.map((b) => {
          const live = safeLive(b);
          const left = leftOf(b, now);
          const ended = left <= 0;
          return (
            <article key={b.id} className={`card${ended ? " ended" : ""}`} data-kind={kind}>
              <Ring left={left} total={durOf(b)} ended={ended} />
              <div className="info">
                <div className="who">
                  <a href={live} target="_blank" rel="noreferrer" onClick={handleLiveClick}>
                    {b.flag ? `${b.flag} ` : ""}@{b.user}
                  </a>
                  <span className="ratio">{b.coins ?? "?"}/{b.people ?? "?"}</span>
                </div>
                <div className="sub">coin / kişi · {b.viewers ?? "?"} izleyici</div>
              </div>
              {b.comment ? <p dir="auto" className="comment">{b.comment}</p> : null}
              <a href={live} target="_blank" rel="noreferrer" onClick={handleLiveClick} className="go">
                {ended ? "Yayına yine de git" : "Yayına git"}
              </a>
            </article>
          );
        })}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="app center" />}>
      <Home />
    </Suspense>
  );
}
