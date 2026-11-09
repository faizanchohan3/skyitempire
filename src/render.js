// Renders the whole page from a content object (see content/defaults.js).
// All admin-provided text is HTML-escaped; *asterisks* become the gradient
// highlight and line breaks are preserved where it makes sense.

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Gradient highlight: *word* -> <span class="grad">word</span>
const rich = (v, cls = "grad") => esc(v).replace(/\*(.+?)\*/g, `<span class="${cls}">$1</span>`);

// Only allow http(s), mailto, tel, in-page anchors and site-relative URLs.
export function safeUrl(url, fallback = "#") {
  const u = String(url ?? "").trim();
  if (!u) return fallback;
  if (/^(https?:|mailto:|tel:)/i.test(u) || u.startsWith("#") || (u.startsWith("/") && !u.startsWith("//"))) return u;
  return fallback;
}

const color = (c, fallback = "#2563eb") => (/^#[0-9a-f]{3,8}$/i.test(String(c || "")) ? c : fallback);

const head = (s, center = false) => `
  <div class="section__head${center ? " section__head--center" : ""}">
    ${s.eyebrow ? `<p class="eyebrow reveal"><span class="dot"></span> ${esc(s.eyebrow)}</p>` : ""}
    ${s.title ? `<h2 class="section__title reveal">${rich(s.title)}</h2>` : ""}
    ${s.lead ? `<p class="section__lead reveal">${esc(s.lead)}</p>` : ""}
  </div>`;

// Where the 3D planet sits for each section type: "x,y,scale" (desktop / mobile)
const PLANET = {
  hero: ["2.9,0,1", "0,2.2,0.55"],
  services: ["-3.4,0.6,0.7", "0,0.5,0.6"],
  marketplaces: ["3.4,0.4,0.7", "0,-0.5,0.6"],
  marketing: ["2.7,0,0.85", "0,-1.6,0.6"],
  webdev: ["-2.7,0,0.85", "0,1.6,0.6"],
  whyus: ["3.2,1.2,0.6", "0,-1.2,0.55"],
  process: ["-3.6,1.4,0.55", "0,0,0.6"],
  packages: ["-3.8,-0.6,0.6", "0,1.4,0.55"],
  testimonials: ["-4.6,-2.8,0.5", "0,-1.6,0.55"],
  faq: ["3.3,0,0.75", "0,1.6,0.55"],
  contact: ["0,-0.4,1.2", "0,0,0.8"],
};
const planetAttr = (type) => (PLANET[type] ? ` data-planet="${PLANET[type][0]}" data-planet-m="${PLANET[type][1]}"` : "");

const ICONS = {
  cart: '<path d="M6 8h5l5 22h20l5-15H14" /><circle cx="19" cy="38" r="3" /><circle cx="34" cy="38" r="3" />',
  chart: '<path d="M6 38 18 24l8 8 16-18" /><path d="M32 14h10v10" />',
  code: '<rect x="5" y="9" width="38" height="30" rx="4" /><path d="M5 17h38" /><path d="m19 25-4 4 4 4M29 25l4 4-4 4" />',
  rocket: '<path d="M24 4c8 6 12 15 10 26H14C12 19 16 10 24 4z" /><circle cx="24" cy="18" r="4" /><path d="M14 30l-6 8h10M34 30l6 8H30M20 38l4 6 4-6" />',
  globe: '<circle cx="24" cy="24" r="19" /><path d="M5 24h38M24 5c6 6 8 13 8 19s-2 13-8 19c-6-6-8-13-8-19s2-13 8-19z" />',
  star: '<path d="M24 5l5.7 12 13.3 1.6-9.8 9.2 2.6 13.2L24 34.6 12.2 41l2.6-13.2L5 18.6 18.3 17z" />',
  megaphone: '<path d="M6 20v8h8l16 10V10L14 20H6z" /><path d="M36 18c3 2 3 10 0 12M14 28l3 12h6l-3-11" />',
  shield: '<path d="M24 4l16 6v12c0 10-7 18-16 22C15 40 8 32 8 22V10z" /><path d="M17 24l5 5 9-10" />',
};
export const ICON_NAMES = Object.keys(ICONS);

const svgIcon = (name) =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ICONS.star}</svg>`;

const check = '<svg><use href="#i-check" /></svg>';
const star = '<svg><use href="#i-star" /></svg>';

/* ---------------------------------------------------------------- */
/* Section templates                                                  */
/* ---------------------------------------------------------------- */
const T = {
  hero: (s) => `
    <section class="hero" id="${esc(s.id)}"${planetAttr("hero")}>
      <div class="hero__content">
        ${s.eyebrow ? `<p class="eyebrow reveal-hero"><span class="dot"></span> ${esc(s.eyebrow)}</p>` : ""}
        <h1 class="hero__title">
          ${(s.lines || []).map((l) => `<span class="line"><span class="reveal-hero">${rich(l)}</span></span>`).join("")}
        </h1>
        <p class="hero__sub reveal-hero">${esc(s.text)}</p>
        <div class="hero__cta reveal-hero">
          ${s.primaryCta ? `<a href="#contact" class="btn btn--primary btn--lg magnetic">${esc(s.primaryCta)} <span class="arrow">→</span></a>` : ""}
          ${s.secondaryCta ? `<a href="#services" class="btn btn--ghost btn--lg magnetic">${esc(s.secondaryCta)}</a>` : ""}
        </div>
        ${
          s.badges?.length
            ? `<ul class="hero__badges reveal-hero">${s.badges.map((b) => `<li><strong>${esc(b.value)}</strong> ${esc(b.label)}</li>`).join("")}</ul>`
            : ""
        }
      </div>
      <a href="#services" class="scroll-hint" aria-label="Scroll down">
        <span class="scroll-hint__mouse"><span></span></span><span>Scroll</span>
      </a>
    </section>`,

  marquee: (s) => {
    const row = (s.items || []).map((i) => `<span>${esc(i)}</span><i>✦</i>`).join("");
    return `<div class="marquee" id="${esc(s.id)}" aria-label="Platforms we work with"><div class="marquee__track">${row}${row}</div></div>`;
  },

  services: (s) => `
    <section class="section" id="${esc(s.id)}"${planetAttr("services")}>
      ${head(s)}
      <div class="services">
        ${(s.items || [])
          .map(
            (it, i) => `
          <article class="service-card tilt reveal" style="--accent:${color(it.color)}">
            <div class="service-card__glow"></div>
            <div class="service-card__icon">${svgIcon(it.icon)}</div>
            <span class="service-card__num">${String(i + 1).padStart(2, "0")}</span>
            <h3>${esc(it.title)}</h3>
            <p>${esc(it.text)}</p>
            <ul>${(it.points || []).map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
            ${it.linkLabel ? `<a href="#${esc(it.linkTarget || "contact")}" class="link">${esc(it.linkLabel)}</a>` : ""}
          </article>`
          )
          .join("")}
      </div>
    </section>`,

  marketplaces: (s) => `
    <section class="section" id="${esc(s.id)}"${planetAttr("marketplaces")}>
      ${head(s)}
      <div class="platforms">
        ${(s.items || [])
          .map(
            (it) => `
          <article class="platform tilt reveal" style="--c:${color(it.color)}">
            <div class="platform__top">
              <span class="platform__badge"${it.image ? "" : ` data-brand="${esc(it.brand)}"`}>${
                it.image ? `<img class="platform__img" src="${esc(safeUrl(it.image, ""))}" alt="" loading="lazy" />` : ""
              }</span>
              <h3>${esc(it.name)}</h3>
            </div>
            <p>${esc(it.text)}</p>
            <div class="chips">${(it.chips || []).map((c) => `<span>${esc(c)}</span>`).join("")}</div>
          </article>`
          )
          .join("")}
      </div>
    </section>`,

  marketing: (s) => {
    const kpis = s.kpis || [];
    const kpi = (k, big) => `
      <div>
        <small>${esc(k.label)}</small>
        <strong>${esc(k.prefix)}<span class="counter" data-to="${Number(k.value) || 0}" data-decimals="${Number(k.decimals) || 0}">0</span>${esc(k.suffix)}</strong>
        ${big && k.change ? `<em class="up">${esc(k.change)}</em>` : ""}
      </div>`;
    return `
    <section class="section split" id="${esc(s.id)}"${planetAttr("marketing")}>
      <div class="split__text">
        ${head(s).replace('<div class="section__head">', "<div>")}
        <div class="feature-list">
          ${(s.features || [])
            .map(
              (f) => `
            <div class="feature reveal">
              <span class="feature__icon">${esc(f.icon)}</span>
              <div><h4>${esc(f.title)}</h4><p>${esc(f.text)}</p></div>
            </div>`
            )
            .join("")}
        </div>
      </div>
      <div class="split__visual reveal">
        <div class="dash glass">
          <div class="dash__head"><span class="dash__dots"><i></i><i></i><i></i></span><span>${esc(s.dashboardTitle)}</span></div>
          <div class="dash__kpis">${kpis.slice(0, 3).map((k) => kpi(k, true)).join("")}</div>
          ${kpis.length > 3 ? `<div class="dash__kpis dash__kpis--sub">${kpis.slice(3, 6).map((k) => kpi(k, false)).join("")}</div>` : ""}
          <svg class="dash__chart" viewBox="0 0 400 160" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#2563eb" stop-opacity=".28" />
                <stop offset="1" stop-color="#2563eb" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path class="chart-area" d="M0 140 C40 130 60 120 90 110 S150 95 180 80 S240 70 270 50 S340 30 400 12 L400 160 L0 160 Z" fill="url(#chartFill)" />
            <path class="chart-line" d="M0 140 C40 130 60 120 90 110 S150 95 180 80 S240 70 270 50 S340 30 400 12" fill="none" stroke="url(#brandGrad)" stroke-width="3" />
          </svg>
          ${s.growthLabel ? `<div class="dash__chart-legend"><span>${esc(s.growthLabel)}</span><b>${esc(s.growthValue)}</b></div>` : ""}
          <div class="dash__bars">
            <span style="--h: 35%"></span><span style="--h: 52%"></span><span style="--h: 44%"></span>
            <span style="--h: 68%"></span><span style="--h: 60%"></span><span style="--h: 82%"></span>
            <span style="--h: 74%"></span><span style="--h: 95%"></span>
          </div>
          ${s.note ? `<p class="dash__note">${esc(s.note)}</p>` : ""}
        </div>
      </div>
    </section>`;
  },

  webdev: (s) => `
    <section class="section split split--reverse" id="${esc(s.id)}"${planetAttr("webdev")}>
      <div class="split__visual reveal">
        ${
          s.image
            ? `<img class="split__image" src="${esc(safeUrl(s.image, ""))}" alt="" loading="lazy" />`
            : `<div class="code">
          <div class="dash__head"><span class="dash__dots"><i></i><i></i><i></i></span><span>skyitempire.dev</span></div>
<pre><code><span class="k">const</span> <span class="v">website</span> = <span class="f">build</span>({
  design:      <span class="s">"ultra-premium"</span>,
  experience:  [<span class="s">"3D"</span>, <span class="s">"motion"</span>, <span class="s">"responsive"</span>],
  performance: <span class="s">"lightning-fast"</span>,
  seo:         <span class="n">true</span>,
  goal:        <span class="s">"conversions"</span>,
});

<span class="v">website</span>.<span class="f">launch</span>(); <span class="c">// 🚀 your empire is live</span><span class="caret"></span></code></pre>
        </div>`
        }
      </div>
      <div class="split__text">
        ${head(s).replace('<div class="section__head">', "<div>")}
        <div class="stack reveal">${(s.stack || []).map((t) => `<span>${esc(t)}</span>`).join("")}</div>
        ${s.ctaLabel ? `<a href="#contact" class="btn btn--primary magnetic reveal">${esc(s.ctaLabel)} <span class="arrow">→</span></a>` : ""}
      </div>
    </section>`,

  whyus: (s) => `
    <section class="section" id="${esc(s.id)}"${planetAttr("whyus")}>
      ${head(s)}
      <div class="bento">
        ${(s.items || [])
          .map(
            (it) => `
          <article class="bento__item${it.wide ? " bento__item--wide" : ""}${it.accent ? " bento__item--accent" : ""} reveal">
            <span class="bento__icon">${esc(it.icon)}</span>
            <h3>${esc(it.title)}</h3>
            <p>${esc(it.text)}</p>
          </article>`
          )
          .join("")}
      </div>
    </section>`,

  process: (s) => `
    <section class="section" id="${esc(s.id)}"${planetAttr("process")}>
      ${head(s)}
      <ol class="process">
        ${(s.steps || [])
          .map(
            (st, i) => `
          <li class="step reveal">
            <span class="step__num">${String(i + 1).padStart(2, "0")}</span>
            <h3>${esc(st.title)}</h3>
            <p>${esc(st.text)}</p>
          </li>`
          )
          .join("")}
      </ol>
    </section>`,

  stats: (s) => `
    <section class="section section--stats" id="${esc(s.id)}">
      <div class="why glass reveal">
        ${(s.items || [])
          .map(
            (it) => `
          <div class="why__item">
            <strong><span class="counter" data-to="${Number(it.value) || 0}">0</span>${esc(it.suffix)}</strong>
            <span>${esc(it.label)}</span>
          </div>`
          )
          .join("")}
      </div>
    </section>`,

  packages: (s) => `
    <section class="section" id="${esc(s.id)}"${planetAttr("packages")}>
      ${head(s, true)}
      <div class="plans">
        ${(s.plans || [])
          .map((p) => {
            const style = ["popular", "vip"].includes(p.style) ? p.style : "normal";
            const btn = style === "vip" ? "btn--gold" : style === "popular" ? "btn--primary" : "btn--ghost";
            return `
          <article class="plan${style !== "normal" ? ` plan--${style}` : ""} tilt reveal">
            ${p.tag ? `<span class="plan__tag${style === "vip" ? " plan__tag--gold" : ""}">${esc(p.tag)}</span>` : ""}
            <h3>${esc(p.name)}</h3>
            <p class="plan__desc">${esc(p.desc)}</p>
            <p class="plan__price">${esc(p.price)}</p>
            <ul>${(p.features || []).map((f) => `<li>${check}${esc(f)}</li>`).join("")}</ul>
            <a href="#contact" class="btn ${btn} btn--block magnetic" data-plan="${esc(p.name)}">${esc(p.cta || "Get a quote")}</a>
          </article>`;
          })
          .join("")}
      </div>
    </section>`,

  testimonials: (s) => {
    const items = s.items || [];
    const card = (t) => {
      const initials = String(t.name || "?")
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
      const rating = Math.max(0, Math.min(5, Number(t.rating) || 0));
      return `
        <figure class="review">
          <div class="review__stars" aria-label="${rating} out of 5 stars">${star.repeat(rating)}</div>
          <blockquote>"${esc(t.text)}"</blockquote>
          <figcaption>
            ${t.photo ? `<img class="review__avatar review__avatar--img" src="${esc(safeUrl(t.photo, ""))}" alt="" loading="lazy" />` : `<span class="review__avatar">${esc(initials)}</span>`}
            <span><strong>${esc(t.name)}</strong><small>${esc(t.role)}</small></span>
          </figcaption>
        </figure>`;
    };
    const half = Math.ceil(items.length / 2);
    const rows = items.length > 3 ? [items.slice(0, half), items.slice(half)] : [items];
    return `
    <section class="section section--full" id="${esc(s.id)}"${planetAttr("testimonials")}>
      ${head(s, true)}
      <div class="reviews">
        ${rows
          .map((r, i) => `<div class="reviews__row${i === 1 ? " reviews__row--reverse" : ""}"><div class="reviews__track">${r.map(card).join("")}</div></div>`)
          .join("")}
      </div>
    </section>`;
  },

  faq: (s) => `
    <section class="section faq-wrap" id="${esc(s.id)}"${planetAttr("faq")}>
      <div class="faq-wrap__head">
        ${s.eyebrow ? `<p class="eyebrow reveal"><span class="dot"></span> ${esc(s.eyebrow)}</p>` : ""}
        <h2 class="section__title reveal">${rich(s.title)}</h2>
        ${s.lead ? `<p class="section__lead reveal">${esc(s.lead)} <a href="#contact" class="text-link">Contact us</a></p>` : ""}
      </div>
      <div class="faq">
        ${(s.items || [])
          .map((f, i) => `<details class="faq__item reveal"${i === 0 ? " open" : ""}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
          .join("")}
      </div>
    </section>`,

  contact: (s, site) => `
    <section class="section" id="${esc(s.id)}"${planetAttr("contact")}>
      <div class="contact glass">
        <div class="contact__text">
          ${s.eyebrow ? `<p class="eyebrow reveal"><span class="dot"></span> ${esc(s.eyebrow)}</p>` : ""}
          <h2 class="section__title reveal">${rich(s.title)}</h2>
          ${s.lead ? `<p class="section__lead reveal">${esc(s.lead)}</p>` : ""}
          <ul class="contact__info reveal">
            ${site.email ? `<li><span>✉</span><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : ""}
            ${site.hours ? `<li><span>◷</span>${esc(site.hours)}</li>` : ""}
            ${site.location ? `<li><span>⌖</span>${esc(site.location)}</li>` : ""}
          </ul>
        </div>
        <form class="form reveal" id="contactForm" novalidate>
          <div class="form__row">
            <label class="field"><input type="text" name="name" required placeholder=" " autocomplete="name" /><span>Your name</span></label>
            <label class="field"><input type="email" name="email" required placeholder=" " autocomplete="email" /><span>Email address</span></label>
          </div>
          <label class="field">
            <select name="service" id="serviceSelect" required>
              <option value="" disabled selected hidden></option>
              ${(s.services || []).map((o) => `<option>${esc(o)}</option>`).join("")}
            </select>
            <span>Service you need</span>
          </label>
          <label class="field"><textarea name="message" rows="4" required placeholder=" "></textarea><span>Tell us about your project</span></label>
          <button type="submit" class="btn btn--primary btn--lg btn--block magnetic">${esc(s.submitLabel || "Send Message")} <span class="arrow">→</span></button>
          <p class="form__status" id="formStatus" role="status"></p>
        </form>
      </div>
    </section>`,
};

/* ---------------------------------------------------------------- */
/* Footer                                                             */
/* ---------------------------------------------------------------- */
function renderFooter(content) {
  const { site, footer } = content;
  const sections = content.sections.filter((s) => s.visible !== false);
  const has = (id) => sections.some((s) => s.id === id);
  const market = sections.find((s) => s.type === "marketplaces");
  const brandHtml = `${esc(site.brandPrefix)}<span class="gold">${esc(site.brandHighlight)}</span>${esc(site.brandSuffix)}`;
  const serviceLinks = [
    ["services", "E-commerce Services"],
    ["marketing", "Digital Marketing"],
    ["webdev", "Web Development"],
    ["packages", "Packages"],
    ["faq", "FAQ"],
  ].filter(([id]) => has(id));
  return `
    <div class="vip-footer__glow" aria-hidden="true"></div>
    <div class="vip-footer__cta">
      <div>
        <p class="vip-footer__kicker"><svg viewBox="0 0 64 64"><use href="#logo-mark-gold" /></svg> ${esc(footer.kicker)}</p>
        <h2>${rich(footer.title, "gold")}</h2>
      </div>
      <a href="#contact" class="btn btn--gold btn--lg magnetic">${esc(footer.ctaLabel)} <span class="arrow">→</span></a>
    </div>
    <div class="vip-footer__grid">
      <div class="vip-footer__brand">
        <a href="#top" class="brand">
          ${site.logo ? `<img class="brand__logo" src="${esc(safeUrl(site.logo, ""))}" alt="" />` : '<svg class="brand__mark" viewBox="0 0 64 64"><use href="#logo-mark-gold" /></svg>'}
          <span class="brand__name">${brandHtml}</span>
        </a>
        <p>${esc(footer.about)}</p>
        <div class="socials">
          ${(footer.socials || [])
            .map((so) => `<a href="${esc(safeUrl(so.url))}" aria-label="${esc(so.network)}" data-social="${esc(so.network)}" target="_blank" rel="noopener"></a>`)
            .join("")}
        </div>
      </div>
      <nav class="vip-footer__col" aria-label="Services">
        <h4>Services</h4>
        ${serviceLinks.map(([id, label]) => `<a href="#${id}">${label}</a>`).join("")}
      </nav>
      <nav class="vip-footer__col" aria-label="Marketplaces">
        <h4>Marketplaces</h4>
        ${(market?.items || []).map((m) => `<a href="#${esc(market.id)}">${esc(m.name)}</a>`).join("")}
      </nav>
      <div class="vip-footer__col vip-footer__news">
        <h4>${esc(footer.newsletterTitle)}</h4>
        <p>${esc(footer.newsletterText)}</p>
        <form class="newsletter" id="newsletter" novalidate>
          <input type="email" name="email" placeholder="Your email address" aria-label="Email address" required />
          <button type="submit" aria-label="Subscribe">→</button>
        </form>
        <p class="newsletter__status" id="newsletterStatus" role="status"></p>
        <ul class="vip-footer__contact">
          ${site.email ? `<li><span>✉</span><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>` : ""}
          ${site.location ? `<li><span>⌖</span>${esc(site.location)}</li>` : ""}
        </ul>
      </div>
    </div>
    <div class="vip-footer__wordmark" aria-hidden="true">${esc(footer.wordmark)}</div>
    <div class="vip-footer__bottom">
      <p>© ${new Date().getFullYear()} ${esc(site.brandPrefix + site.brandHighlight + site.brandSuffix)}. All rights reserved.</p>
      <p class="vip-footer__tm">${esc(footer.trademark)}</p>
      <a href="#top" class="to-top" aria-label="Back to top">↑</a>
    </div>`;
}

/* ---------------------------------------------------------------- */
/* Public API                                                         */
/* ---------------------------------------------------------------- */
export function renderSite(content) {
  const { site } = content;
  const visible = content.sections.filter((s) => s.visible !== false && T[s.type]);

  document.getElementById("top").innerHTML = visible.map((s) => T[s.type](s, site)).join("");
  document.getElementById("footer").innerHTML = renderFooter(content);

  // Brand + nav
  const brandName = `${esc(site.brandPrefix)}<span class="grad">${esc(site.brandHighlight)}</span>${esc(site.brandSuffix)}`;
  document.querySelectorAll(".nav .brand__name").forEach((el) => (el.innerHTML = brandName));
  if (site.logo) {
    document.querySelectorAll(".nav .brand__mark").forEach((el) => {
      const img = document.createElement("img");
      img.className = "brand__logo";
      img.alt = "";
      img.src = safeUrl(site.logo, "");
      el.replaceWith(img);
    });
  }
  const links = visible.filter((s) => s.navLabel).map((s) => `<a href="#${esc(s.id)}">${esc(s.navLabel)}</a>`);
  links.push(`<a href="#contact" class="btn btn--sm btn--primary magnetic">${esc(site.navCta || "Contact")}</a>`);
  document.getElementById("navLinks").innerHTML = links.join("");

  if (site.seoTitle) document.title = site.seoTitle;
  if (site.seoDescription) document.querySelector('meta[name="description"]')?.setAttribute("content", site.seoDescription);
}
