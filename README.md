# SkyITEmpire Website

Animated 3D website for **SkyITEmpire**, a software house offering:

- **E-commerce Services**: Amazon, eBay, Etsy, Temu, TikTok Shop, Facebook Shop
- **Digital Marketing**: performance ads, social media, SEO, email automation
- **Web Development**: websites, e-commerce stores, web apps, 3D/WebGL

## Tech

- [Vite](https://vitejs.dev) (vanilla JS, no framework)
- [Three.js](https://threejs.org): real-time 3D hero (shader planet, rings, glass marketplace crystals, starfield, bloom)
- [GSAP](https://gsap.com) + ScrollTrigger: scroll reveals, counters, intro animations

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # preview the production build
```

## Deploy

Static site. On Vercel or Netlify, import the repo; the defaults work (build `npm run build`, output `dist`).

## Customise

| What | Where |
|------|-------|
| Text, services, contact email | `index.html` |
| Contact form email address | `src/main.js` (`mailto:`) and `index.html` |
| Colours, fonts, layout | `src/style.css` (`:root` variables) |
| 3D scene (planet, orbiters, bloom) | `src/scene.js` |
| Where the planet sits per section | `data-planet="x,y,scale"` attributes on each `<section>` |

The site respects `prefers-reduced-motion` and falls back to a gradient background when WebGL is unavailable.
