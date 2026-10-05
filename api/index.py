import os
import json
import sqlite3
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, ContextTypes

# --- AYARLAR VE ENVIRONMENT VARIABLES ---
TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")

# Sizin Telegram ID'niz
DEFAULT_ADMIN = "8834664265"
ADMIN_IDS = [int(x.strip()) for x in os.environ.get("ADMIN_IDS", DEFAULT_ADMIN).split(",") if x.strip()]

DB_PATH = "/tmp/sandik.db" if os.path.exists("/tmp") else "sandik.db"

# --- DATABASE SETUP ---
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        coins INTEGER DEFAULT 0,
        sandik_count INTEGER DEFAULT 0
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS daily_user (
        day TEXT NOT NULL,
        username TEXT NOT NULL COLLATE NOCASE,
        n INTEGER NOT NULL DEFAULT 0,
        coins INTEGER NOT NULL DEFAULT 0,
        people INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (day, username)
    )
    """)
    conn.commit()
    conn.close()

init_db()

def is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS

# --- TELEGRAM BOT APPLICATION ---
telegram_app = None

def get_telegram_app():
    global telegram_app
    if telegram_app is None:
        telegram_app = ApplicationBuilder().token(TOKEN).build()

        async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
            user_id = update.effective_user.id
            if not is_admin(user_id):
                await update.message.reply_text("⛔ **Erişim Reddedildi!**\nBu bot kişiye özeldir ve sadece yetkili admin çalıştırabilir.")
                return

            keyboard = [
                [
                    InlineKeyboardButton("📊 Genel İstatistikler", callback_data="admin_stats"),
                    InlineKeyboardButton("💰 Bakiye / Coin Ekle", callback_data="admin_add_coin"),
                ],
                [
                    InlineKeyboardButton("🎁 Sandık Açılışları", callback_data="admin_sandik"),
                    InlineKeyboardButton("⚙️ Sistem Durumu", callback_data="admin_status"),
                ],
                [
                    InlineKeyboardButton("❌ Paneli Kapat", callback_data="admin_close")
                ]
            ]
            await update.message.reply_text(
                f"👑 **ADMIN YÖNETİM PANELİ**\n\n"
                f"Yetkili ID: `{user_id}`\n"
                f"Sistem Vercel Webhook üzerinde sorunsuz çalışıyor.\n\n"
                f"Yapmak istediğiniz işlemi seçin:",
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode="Markdown"
            )

        async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
            query = update.callback_query
            await query.answer()
            user_id = query.from_user.id
            if not is_admin(user_id):
                await query.edit_message_text("⛔ Yetkisiz işlem.")
                return

            data = query.data
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()

            if data == "admin_stats":
                cursor.execute("SELECT COUNT(*) FROM users")
                total_users = cursor.fetchone()[0]
                cursor.execute("SELECT SUM(coins), SUM(sandik_count) FROM users")
                stats = cursor.fetchone()
                total_coins = stats[0] if stats[0] else 0
                total_sandik = stats[1] if stats[1] else 0

                await query.edit_message_text(
                    f"📊 **VERİTABANI İSTATİSTİKLERİ**\n\n"
                    f"• Toplam Kullanıcı: `{total_users}`\n"
                    f"• Dağıtılan Coin: `{total_coins}`\n"
                    f"• Açılan Sandık: `{total_sandik}`",
                    parse_mode="Markdown"
                )
            elif data == "admin_status":
                await query.edit_message_text(
                    "⚙️ **SİSTEM DURUMU**\n\n"
                    "• Sunucu: Vercel Serverless\n"
                    "• Veritabanı: SQLite (Aktif)\n"
                    "• Mod: Sadece Admin (ID: 8834664265)",
                    parse_mode="Markdown"
                )
            elif data == "admin_add_coin":
                await query.edit_message_text("💰 **Coin Yükleme:** Admin paneli aktiftir.")
            elif data == "admin_sandik":
                await query.edit_message_text("🎁 **Sandık Yönetimi:** Aktif.")
            elif data == "admin_close":
                await query.delete_message()

            conn.close()

        telegram_app.add_handler(CommandHandler("start", start))
        telegram_app.add_handler(CommandHandler("admin", start))
        telegram_app.add_handler(CallbackQueryHandler(button_handler))

    return telegram_app

# --- VERCEL WSGI ENTRYPOINT ---
def handler(environ, start_response):
    try:
        request_method = environ.get('REQUEST_METHOD', 'GET')
        
        if request_method == 'POST':
            try:
                request_body_size = int(environ.get('CONTENT_LENGTH', 0))
            except ValueError:
                request_body_size = 0
                
            request_body = environ['wsgi.input'].read(request_body_size)
            json_data = json.loads(request_body.decode('utf-8'))

            bot_app = get_telegram_app()
            update = Update.de_json(json_data, bot_app.bot)

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(bot_app.initialize())
            loop.run_until_complete(bot_app.process_update(update))
            loop.run_until_complete(bot_app.shutdown())
            loop.close()

            status = '200 OK'
            response_headers = [('Content-Type', 'application/json')]
            start_response(status, response_headers)
            return [json.dumps({"status": "ok"}).encode('utf-8')]

        else:
            status = '200 OK'
            response_headers = [('Content-Type', 'text/plain; charset=utf-8')]
            start_response(status, response_headers)
            return ["Bot API Aktif (ID: 8834664265 Özel)".encode('utf-8')]

    except Exception as e:
        status = '500 Internal Server Error'
        response_headers = [('Content-Type', 'application/json')]
        start_response(status, response_headers)
        return [json.dumps({"error": str(e)}).encode('utf-8')]

# Vercel Serverless Uyumlu
app = handler
