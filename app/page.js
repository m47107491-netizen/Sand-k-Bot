"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [tab, setTab] = useState("normal");
  const [normal, setNormal] = useState([]);
  const [mor, setMor] = useState([]);
  const [status, setStatus] = useState("yükleniyor");
  const isMor = tab === "mor";
  const boxes = isMor ? mor : normal;

  async function load() {
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/boxes?limit=60", { cache: "no-store" }),
        fetch("/api/mor?limit=60", { cache: "no-store" }),
      ]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      setNormal(j1.boxes || []);
      setMor(j2.boxes || []);
      setStatus("canlı");
    } catch {
      setStatus("hata");
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.h1}>
          🎁 <span style={{ color: isMor ? "#b66dff" : "#f5c542" }}>{isMor ? "Mor" : "20/16"}</span> Sandık Canlı
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={styles.badge}>{status === "canlı" ? "● canlı" : "● " + status}</span>
          <span style={styles.badge}>{boxes.length} sandık</span>
        </div>
      </header>

      <div style={styles.tabs}>
        <button
          onClick={() => setTab("normal")}
          style={{ ...styles.tab, ...(!isMor ? styles.tabOn : {}) }}
        >
          20/16 ({normal.length})
        </button>
        <button
          onClick={() => setTab("mor")}
          style={{ ...styles.tab, ...(isMor ? styles.tabMor : {}) }}
        >
          Mor ({mor.length})
        </button>
      </div>

      <main style={styles.main}>
        {!boxes.length && (
          <p style={styles.empty}>
            Henüz {isMor ? "mor sandık" : "20/16"} yok. Bot API&apos;ye yazınca burada görünecek.
          </p>
        )}
        {boxes.map((b) => {
          const live = b.live_url || `https://www.tiktok.com/@${b.user}/live`;
          return (
            <article key={b.id} style={{ ...styles.card, ...(isMor ? styles.cardMor : {}) }}>
              <div style={styles.row}>
                <a href={live} target="_blank" rel="noreferrer" style={styles.user}>
                  @{b.user}
                </a>
                <span style={styles.meta}>{b.at}</span>
              </div>
              <div style={styles.stats}>
                <div style={styles.stat}>
                  <b>{b.coins ?? "?"}</b>
                  <span>coin</span>
                </div>
                <div style={styles.stat}>
                  <b>{b.people ?? "?"}</b>
                  <span>kişi</span>
                </div>
                <div style={styles.stat}>
                  <b>{b.viewers ?? "?"}</b>
                  <span>izleyici</span>
                </div>
              </div>
              <a href={live} target="_blank" rel="noreferrer" style={{ ...styles.btn, ...(isMor ? styles.btnMor : {}) }}>
                🔗 Yayına Git
              </a>
            </article>
          );
        })}
      </main>

      <footer style={styles.footer}>
        API: <code>/api/boxes</code> · POST <code>/api/box</code> · <code>/api/mor</code> (GET/POST)
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: 0,
    fontFamily: 'system-ui, "Segoe UI", sans-serif',
    background: "radial-gradient(1200px 600px at 10% -10%, #1a2740 0%, #0b0f14 55%)",
    color: "#e8eef6",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    background: "rgba(11,15,20,.9)",
    borderBottom: "1px solid #243041",
  },
  h1: { margin: 0, fontSize: "1.15rem" },
  badge: {
    fontSize: ".75rem",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #243041",
    color: "#8b9bb0",
  },
  main: { maxWidth: 720, margin: "0 auto", padding: 16 },
  empty: { textAlign: "center", color: "#8b9bb0", padding: 48 },
  card: {
    background: "linear-gradient(180deg, #182231, #141b24)",
    border: "1px solid #243041",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  row: { display: "flex", justifyContent: "space-between", gap: 8 },
  user: { fontSize: "1.2rem", fontWeight: 700, color: "#e8eef6", textDecoration: "none" },
  meta: { color: "#8b9bb0", fontSize: ".85rem" },
  stats: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 },
  stat: {
    background: "rgba(0,0,0,.25)",
    borderRadius: 12,
    padding: 10,
    textAlign: "center",
  },
  btn: {
    display: "block",
    marginTop: 12,
    textAlign: "center",
    textDecoration: "none",
    background: "linear-gradient(90deg, #1f8f7e, #2bbbad)",
    color: "#04120f",
    fontWeight: 700,
    borderRadius: 12,
    padding: 12,
  },
  tabs: { display: "flex", gap: 8, justifyContent: "center", padding: "14px 16px 0" },
  tab: {
    cursor: "pointer",
    fontSize: ".9rem",
    fontWeight: 600,
    padding: "8px 18px",
    borderRadius: 999,
    border: "1px solid #243041",
    background: "transparent",
    color: "#8b9bb0",
  },
  tabOn: { background: "#f5c542", color: "#1a1400", borderColor: "#f5c542" },
  tabMor: { background: "#b66dff", color: "#14061f", borderColor: "#b66dff" },
  cardMor: {
    background: "linear-gradient(180deg, #2a1b3d, #1c1328)",
    border: "1px solid #4a2f6b",
  },
  btnMor: { background: "linear-gradient(90deg, #8f3fe0, #b66dff)", color: "#14061f" },
  footer: { textAlign: "center", color: "#8b9bb0", fontSize: ".75rem", padding: 20 },
};
