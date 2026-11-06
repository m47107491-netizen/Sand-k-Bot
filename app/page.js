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

function fmt(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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

    // Linkten gelen kullanıcı adı (?u=...)
    const u = searchParams.get("u");
    if (u) setTargetUser(u);

    fetch(`/api/check?device=${did}`)
      .then((r) => r.json())
      .then((data) => {
        setIsAuthorized(data.ok);
        
        // OTOMATİK YÖNLENDİRME: Eğer yetkiliyse ve linkten kullanıcı gelmişse direkt TikTok'a at
        if (data.ok && u) {
          setRedirecting(true);
          setTimeout(() => {
            window.location.href = `https://www.tiktok.com/@${u}/live`;
          }, 1500); // 1.5 saniye "Yönlendiriliyorsunuz" gösterip atar
        }
      })
      .catch(() => setIsAuthorized(false));
  }, [searchParams]);

  const copyId = () => {
    navigator.clipboard.writeText(deviceId);
    alert("Cihaz ID kopyalandı: " + deviceId + "\nAdmine göndererek yetki alabilirsiniz.");
  };

  const handleLiveClick = (e, user) => {
    if (!isAuthorized) {
      e.preventDefault();
      alert(`⚠️ Yayına gitmek için admine ödeme yapın.\n\nCihaz ID'niz: ${deviceId}\n\nBu ID'yi admine DM'den gönderin.`);
    }
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
    load();
    const t = setInterval(load, 4000);
    const c = setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, []);

  // EĞER YÖNLENDİRİLİYORSA BUNU GÖSTER
  if (redirecting) {
    return (
      <div style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: "4rem", marginBottom: "20px" }}>🚀</div>
        <h2 style={{ color: "#4ade80", marginBottom: "10px" }}>Cihaz Onaylı!</h2>
        <p style={{ color: "#8b9bb0" }}>@{targetUser} yayınına yönlendiriliyorsunuz...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {isAuthorized === false && (
        <div style={styles.alertBox}>
          <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#f87171", marginBottom: 8 }}>
            ⚠️ Cihaz Doğrulanamadı
          </div>
          <div style={{ fontSize: "0.95rem", marginBottom: 16, color: "#fca5a5" }}>
            Cihaz kimliği sistemde eşleşmedi. Yayına gitmek için admine ödeme yapın.
          </div>
          <div style={{ background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: "8px", marginBottom: 16, fontFamily: "monospace", fontSize: "1.1rem", color: "#fff", letterSpacing: "1px" }}>
            {deviceId}
          </div>
          <button onClick={copyId} style={styles.copyBtn}>
            📋 Cihaz ID Kopyala
          </button>
        </div>
      )}

      <header style={styles.header}>
        <h1 style={styles.h1}>
          🎁 <span style={{ color: isMor ? "#b66dff" : isAll ? "#4cc9f0" : "#f5c542" }}>{isMor ? "Mor" : isAll ? "Tümü" : "20/16"}</span> Sandık Canlı
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={styles.badge}>{status === "canlı" ? "● canlı" : "● " + status}</span>
          <span style={styles.badge}>{boxes.length} sandık</span>
        </div>
      </header>

      <div style={styles.tabs}>
        <button onClick={() => setTab("normal")} style={{ ...styles.tab, ...(!isMor && !isAll ? styles.tabOn : {}) }}>20/16 ({normalV.length})</button>
        <button onClick={() => setTab("mor")} style={{ ...styles.tab, ...(isMor ? styles.tabMor : {}) }}>Mor ({morV.length})</button>
        <button onClick={() => setTab("all")} style={{ ...styles.tab, ...(isAll ? styles.tabAll : {}) }}>Tümü ({allV.length})</button>
      </div>

      <main style={styles.main}>
        {!boxes.length && (
          <p style={styles.empty}>Henüz {isMor ? "mor sandık" : isAll ? "sandık" : "20/16"} yok. Bot API&apos;ye yazınca burada görünecek.</p>
        )}
        {boxes.map((b) => {
          const live = b.live_url || `https://www.tiktok.com/@${b.user}/live`;
          const left = leftOf(b, now);
          const ended = left <= 0;
          return (
            <article key={b.id} style={{ ...styles.card, ...(isMor ? styles.cardMor : {}), ...(ended ? { opacity: 0.4, filter: "grayscale(0.8)" } : {}) }}>
              <div style={styles.row}>
                <a href={live} target="_blank" rel="noreferrer" style={styles.user} onClick={(e) => handleLiveClick(e, b.user)}>
                  {b.flag ? `${b.flag} ` : ""}@{b.user}
                </a>
                <span style={{ ...styles.meta, color: ended ? "#8b9bb0" : "#f5c542", fontWeight: 700 }}>
                  {ended ? "bitti" : `⏳ ${fmt(left)}`}
                </span>
              </div>
              <div style={styles.stats}>
                <div style={styles.stat}><b>{b.coins ?? "?"}</b><span>coin</span></div>
                <div style={styles.stat}><b>{b.people ?? "?"}</b><span>kişi</span></div>
                <div style={styles.stat}><b>{b.viewers ?? "?"}</b><span>izleyici</span></div>
              </div>
              {b.comment ? <div dir="auto" style={styles.comment}>💬 {b.comment}</div> : null}
              <a href={live} target="_blank" rel="noreferrer" onClick={(e) => handleLiveClick(e, b.user)} style={{ ...styles.btn, ...(isMor ? styles.btnMor : {}) }}>
                🔗 Yayına Git
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
    <Suspense fallback={<div style={{ color: "white", textAlign: "center", marginTop: 50 }}>Yükleniyor...</div>}>
      <Home />
    </Suspense>
  );
}

const styles = {
  page: { minHeight: "100vh", margin: 0, fontFamily: 'system-ui, "Segoe UI", sans-serif', background: "radial-gradient(1200px 600px at 10% -10%, #1a2740 0%, #0b0f14 55%)", color: "#e8eef6" },
  alertBox: { background: "#2a1520", borderBottom: "2px solid #ef4444", padding: "20px", textAlign: "center", position: "sticky", top: 0, zIndex: 50 },
  copyBtn: { background: "#fff", color: "#e63946", border: "none", padding: "10px 20px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "0.9rem", width: "100%", maxWidth: "300px" },
  header: { position: "sticky", top: 0, zIndex: 10, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "rgba(11,15,20,.9)", borderBottom: "1px solid #243041" },
  h1: { margin: 0, fontSize: "1.15rem" },
  badge: { fontSize: ".75rem", padding: "4px 10px", borderRadius: 999, border: "1px solid #243041", color: "#8b9bb0" },
  main: { maxWidth: 720, margin: "0 auto", padding: 16 },
  empty: { textAlign: "center", color: "#8b9bb0", padding: 48 },
  card: { background: "linear-gradient(180deg, #182231, #141b24)", border: "1px solid #243041", borderRadius: 16, padding: 16, marginBottom: 12 },
  row: { display: "flex", justifyContent: "space-between", gap: 8 },
  user: { fontSize: "1.2rem", fontWeight: 700, color: "#e8eef6", textDecoration: "none" },
  meta: { color: "#8b9bb0", fontSize: ".85rem" },
  stats: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 },
  stat: { background: "rgba(0,0,0,.25)", borderRadius: 12, padding: 10, textAlign: "center" },
  btn: { display: "block", marginTop: 12, textAlign: "center", textDecoration: "none", background: "linear-gradient(90deg, #1f8f7e, #2bbbad)", color: "#04120f", fontWeight: 700, borderRadius: 12, padding: 12 },
  tabs: { display: "flex", gap: 8, justifyContent: "center", padding: "14px 16px 0" },
  tab: { cursor: "pointer", fontSize: ".9rem", fontWeight: 600, padding: "8px 18px", borderRadius: 999, border: "1px solid #243041", background: "transparent", color: "#8b9bb0" },
  tabOn: { background: "#f5c542", color: "#1a1400", borderColor: "#f5c542" },
  tabAll: { background: "#4cc9f0", color: "#06202a", borderColor: "#4cc9f0" },
  tabMor: { background: "#b66dff", color: "#14061f", borderColor: "#b66dff" },
  comment: { marginTop: 12, padding: "8px 12px", borderRadius: 10, background: "rgba(0,0,0,.25)", color: "#cfd8e6", fontSize: ".95rem", wordBreak: "break-word" },
  cardMor: { background: "linear-gradient(180deg, #2a1b3d, #1c1328)", border: "1px solid #4a2f6b" },
  btnMor: { background: "linear-gradient(90deg, #8f3fe0, #b66dff)", color: "#14061f" },
};
