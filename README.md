# Strip Club Empire — Landing Page

Neon velvet marketing site for **Strip Club Empire** (PC / Steam).

## Live
- **Repo:** https://github.com/polygrafix8/strip-club-empire-web
- **GitHub Pages:** https://polygrafix8.github.io/strip-club-empire-web/
- **Custom domain (target):** https://stripclubempire.com/  
  DNS must point at GitHub Pages (see below). Until then the domain may still redirect to Facebook.

## Facebook
https://www.facebook.com/stripclubempire/

## Local preview
```bash
cd /home/polyg/projects/strip-club-empire/website
python3 -m http.server 8765
# http://localhost:8765
```

## Deploy updates
```bash
cd /home/polyg/projects/strip-club-empire/website
git add -A
git commit -m "update site"
git push origin main
# Pages rebuilds automatically from main /
```

## Custom domain DNS (registrar)
GitHub Pages is configured with CNAME `stripclubempire.com`.

**Option A — apex + www (recommended):**
1. At your DNS host, remove the old Facebook redirect / parking records.
2. Add these **A** records for `@` (apex):
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
3. Add **AAAA** (optional IPv6):
   - `2606:50c0:8000::153`
   - `2606:50c0:8001::153`
   - `2606:50c0:8002::153`
   - `2606:50c0:8003::153`
4. Add **CNAME** for `www` → `polygrafix8.github.io`
5. In GitHub → repo **Settings → Pages**: enforce HTTPS once DNS goes green.

**Option B — subdomain only:**  
`www` CNAME → `polygrafix8.github.io` (and open `www.stripclubempire.com`).

Propagation: often 5–60 minutes, sometimes up to 24–48h.

## Wire before Steam wishlist
Edit `js/main.js`:
- `STEAM_URL`
- `YOUTUBE_VIDEO_ID` / `LOCAL_GAMEPLAY_MP4`

Edit `js/email.js`:
- `FORM_ENDPOINT`

## Stack
Static HTML/CSS/JS. No build step. `.nojekyll` + `CNAME` included.
