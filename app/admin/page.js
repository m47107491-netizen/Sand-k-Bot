"use client";
import { useState } from "react";

export default function AdminPage() {
  const [auth, setAuth] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [devices, setDevices] = useState([]);
  
  const [newId, setNewId] = useState("");
  const [newDuration, setNewDuration] = useState("1ay");

  const fetchDevices = async (pass) => {
    const res = await fetch(`/api/admin/devices?auth=${pass}`);
    const data = await res.json();
    if (data.ok) {
      setDevices(data.devices);
      setIsLoggedIn(true);
    } else {
      alert("Şifre yanlış!");
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    fetchDevices(auth);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newId) return;

    let seconds = 30 * 86400;
    const match = newDuration.match(/(\d+)\s*([a-zA-Zğüşıöç]+)/);
    if (match) {
      const val = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit.includes("s")) seconds = val * 3600;
      else if (unit.includes("g")) seconds = val * 86400;
      else if (unit.includes("h")) seconds = val * 7 * 86400;
      else if (unit.includes("a")) seconds = val * 30 * 86400;
    }

    const expires = Math.floor(Date.now() / 1000) + seconds;
    const did = newId.startsWith("device_") ? newId : `device_${newId}`;

    const res = await fetch("/api/admin/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auth, device_id: did, expires }),
    });

    if (res.ok) {
      setNewId("");
      fetchDevices(auth);
    } else {
      alert("Eklenemedi");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`${id} silinsin mi?`)) return;
    await fetch(`/api/admin/devices?auth=${auth}&device_id=${id}`, { method: "DELETE" });
    fetchDevices(auth);
  };

  if (!isLoggedIn) {
    return (
      <div style={styles.page}>
        <div style={styles.loginBox}>
          <h2>🔐 Admin Girişi</h2>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="password" placeholder="Admin Şifresi" value={auth} onChange={e => setAuth(e.target.value)} style={styles.input} />
            <button type="submit" style={styles.btn}>Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0 }}>⚙️ Cihaz Yönetimi</h2>
          <button onClick={() => setIsLoggedIn(false)} style={{ ...styles.btn, background: "#ef4444" }}>Çıkış</button>
        </div>

        <form onSubmit={handleAdd} style={styles.addForm}>
          <input type="text" placeholder="device_123456" value={newId} onChange={e => setNewId(e.target.value)} style={styles.input} required />
          <select value={newDuration} onChange={e => setNewDuration(e.target.value)} style={styles.input}>
            <option value="1g">1 Gün</option>
            <option value="1h">1 Hafta</option>
            <option value="1ay">1 Ay</option>
            <option value="12s">12 Saat</option>
            <option value="3g">3 Gün</option>
          </select>
          <button type="submit" style={{ ...styles.btn, background: "#10b981" }}>➕ Ekle / Güncelle</button>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {devices.length === 0 ? <p>Kayıtlı cihaz yok.</p> : null}
          {devices.sort((a,b) => b.expires - a.expires).map(dev => {
            const isActive = dev.expires > Date.now() / 1000;
            return (
              <div key={dev.id} style={{ ...styles.deviceCard, opacity: isActive ? 1 : 0.5 }}>
                <div>
                  <b style={{ fontSize: "1.1rem" }}>{dev.id}</b>
                  <div style={{ fontSize: "0.85rem", color: "#8b9bb0", marginTop: 4 }}>
                    Bitiş: {new Date(dev.expires * 1000).toLocaleString("tr-TR")} 
                    {!isActive && " (Süresi Doldu)"}
                  </div>
                </div>
                <button onClick={() => handleDelete(dev.id)} style={{ ...styles.btn, background: "#ef4444", padding: "6px 12px" }}>🗑 Sil</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#0b0f14", color: "#e8eef6", padding: 20, fontFamily: 'system-ui, sans-serif' },
  loginBox: { maxWidth: 400, margin: "100px auto", background: "#182231", padding: 30, borderRadius: 16, border: "1px solid #243041" },
  container: { maxWidth: 800, margin: "0 auto" },
  input: { width: "100%", padding: 12, borderRadius: 8, border: "1px solid #243041", background: "#0b0f14", color: "#fff", fontSize: "1rem", outline: "none" },
  btn: { padding: "12px 20px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff", fontWeight: "bold", cursor: "pointer", fontSize: "1rem" },
  addForm: { display: "flex", gap: 10, marginBottom: 30, background: "#182231", padding: 20, borderRadius: 12, border: "1px solid #243041", flexWrap: "wrap" },
  deviceCard: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#182231", padding: 16, borderRadius: 12, border: "1px solid #243041" }
};
