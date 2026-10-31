# 20/16 Sandık — Vercel

## Vercel'e yükle (2 yol)

### A) GitHub ile
1. Bu klasörü GitHub reposuna at
2. [vercel.com](https://vercel.com) → **Add New Project** → repo seç
3. **Environment Variables**:
   - `SANDIK_API_TOKEN` = `kendi-gizli-tokenin`
4. Deploy

### B) Vercel CLI
```bash
npm i -g vercel
cd sandik-vercel
vercel
# sonra production:
vercel --prod
```

## Adresler
- Site: `https://SENIN-PROJE.vercel.app`
- Liste: `https://SENIN-PROJE.vercel.app/api/boxes`
- Ekle: `POST https://SENIN-PROJE.vercel.app/api/box`

## Bot ayarı (`sandik_20_16.py`)
```python
"API_URL": "https://SENIN-PROJE.vercel.app",
"API_TOKEN": "kendi-gizli-tokenin",
```

## Test
```bash
curl -X POST https://SENIN-PROJE.vercel.app/api/box \
  -H "Authorization: Bearer sandik20-16-secret" \
  -H "Content-Type: application/json" \
  -d '{"user":"test_user","coins":20,"people":16,"viewers":100}'
```

## Not
Vercel serverless olduğu için sandıklar **bellekte** tutulur (instance uyanıkken).
Uzun süre kalıcı istersen sonra Vercel KV / Upstash ekleriz.
