# SkyITEmpire Website

Animated 3D website (light theme) for **SkyITEmpire**, a software house offering:

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
npm run dev       # http://localhost:5173  (admin: /admin.html)
npm run build     # production build in dist/
npm run preview   # preview the production build
```

## Deploy

Static site. On Vercel or Netlify, import the repo; the defaults work (build `npm run build`, output `dist`).

## Admin dashboard (`/admin.html`)

All website content lives in one JSON document that the admin dashboard edits:

- **Reorder sections** by dragging (or using the ↑ ↓ buttons), **hide/show**, **duplicate**, **delete** or **add** sections
- **Edit every text**: hero, services, marketplaces, marketing dashboard values, packages, FAQ, footer and more
- **Images**: logo, marketplace logos, web-dev section image, testimonial photos (uploaded to Supabase Storage)
- **Testimonials**: add, edit, reorder, delete, star ratings and photos
- **Live preview** (desktop and mobile) that updates as you type
- **Save & publish** writes to Supabase, and the public site loads it on the next visit
- Export/import the content as JSON for backups

Text tip: wrap words in `*asterisks*` to give them the gradient (or gold, in the footer) highlight.

### One-time Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. **SQL Editor → New query**: paste [`supabase/schema.sql`](supabase/schema.sql), change
   `you@example.com` at the bottom to your admin email, and click **Run**. This creates the
   `site_content` and `site_admins` tables, the security rules and the `site-media` image bucket.
3. **Authentication → Users → Add user**: create your admin login (same email as step 2).
   Under **Authentication → Providers → Email** you can turn off "Allow new users to sign up",
   so nobody else can create accounts.
4. **Project Settings → API**: copy the Project URL and the `anon` public key into `.env.local`
   (see `.env.example`):
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```
5. On Vercel/Netlify add the same two variables under the project's Environment Variables and redeploy.
6. Open `https://your-site/admin.html`, sign in, edit, and click **Save & publish**.

Security: the database only lets emails listed in `site_admins` write content or upload images; everyone
else can only read. The `anon` key is safe to expose in the browser.

Without Supabase configured, the dashboard runs in **demo mode**: changes are kept in your browser only
(useful for trying it out), and the public site shows the built-in defaults from `src/content/defaults.js`.

## Customise in code

| What | Where |
|------|-------|
| Default content (used until something is saved) | `src/content/defaults.js` |
| Section HTML templates | `src/render.js` |
| Admin form fields per section | `src/admin/schema.js` |
| Colours, fonts, layout, light/dark themes | `src/style.css` (`:root` variables) |
| 3D scene (planet, orbiters, themes) | `src/scene.js` |

The site respects `prefers-reduced-motion`, has a light/dark toggle (remembered per visitor), and falls back to a
gradient background when WebGL is unavailable.
