from http.server import BaseHTTPRequestHandler
import json

# Botunuzdan gelecek canlı veriyi tutacak yapı (Botunuz burayı güncelleyecek)
LIVE_DATA = {
    "stats": {
        "coins": 0,
        "boxes": 0,
        "channels": 0,
        "status": "Aktif ⚡"
    },
    "boxes": [], # Bot sandık buldukça buraya dict formatında ekleyecek
    "logs": ["[SİSTEM] WebApp canlı veri modunda başlatıldı."]
}

HTML_CONTENT = """<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Sandık Bot Yönetim Paneli</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        :root {
            --bg-color: #0d0d0d;
            --card-bg: #161618;
            --card-border: #26262a;
            --text-main: #ffffff;
            --text-sub: #a0a0a0;
            --accent-green: #8cc653;
            --accent-red: #e53935;
            --accent-blue: #29b6f6;
            --accent-orange: #ff9800;
            --card-radius: 16px;
            --btn-radius: 10px;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-main);
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            min-height: 100vh;
        }

        .card {
            background-color: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: var(--card-radius);
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
        }

        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 1.05rem;
            font-weight: 700;
        }

        .card-title { display: flex; align-items: center; gap: 8px; }

        .user-profile {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .user-meta { display: flex; align-items: center; gap: 12px; }

        .avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent-green), var(--accent-blue));
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.2rem;
            color: #000;
        }

        .user-info .name { font-weight: 600; font-size: 1rem; }
        .user-info .id { color: var(--text-sub); font-size: 0.8rem; }

        .ping-badge {
            background: rgba(140, 198, 83, 0.15);
            border: 1px solid var(--accent-green);
            color: var(--accent-green);
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .pulse-dot {
            width: 6px; height: 6px;
            background-color: var(--accent-green);
            border-radius: 50%;
            animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.7; }
            50% { transform: scale(1.3); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.7; }
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }

        .stat-box {
            background-color: rgba(255, 255, 255, 0.03);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .stat-label { font-size: 0.75rem; color: var(--text-sub); }
        .stat-value { font-size: 1.15rem; font-weight: 700; color: var(--accent-green); }

        .setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 0;
        }

        .setting-label { font-size: 0.9rem; color: var(--text-main); }

        .input-num {
            width: 75px;
            background: #222;
            border: 1px solid var(--card-border);
            color: #fff;
            padding: 6px 8px;
            border-radius: 6px;
            text-align: center;
            font-size: 0.9rem;
        }

        .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
            position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
            background-color: #333; transition: .3s; border-radius: 24px;
        }
        .slider:before {
            position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
            background-color: white; transition: .3s; border-radius: 50%;
        }
        input:checked + .slider { background-color: var(--accent-green); }
        input:checked + .slider:before { transform: translateX(20px); }

        .box-item {
            display: flex;
            flex-direction: column;
            gap: 8px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--card-border);
            border-left: 4px solid var(--accent-green);
            padding: 12px;
            border-radius: 10px;
        }

        .box-top { display: flex; align-items: center; justify-content: space-between; }
        .box-user { font-weight: 700; font-size: 0.95rem; color: #fff; }
        .box-coins { color: var(--accent-green); font-weight: 700; font-size: 0.9rem; }

        .box-timer-bar {
            width: 100%; height: 4px; background: #333;
            border-radius: 2px; overflow: hidden;
        }

        .box-progress {
            height: 100%;
            background: linear-gradient(90deg, var(--accent-green), var(--accent-blue));
            width: 100%;
            transition: width 1s linear;
        }

        .box-bottom { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; }
        .countdown-text { font-family: monospace; font-size: 0.9rem; color: var(--accent-orange); font-weight: bold; }

        .btn-link {
            background-color: rgba(41, 182, 246, 0.15);
            color: var(--accent-blue);
            padding: 6px 14px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 0.8rem;
            font-weight: 600;
        }

        .add-user-box { display: flex; gap: 8px; }
        .input-text {
            flex: 1; background: #222; border: 1px solid var(--card-border);
            color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 0.85rem;
        }
        .btn-add { background: var(--accent-green); color: #000; border: none; padding: 0 14px; border-radius: 8px; font-weight: bold; cursor: pointer; }

        .log-console {
            background: #000; border-radius: 8px; padding: 10px;
            font-family: monospace; font-size: 0.75rem; color: #76ff03;
            max-height: 110px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
        }

        .btn-group { display: flex; gap: 10px; margin-top: 4px; }
        .btn {
            flex: 1; padding: 12px; border: none; border-radius: var(--btn-radius);
            font-size: 0.95rem; font-weight: 600; cursor: pointer;
            display: flex; justify-content: center; align-items: center; gap: 6px;
        }
        .btn-green { background-color: var(--accent-green); color: #000; }
        .btn-red { background-color: var(--accent-red); color: #fff; }
    </style>
</head>
<body>

    <div class="card">
        <div class="user-profile">
            <div class="user-meta">
                <div class="avatar" id="avatar-char">?</div>
                <div class="user-info">
                    <div class="name" id="user-name">Yükleniyor...</div>
                    <div class="id">ID: <span id="user-id">-</span></div>
                </div>
            </div>
            <div class="ping-badge">
                <div class="pulse-dot"></div>
                <span id="ping-text">--ms</span>
            </div>
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-box">
            <span class="stat-label">Bugün Tahmini</span>
            <span class="stat-value" id="stat-coins">0 🪙</span>
        </div>
        <div class="stat-box">
            <span class="stat-label">Yakalanan Sandık</span>
            <span class="stat-value" id="stat-boxes">0 Adet</span>
        </div>
        <div class="stat-box">
            <span class="stat-label">Aktif Taranan</span>
            <span class="stat-value" style="color: var(--accent-blue);" id="stat-channels">0 Yayıncı</span>
        </div>
        <div class="stat-box">
            <span class="stat-label">Bot Durumu</span>
            <span class="stat-value" id="stat-status">Bağlanıyor...</span>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <div class="card-title">⚙️ Filtre & Otomasyon</div>
        </div>
        <div class="setting-item">
            <span class="setting-label">Otomatik Webhook / Toplama</span>
            <label class="switch">
                <input type="checkbox" id="toggle-autoclaim" checked onchange="updateSettings()">
                <span class="slider"></span>
            </label>
        </div>
        <div class="setting-item">
            <span class="setting-label">Yeni Sandık Bip Sesi</span>
            <label class="switch">
                <input type="checkbox" id="toggle-sound" checked>
                <span class="slider"></span>
            </label>
        </div>
        <div class="setting-item">
            <span class="setting-label">Min. Coin Limiti</span>
            <input type="number" class="input-num" id="min-coin" value="500" onchange="updateSettings()">
        </div>
        <div class="setting-item">
            <span class="setting-label">Min. Oran (Ratio)</span>
            <input type="number" step="0.1" class="input-num" id="min-ratio" value="1.5" onchange="updateSettings()">
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <div class="card-title">🎯 VIP Yayıncı Ekle</div>
        </div>
        <div class="add-user-box">
            <input type="text" id="target-username" class="input-text" placeholder="@kullanici_adi">
            <button class="btn-add" onclick="addTargetUser()">+ Ekle</button>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <div class="card-title">🎁 Aktif Sandıklar</div>
            <span style="font-size: 0.75rem; color: var(--accent-green);" id="live-count">0 Sandık</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;" id="box-container">
            <div style="text-align:center; color:#666; padding:10px; font-size:0.85rem;">Veriler bot üzerinden bekleniyor...</div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">
            <div class="card-title">📜 Sistem Logları</div>
        </div>
        <div class="log-console" id="log-console"></div>
    </div>

    <div class="btn-group">
        <button class="btn btn-green" onclick="refreshStats()">🔄 Yenile</button>
        <button class="btn btn-red" onclick="closeApp()">❌ Kapat</button>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();

        let activeBoxes = [];

        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            const user = tg.initDataUnsafe.user;
            document.getElementById('user-name').innerText = user.first_name + (user.last_name ? ' ' + user.last_name : '');
            document.getElementById('user-id').innerText = user.id;
            document.getElementById('avatar-char').innerText = user.first_name.charAt(0).toUpperCase();
        }

        // 🔄 BOT API'SİNDEN CANLI VERİ ÇEKME (POLLING)
        async function fetchLiveData() {
            try {
                const startTime = Date.now();
                const res = await fetch('/api/data');
                const ping = Date.now() - startTime;
                document.getElementById('ping-text').innerText = `${ping}ms`;

                if (res.ok) {
                    const data = await res.json();
                    
                    // İstatistikleri Güncelle
                    document.getElementById('stat-coins').innerText = `${data.stats.coins.toLocaleString()} 🪙`;
                    document.getElementById('stat-boxes').innerText = `${data.stats.boxes} Adet`;
                    document.getElementById('stat-channels').innerText = `${data.stats.channels} Yayıncı`;
                    document.getElementById('stat-status').innerText = data.stats.status;

                    // Eğer yeni sandık gelmişse bip çal
                    if (data.boxes.length > activeBoxes.length) {
                        playBeep();
                    }

                    activeBoxes = data.boxes;
                    renderBoxes();
                }
            } catch (err) {
                document.getElementById('ping-text').innerText = 'Çevrimdışı';
            }
        }

        function renderBoxes() {
            const container = document.getElementById('box-container');
            container.innerHTML = "";

            if (activeBoxes.length === 0) {
                container.innerHTML = `<div style="text-align:center; color:#666; padding:10px; font-size:0.85rem;">Aktif sandık bulunamadı.</div>`;
                document.getElementById('live-count').innerText = "0 Sandık";
                return;
            }

            document.getElementById('live-count').innerText = `${activeBoxes.length} Sandık`;

            activeBoxes.forEach((box) => {
                const minutes = Math.floor(box.remainingTime / 60).toString().padStart(2, '0');
                const seconds = (box.remainingTime % 60).toString().padStart(2, '0');
                const progressPercent = (box.remainingTime / box.totalTime) * 100;

                container.innerHTML += `
                    <div class="box-item">
                        <div class="box-top">
                            <span class="box-user">${box.user}</span>
                            <span class="box-coins">🪙 ${box.coins.toLocaleString()} Coin</span>
                        </div>
                        <div class="box-timer-bar">
                            <div class="box-progress" style="width: ${progressPercent}%;"></div>
                        </div>
                        <div class="box-bottom">
                            <span class="countdown-text">⏱️ Kalan: ${minutes}:${seconds}</span>
                            <a href="${box.url || '#'}" target="_blank" class="btn-link">Yayına Git</a>
                        </div>
                    </div>
                `;
            });
        }

        // Yerel Saniye Sayacı
        setInterval(() => {
            activeBoxes.forEach((box, i) => {
                if (box.remainingTime > 0) box.remainingTime--;
                else activeBoxes.splice(i, 1);
            });
            renderBoxes();
        }, 1000);

        // Her 3 saniyede bir Bot Sunucusundan Taze Veri İste
        setInterval(fetchLiveData, 3000);
        fetchLiveData();

        function playBeep() {
            if (!document.getElementById('toggle-sound').checked) return;
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                osc.type = "sine";
                osc.frequency.value = 880;
                osc.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.15);
            } catch (e) {}
        }

        function addTargetUser() {
            const input = document.getElementById('target-username');
            const username = input.value.trim();
            if (!username) return;

            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            tg.sendData(JSON.stringify({ action: "add_target", username: username }));
            addLog(`[VIP EKLE] ${username} bot talimatlarına eklendi.`);
            input.value = "";
        }

        function updateSettings() {
            const autoClaim = document.getElementById('toggle-autoclaim').checked;
            const minCoin = document.getElementById('min-coin').value;
            const minRatio = document.getElementById('min-ratio').value;

            if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
            tg.sendData(JSON.stringify({
                action: "update_settings",
                auto_claim: autoClaim,
                min_coin: parseInt(minCoin),
                min_ratio: parseFloat(minRatio)
            }));
            addLog(`Filtre güncellendi: Min ${minCoin} Coin`);
        }

        function refreshStats() {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            fetchLiveData();
        }

        function closeApp() { tg.close(); }

        function addLog(message) {
            const consoleEl = document.getElementById('log-console');
            const time = new Date().toLocaleTimeString('tr-TR');
            consoleEl.innerHTML += `<div>[${time}] ${message}</div>`;
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    </script>
</body>
</html>"""

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/data':
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(LIVE_DATA).encode('utf-8'))
        else:
            self.send_response(200)
            self.send_header('Content-type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(HTML_CONTENT.encode('utf-8'))
