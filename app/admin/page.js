"use client";
import { useState, useEffect, useCallback, useMemo } from "react";

const DURATIONS = [
  { label: "1 Saat", sec: 3600 },
  { label: "12 Saat", sec: 12 * 3600 },
  { label: "1 Gün", sec: 86400 },
  { label: "3 Gün", sec: 3 * 86400 },
  { label: "1 Hafta", sec: 7 * 86400 },
  { label: "1 Ay", sec: 30 * 86400 },
  { label: "3 Ay", sec: 90 * 86400 },
  { label: "1 Yıl", sec: 365 * 86400 },
];

const KIND_LABELS = { boxes: "20/16 Sandık", mor: "Mor Sandık", all: "Tüm Sandıklar" };

const fmtDate = (ts) => new Date(ts * 1000).toLocaleString("tr-TR");

function fmtLeft(expires, now) {
  const d = expires - now;
  if (d <= 0) return "Süresi doldu";
  const days = Math.floor(d / 86400);
  const hours = Math.floor((d % 86400) / 3600);
  const mins = Math.floor((d % 3600) / 60);
  if (days > 0) return `${days}g ${hours}s kaldı`;
  if (hours > 0) return `${hours}s ${mins}dk kaldı`;
  return `${mins}dk kaldı`;
}

export default function AdminPage() {
  const [auth, setAuth] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState("keys");
  const [toast, setToast] = useState(null);

  const [keys, setKeys] = useState([]);
  const [search, setSearch] = useState("");
  const [newId, setNewId] = useState("");
  const [lastKey, setLastKey] = useState("");
  const [newDuration, setNewDuration] = useState(DURATIONS[0].sec);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  const [kind, setKind] = useState("boxes");
  const [boxes, setBoxes] = useState([]);
  const [stats, setStats] = useState(null);

  const headers = useCallback((pass) => ({ "Content-Type": "application/json", "x-admin-key": pass }), []);

  const notify = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30000);
    return () => clearInterval(t);
  }, []);

  const api = useCallback(
    async (url, opts = {}) => {
      const res = await fetch(url, { cache: "no-store", ...opts, headers: headers(auth) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setIsLoggedIn(false);
        try { sessionStorage.removeItem("admin_pass"); } catch {}
        notify("Oturum geçersiz, tekrar giriş yap", "err");
      }
      return { res, data };
    },
    [auth, headers]
  );

  const loadKeys = useCallback(async () => {
    const { data } = await api("/api/admin/keys");
    if (data.ok) setKeys(data.keys);
  }, [api]);

  const loadBoxes = useCallback(
    async (k = kind) => {
      const { data } = await api(`/api/admin/boxes?kind=${k}`);
      if (data.ok) setBoxes(data.boxes);
    },
    [api, kind]
  );

  const loadStats = useCallback(async () => {
    const { data } = await api("/api/admin/stats");
    if (data.ok) setStats(data);
  }, [api]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (tab === "keys") loadKeys();
    if (tab === "boxes") loadBoxes(kind);
    if (tab === "system") loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, kind, isLoggedIn]);

  // Sayfa yenilenince oturumu geri yükle (şifre sadece bu sekmenin sessionStorage'ında durur)
  useEffect(() => {
    let saved = "";
    try { saved = sessionStorage.getItem("admin_pass") || ""; } catch {}
    if (!saved) { setBooting(false); return; }
    fetch("/api/admin/keys", { headers: headers(saved), cache: "no-store" })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (data.ok) {
          setAuth(saved);
          setKeys(data.keys);
          setIsLoggedIn(true);
        } else {
          try { sessionStorage.removeItem("admin_pass"); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setBooting(false));
  }, [headers]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/keys", { headers: headers(auth), cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setKeys(data.keys);
        setIsLoggedIn(true);
        try { sessionStorage.setItem("admin_pass", auth); } catch {}
      } else if (res.status === 503 || res.status === 429) {
        notify(data.error || "Sunucu hatası", "err");
      } else {
        notify("Şifre yanlış!", "err");
      }
    } catch {
      notify("Sunucuya ulaşılamadı", "err");
    }
  };

  const logout = () => {
    try { sessionStorage.removeItem("admin_pass"); } catch {}
    setIsLoggedIn(false);
    setAuth("");
    setKeys([]);
    setBoxes([]);
    setStats(null);
  };

  // ---- Key işlemleri ----
  const handleAdd = async (e) => {
    e.preventDefault();
    const { res, data } = await api("/api/admin/keys", {
      method: "POST",
      body: JSON.stringify({ action: "create", tiktok: newId.trim(), duration: Number(newDuration) }),
    });
    if (res.ok && data.key) {
      setNewId("");
      setLastKey(data.key);
      try { await navigator.clipboard.writeText(data.key); } catch {}
      notify("Key üretildi (kopyalandı)");
      loadKeys();
    } else notify(data.error || "Üretilemedi", "err");
  };

  const extend = async (k, sec) => {
    const base = k.expires > now ? k.expires : now;
    const { res } = await api("/api/admin/keys", {
      method: "POST",
      body: JSON.stringify({ action: "extend", key: k.id, expires: base + sec }),
    });
    if (res.ok) {
      notify("Süre uzatıldı");
      loadKeys();
    } else notify("Hata", "err");
  };

  const revoke = async (k) => {
    if (!confirm(`${k.id} iptal edilsin mi?`)) return;
    await api(`/api/admin/keys?key=${encodeURIComponent(k.id)}`, { method: "DELETE" });
    notify("Key iptal edildi");
    loadKeys();
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Kopyalandı");
    } catch {
      notify("Kopyalanamadı", "err");
    }
  };

  const exportKeys = () => {
    const blob = new Blob([JSON.stringify(keys, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `keyler-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // ---- Sandık işlemleri ----
  const deleteBox = async (id) => {
    const { res } = await api(`/api/admin/boxes?kind=${kind}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (res.ok) {
      setBoxes((b) => b.filter((x) => x.id !== id));
      notify("Sandık silindi");
    } else notify("Silinemedi", "err");
  };

  const clearBoxes = async () => {
    if (!confirm(`${KIND_LABELS[kind]} listesi tamamen temizlensin mi?`)) return;
    const { res } = await api(`/api/admin/boxes?kind=${kind}&all=1`, { method: "DELETE" });
    if (res.ok) {
      setBoxes([]);
      notify("Liste temizlendi");
    } else notify("Temizlenemedi", "err");
  };

  const counts = useMemo(() => {
    const active = keys.filter((d) => d.expires > now).length;
    const soon = keys.filter((d) => d.expires > now && d.expires - now < 600).length;
    return { total: keys.length, active, soon };
  }, [keys, now]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...keys]
      .filter((d) => (q ? `${d.id} ${d.tiktok}`.toLowerCase().includes(q) : true))
      .sort((a, b) => b.expires - a.expires);
  }, [keys, search]);

  if (booting) return <div style={styles.page} />;

  if (!isLoggedIn) {
    return (
      <div style={styles.page}>
        {toast && <Toast t={toast} />}
        <div style={styles.loginBox}>
          <h2>🔐 Admin Girişi</h2>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="password" placeholder="Admin Şifresi" value={auth} onChange={(e) => setAuth(e.target.value)} style={styles.input} autoFocus />
            <button type="submit" style={styles.btn}>Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {toast && <Toast t={toast} />}
      <div style={styles.container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>⚙️ Admin Paneli</h2>
          <button onClick={logout} style={{ ...styles.btn, background: "#ef4444" }}>Çıkış</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[["keys", "🔑 Keyler"], ["boxes", "📦 Sandıklar"], ["system", "🛠 Sistem"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ ...styles.tab, ...(tab === k ? styles.tabOn : {}) }}>{l}</button>
          ))}
        </div>

        {tab === "keys" && (
          <>
            <div style={styles.statRow}>
              <Stat label="Aktif key" value={counts.active} color="#10b981" />
              <Stat label="10 dk içinde bitecek" value={counts.soon} color="#f5c542" />
            </div>

            <form onSubmit={handleAdd} style={styles.addForm}>
              <input type="text" placeholder="TikTok kullanıcı adı (isteğe bağlı)" value={newId} onChange={(e) => setNewId(e.target.value)} style={{ ...styles.input, flex: "2 1 180px", width: "auto" }} />
              <select value={newDuration} onChange={(e) => setNewDuration(e.target.value)} style={{ ...styles.input, flex: "1 1 120px", width: "auto" }}>
                {DURATIONS.map((d) => <option key={d.sec} value={d.sec}>{d.label}</option>)}
              </select>
              <button type="submit" style={{ ...styles.btn, background: "#10b981" }}>🔑 Key Üret</button>
            </form>

            {lastKey && (
              <div style={{ ...styles.addForm, marginBottom: 14 }}>
                <span style={{ color: "#8b9bb0" }}>Son üretilen:</span>{" "}
                <b style={{ cursor: "pointer", wordBreak: "break-all" }} onClick={() => copy(lastKey)} title="Kopyala">{lastKey}</b>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <input type="search" placeholder="🔎 Key / TikTok ara..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...styles.input, flex: "2 1 180px", width: "auto" }} />
              <button onClick={loadKeys} style={styles.btnSm}>🔄 Yenile</button>
              <button onClick={exportKeys} style={styles.btnSm}>⬇ JSON</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visible.length === 0 && <p style={{ color: "#8b9bb0" }}>Aktif key yok. Süresi dolan key'ler otomatik silinir.</p>}
              {visible.map((k) => (
                <div key={k.id} style={styles.deviceCard}>
                  <div style={{ minWidth: 0 }}>
                    <b style={{ fontSize: "1.05rem", cursor: "pointer", wordBreak: "break-all" }} title="Kopyala" onClick={() => copy(k.id)}>{k.id}</b>
                    <div style={{ fontSize: "0.85rem", color: "#8b9bb0", marginTop: 4 }}>
                      {k.tiktok ? `@${k.tiktok} · ` : ""}{k.tg_id ? `TG ${k.tg_id} · ` : ""}
                      Bitiş: {fmtDate(k.expires)} · <span style={{ color: "#10b981" }}>{fmtLeft(k.expires, now)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button onClick={() => extend(k, 3600)} style={styles.btnXs}>+1sa</button>
                    <button onClick={() => extend(k, 86400)} style={styles.btnXs}>+1g</button>
                    <button onClick={() => revoke(k)} style={{ ...styles.btnXs, background: "#ef4444" }}>⏹ İptal</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "boxes" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {Object.entries(KIND_LABELS).map(([k, l]) => (
                <button key={k} onClick={() => setKind(k)} style={{ ...styles.tab, ...(kind === k ? styles.tabOn : {}) }}>{l}</button>
              ))}
              <button onClick={() => loadBoxes(kind)} style={styles.btnSm}>🔄 Yenile</button>
              <button onClick={clearBoxes} style={{ ...styles.btnSm, background: "#ef4444" }}>🗑 Listeyi Temizle</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {boxes.length === 0 && <p style={{ color: "#8b9bb0" }}>Bu listede sandık yok.</p>}
              {boxes.map((b) => (
                <div key={b.id} style={styles.deviceCard}>
                  <div style={{ minWidth: 0 }}>
                    <b>@{b.user}</b>{" "}
                    <span style={{ color: "#f5c542" }}>{b.coins ?? "?"}/{b.people ?? "?"}</span>
                    <div style={{ fontSize: "0.85rem", color: "#8b9bb0", marginTop: 4, wordBreak: "break-word" }}>
                      {b.at} · izleyici: {b.viewers ?? "-"}
                      {b.source ? ` · ${b.source}` : ""}
                      {b.comment ? ` · “${b.comment}”` : ""}
                    </div>
                  </div>
                  <button onClick={() => deleteBox(b.id)} style={{ ...styles.btnXs, background: "#ef4444" }}>🗑</button>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === "system" && (
          <>
            <div style={{ marginBottom: 12 }}><button onClick={loadStats} style={styles.btnSm}>🔄 Yenile</button></div>
            {!stats ? (
              <p style={{ color: "#8b9bb0" }}>Yükleniyor...</p>
            ) : (
              <>
                <div style={styles.statRow}>
                  <Stat label="Depolama" value={stats.storage} color={stats.storage === "redis" ? "#10b981" : "#f5c542"} />
                  <Stat label="Filtre" value={stats.filter} />
                  <Stat label="20/16" value={stats.counts.boxes} />
                  <Stat label="Mor" value={stats.counts.mor} />
                  <Stat label="Tüm" value={stats.counts.all} />
                </div>
                <div style={styles.addForm}>
                  <div style={{ width: "100%" }}>
                    <b>Ortam değişkenleri</b>
                    {Object.entries(stats.env).map(([k, v]) => (
                      <div key={k} style={{ marginTop: 8, color: v ? "#10b981" : "#ef4444" }}>
                        {v ? "✅" : "❌"} {k} {v ? "ayarlı" : "ayarlı değil"}
                      </div>
                    ))}
                    <div style={{ marginTop: 12, color: "#8b9bb0", fontSize: ".85rem" }}>Sunucu saati: {new Date(stats.time).toLocaleString("tr-TR")}</div>
                    {stats.storage === "memory" && (
                      <div style={{ marginTop: 10, color: "#f5c542", fontSize: ".9rem" }}>
                        ⚠️ Redis bağlı değil: sandıklar bellekte tutuluyor, yeniden başlatmada silinir.
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={styles.stat}>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: color || "#e8eef6" }}>{value}</div>
      <div style={{ fontSize: ".75rem", color: "#8b9bb0" }}>{label}</div>
    </div>
  );
}

function Toast({ t }) {
  return (
    <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: t.type === "err" ? "#ef4444" : "#10b981", color: "#fff", padding: "10px 18px", borderRadius: 10, fontWeight: 600, zIndex: 10 }}>
      {t.msg}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0b0f14", color: "#e8eef6", padding: 20, fontFamily: "system-ui, sans-serif" },
  loginBox: { maxWidth: 400, margin: "100px auto", background: "#182231", padding: 30, borderRadius: 16, border: "1px solid #243041" },
  container: { maxWidth: 800, margin: "0 auto" },
  input: { width: "100%", padding: 12, borderRadius: 8, border: "1px solid #243041", background: "#0b0f14", color: "#fff", fontSize: "1rem", outline: "none", boxSizing: "border-box" },
  btn: { padding: "12px 20px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "1rem" },
  btnSm: { padding: "10px 14px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: ".9rem" },
  btnXs: { padding: "6px 10px", borderRadius: 6, border: "none", background: "#3b82f6", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: ".8rem" },
  tab: { cursor: "pointer", fontSize: ".95rem", fontWeight: 600, padding: "8px 18px", borderRadius: 999, border: "1px solid #243041", background: "transparent", color: "#8b9bb0" },
  tabOn: { background: "#243041", color: "#fff" },
  addForm: { display: "flex", gap: 10, marginBottom: 20, background: "#182231", padding: 20, borderRadius: 12, border: "1px solid #243041", flexWrap: "wrap" },
  statRow: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" },
  stat: { flex: "1 1 110px", background: "#182231", border: "1px solid #243041", borderRadius: 12, padding: "12px 14px" },
  deviceCard: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#182231", padding: 16, borderRadius: 12, border: "1px solid #243041", flexWrap: "wrap" },
};
