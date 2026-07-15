# Strip Club Empire — Landing Page

Neon velvet marketing site for **Strip Club Empire** (PC / Steam).

## Location
`/home/polyg/projects/strip-club-empire/website/`

Domain target: **https://stripclubempire.com/** (currently may redirect to Facebook until this is deployed).

## Preview locally
```bash
cd /home/polyg/projects/strip-club-empire/website
python3 -m http.server 8765
# open http://localhost:8765
```

## What’s included
- MotionSites-style reactive hero (ambient gradients, cursor glow, floating stub cards)
- Trailer stub → click-to-load YouTube sizzle (`2JXnBtyA3ig`) with Error-153-safe origin injection
- Screenshot carousel (autoplay, arrows, dots, thumbs, swipe)
- Feature + mode sections (Design / Ops / Admin)
- Stub performer key art (replaceable neon silhouettes)
- Wishlist / email capture stubs
- Mobile sticky CTA, SEO/OG tags, mature 18+ footer

## Wire before launch
Edit `js/main.js`:
- `STEAM_URL`
- `FACEBOOK_URL`
- `YOUTUBE_VIDEO_ID` (or `LOCAL_GAMEPLAY_MP4`)

Edit `js/email.js`:
- `FORM_ENDPOINT`

## Replace assets anytime
Drop into `assets/images/`:
- `logo.png`, `hero-keyart.jpg`, `screenshot-*.jpg`, `stub-performer-*.jpg`, `trailer-thumb.jpg`, `og-image.jpg`

Progress captures currently sourced from:
`E:\icandy\games\SCE\Source\Design\progress screens`

## Deploy
Static files only — Netlify / Cloudflare Pages / any host pointing `stripclubempire.com` at this folder.
