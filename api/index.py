from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        
        # Telegram Web App Arayüzü (HTML)
        html_content = """
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sandık Yönetim Paneli</title>
            <script src="https://telegram.org/js/telegram-web-app.js"></script>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    background-color: var(--tg-theme-bg-color, #1a1a1a);
                    color: var(--tg-theme-text-color, #ffffff);
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .card {
                    background-color: var(--tg-theme-secondary-bg-color, #2a2a2a);
                    border-radius: 12px;
                    padding: 16px;
                    width: 100%;
                    max-width: 400px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                    margin-bottom: 15px;
                }
                h2 {
                    margin-top: 0;
                    color: var(--tg-theme-button-color, #0088cc);
                }
                .btn {
                    background-color: var(--tg-theme-button-color, #0088cc);
                    color: var(--tg-theme-button-text-color, #ffffff);
                    border: none;
                    padding: 12px 20px;
                    border-radius: 8px;
                    width: 100%;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>👑 Admin Kontrol Paneli</h2>
                <p id="user-info">Kullanıcı yükleniyor...</p>
            </div>

            <div class="card">
                <h3>📊 Hızlı İşlemler</h3>
                <button class="btn" onclick="alert('İşlem Başarılı!')">Sandık İstatistikleri</button>
                <button class="btn" style="background-color: #e53935; margin-top: 10px;" onclick="Telegram.WebApp.close()">Kapat</button>
            </div>

            <script>
                const tg = window.Telegram.WebApp;
                tg.expand(); // Ekranı kapla
                
                const user = tg.initDataUnsafe.user;
                if (user) {
                    document.getElementById('user-info').innerText = "Hoş geldin, " + (user.first_name || "Admin") + " (ID: " + user.id + ")";
                } else {
                    document.getElementById('user-info').innerText = "Telegram Web App ortamında çalışıyor.";
                }
            </script>
        </body>
        </html>
        """
        self.wfile.write(html_content.encode('utf-8'))

app = handler
