from http.server import BaseHTTPRequestHandler

HTML_CONTENT = """<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Sandık Bot Yönetim Paneli</title>
    <!-- Telegram Web App SDK -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <style>
        :root {
            --bg-color: #0d0d0d;
            --card-bg: #161618;
            --card-border: #26262a;
            --text-main: #ffffff;
            --text-sub: #a0a0a0;
            --accent-green: #8cc653;
            --accent-green-hover: #7ab543;
            --accent-red: #e53935;
            --accent-red-hover: #c62828;
            --accent-blue: #29b6f6;
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

        /* Kart Yapıları */
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

        .card-title {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Kullanıcı Profil Kartı */
        .user-profile {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .avatar {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--accent-green), var(--accent-blue));
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.2rem;
            color: #000;
        }

        .user-info .name {
            font-weight: 600;
            font-size: 1rem;
        }

        .user-info .id {
            color: var(--text-sub);
            font-size: 0.8rem;
        }

        /* 📊 İstatistik Grid */
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

        .stat-label {
            font-size: 0.75rem;
            color: var(--text-sub);
        }

        .stat-value {
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--accent-green);
        }

        /* 🎛 Kontrol & Filtre Alanı */
        .setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 0;
        }

        .setting-label {
            font-size: 0.9rem;
            color: var(--text-main);
        }

        .input-num {
            width: 70px;
            background: #222;
            border: 1px solid var(--card-border);
            color: #fff;
            padding: 6px 8px;
            border-radius: 6px;
            text-align: center;
            font-size: 0.9rem;
        }

        /* Switch Toggle */
        .switch {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
        }

        .switch input { opacity: 0; width: 0; height: 0; }

        .slider {
            position: absolute; cursor: pointer;
            top: 0; left: 0; right: 0; bottom: 0;
            background-color: #333;
            transition: .3s;
            border-radius: 24px;
        }

        .slider:before {
            position: absolute; content: "";
            height: 18px; width: 18px; left: 3px; bottom: 3px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
        }

        input:checked + .slider { background-color: var(--accent-green); }
        input:checked + .slider:before { transform: translateX(20px); }

        /* 🎁 Sandık Listesi Item */
        .box-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(255, 255, 255, 0.02);
            border-left: 3px solid var(--accent-green);
            padding: 10px;
            border-radius: 8px;
        }

        .box-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .box-user { font-weight: 600; font-size: 0.9rem; }
        .box-detail { font-size: 0.75rem; color: var(--text-sub); }

        .btn-link {
            background-color: rgba(41, 182, 246, 0.15);
            color: var(--accent-blue);
            padding: 6px 12px;
            border-radius: 6px;
            text-decoration: none;
            font-size: 0.8rem;
            font-weight: 600;
        }

        /* 📋 Log Konsolu */
        .log-console {
            background: #000;
            border-radius: 8px;
            padding: 10px;
            font-family: monospace;
            font-size: 0.75rem;
            color: #76ff03;
            max-height: 100px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        /* Action Butonları */
        .btn-group {
            display: flex;
            gap: 10px;
            margin-top: 4px;
        }

        .btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: var(--btn-radius);
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 6px;
        }

        .btn-green { background-color: var(--accent-green); color: #000; }
        .btn-red { background-color: var(--accent-red); color: #fff; }
        .btn:active { opacity: 0.8; }
    </style>
</head>
<body>

    <!-- 1. Kullanıcı & Profil Bilgisi -->
    <div class="card">
        <div class="user-profile">
            <div class="avatar" id="avatar-char">B</div>
            <div class="user-info">
                <div class="name" id="user-name">BBRxPhantom</div>
                <div class="id">ID: <span id="user-id">8834664265</span></div>
            </div>
        </div>
    </div>

    <!-- 2. Canlı İstatistikler -->
    <div class="stats-grid">
        <div class="stat-box">
            <span class="stat-label">Bugün Tahmini</span>
            <span class="stat-value" id="stat-coins">14,250 🪙</span>
        </div>
        <div class="stat-box">
            <span class="stat-label">Yakalanan Sandık</span>
            <span class="stat-value" id="stat-boxes">38 Adet</span>
        </div>
        <div class="stat-box">
            <span class="stat-label">Aktif Taranan</span>
            <span class="stat-value" style="color: var(--accent-blue);" id="stat-channels">12 Yayıncı</span>
        </div>
        <div class="stat-box">
            <span class="stat-label">Bot Durumu</span>
            <span class="stat-value" id="stat-status">Aktif ⚡</span>
        </div>
    </div>

    <!-- 3. Otomasyon & Filtre Ayarları -->
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
            <span class="setting-label">Min. Coin Limiti</span>
            <input type="number" class="input-num" id="min-coin" value="500" onchange="updateSettings()">
        </div>
        <div class="setting-item">
            <span class="setting-label">Min. Oran (Ratio)</span>
            <input type="number" step="0.1" class="input-num" id="min-ratio" value="1.5" onchange="updateSettings()">
        </div>
    </div>

    <!-- 4. Aktif Sandık Akışı -->
    <div class="card">
        <div class="card-header">
            <div class="card-title">🎁 Aktif Sandıklar</div>
            <span style="font-size: 0.75rem; color: var(--accent-green);">Canlı</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;" id="box-list">
            <div class="box-item">
                <div class="box-info">
                    <div class="box-user">@yayinici_ahmet</div>
                    <div class="box-detail">1,000 Coin | Kalan: 02:15</div>
                </div>
                <a href="https://www.tiktok.com" target="_blank" class="btn-link">Yayına Git</a>
            </div>
        </div>
    </div>

    <!-- 5. Canlı Konsol Logu -->
    <div class="card">
        <div class="card-header">
            <div class="card-title">📜 Sistem Logları</div>
        </div>
        <div class="log-console" id="log-console">
            <div>[17:05:12] Bot başlatıldı.</div>
            <div>[17:08:44] @yayinici_ahmet -> 1000 Coin tespit edildi.</div>
        </div>
    </div>

    <!-- 6. Ana Aksiyon Butonları -->
    <div class="btn-group">
        <button class="btn btn-green" onclick="refreshStats()">🔄 Yenile</button>
        <button class="btn btn-red" onclick="closeApp()">❌ Kapat</button>
    </div>

    <script>
        const tg = window.Telegram.WebApp;
        tg.expand();

        // Telegram Kullanıcı Verilerini Çekme
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            const user = tg.initDataUnsafe.user;
            const fullName = user.first_name + (user.last_name ? ' ' + user.last_name : '');
            document.getElementById('user-name').innerText = fullName;
            document.getElementById('user-id').innerText = user.id;
            document.getElementById('avatar-char').innerText = user.first_name.charAt(0).toUpperCase();
        }

        // Ayarlar Değiştiğinde Çalışacak Fonksiyon
        function updateSettings() {
            const autoClaim = document.getElementById('toggle-autoclaim').checked;
            const minCoin = document.getElementById('min-coin').value;
            const minRatio = document.getElementById('min-ratio').value;

            if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();

            // Telegram Botuna Yapılandırmayı Gönder
            tg.sendData(JSON.stringify({
                action: "update_settings",
                auto_claim: autoClaim,
                min_coin: parseInt(minCoin),
                min_ratio: parseFloat(minRatio)
            }));
            
            addLog(`Ayarlar güncellendi: Min ${minCoin} Coin`);
        }

        function refreshStats() {
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            addLog("İstatistikler yenilendi.");
            tg.sendData(JSON.stringify({ action: "refresh_stats" }));
        }

        function closeApp() {
            tg.close();
        }

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
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(HTML_CONTENT.encode('utf-8'))
