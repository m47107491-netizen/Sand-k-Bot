# Key sistemi kurulum

## Site (Vercel)
1. `site/` klasörünü GitHub'a it (mevcut repoyu bununla değiştir).
2. Vercel env: `API_SECRET` (bot ile aynı), `KV_REST_API_URL`, `KV_REST_API_TOKEN` (zaten var).
3. Yeni: `POST /api/key` (bot -> create / revoke / revoke_tiktok), `/api/check?key=...` (site doğrular).
4. Site key'i 3 dk'da bir yeniden doğrular; iptal edilen key en geç 3 dk içinde düşer.

## Bot (Railway)
- Env: `BOT_TOKEN`, `ADMIN_ID`, `SITE_URL`, `API_SECRET`
- requirements: `python-telegram-bot[job-queue]>=20`, `requests`
- Komutlar: `/key` (kullanıcı), `/revoke <tiktok>` (admin)
- Not: `keys.db` SQLite; Railway'de volume yoksa redeploy'da silinir (site tarafı Redis'te, key'ler yine geçerli kalır).

## Takip kontrolü
`key_bot.py` içindeki `is_following()` şu an `None` döner (otomatik iptal yok).
Gerçek kontrol için TikTok takipçi listesini okuyan bir yöntem eklenmeli.
