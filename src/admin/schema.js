// Describes which fields the admin panel shows for every part of the site.
// Field types: text, textarea, number, color, checkbox, image, select,
// lines (one value per line -> array of strings), array (list of objects).
import { ICON_NAMES } from "../render.js";

const HL = "Wrap words in *asterisks* for the gradient highlight.";

const head = (extra = []) => [
  { key: "navLabel", label: "Menu label", type: "text", help: "Shown in the top menu. Leave empty to hide from the menu." },
  { key: "eyebrow", label: "Small label above title", type: "text" },
  { key: "title", label: "Title", type: "text", help: HL },
  { key: "lead", label: "Intro text", type: "textarea" },
  ...extra,
];

const BRANDS = [
  ["amazon", "Amazon"],
  ["ebay", "eBay"],
  ["etsy", "Etsy"],
  ["temu", "Temu"],
  ["tiktok", "TikTok"],
  ["facebook", "Facebook"],
  ["", "None (use uploaded image)"],
];

export const SECTION_LABELS = {
  hero: "Hero (top banner)",
  marquee: "Scrolling ticker",
  services: "Services",
  marketplaces: "Marketplaces",
  marketing: "Digital marketing",
  webdev: "Web development",
  whyus: "Why us",
  process: "Process steps",
  stats: "Stats / counters",
  packages: "Packages / pricing",
  testimonials: "Testimonials",
  faq: "FAQ",
  contact: "Contact form",
};

export const SECTION_ICONS = {
  hero: "🏠",
  marquee: "〰️",
  services: "🧩",
  marketplaces: "🛒",
  marketing: "📈",
  webdev: "💻",
  whyus: "👑",
  process: "🪜",
  stats: "🔢",
  packages: "💎",
  testimonials: "⭐",
  faq: "❓",
  contact: "✉️",
};

export const SCHEMAS = {
  hero: [
    { key: "eyebrow", label: "Small label above title", type: "text" },
    { key: "lines", label: "Headline (one line per row)", type: "lines", help: HL },
    { key: "text", label: "Intro text", type: "textarea" },
    { key: "primaryCta", label: "Main button text", type: "text" },
    { key: "secondaryCta", label: "Second button text", type: "text" },
    {
      key: "badges",
      label: "Highlights under buttons",
      type: "array",
      itemLabel: (i) => `${i.value} ${i.label}`,
      newItem: { value: "", label: "" },
      fields: [
        { key: "value", label: "Big value", type: "text" },
        { key: "label", label: "Label", type: "text" },
      ],
    },
  ],

  marquee: [{ key: "items", label: "Ticker words (one per line)", type: "lines" }],

  services: head([
    {
      key: "items",
      label: "Service cards",
      type: "array",
      itemLabel: (i) => i.title,
      newItem: { icon: "star", color: "#2563eb", title: "New service", text: "", points: [], linkLabel: "", linkTarget: "contact" },
      fields: [
        { key: "title", label: "Title", type: "text" },
        { key: "text", label: "Description", type: "textarea" },
        { key: "icon", label: "Icon", type: "select", options: ICON_NAMES.map((n) => [n, n]) },
        { key: "color", label: "Accent colour", type: "color" },
        { key: "points", label: "Bullet points (one per line)", type: "lines" },
        { key: "linkLabel", label: "Link text", type: "text" },
        { key: "linkTarget", label: "Link goes to section (id)", type: "text", help: "e.g. marketplaces, marketing, contact" },
      ],
    },
  ]),

  marketplaces: head([
    {
      key: "items",
      label: "Marketplace cards",
      type: "array",
      itemLabel: (i) => i.name,
      newItem: { brand: "", name: "New marketplace", color: "#2563eb", image: "", text: "", chips: [] },
      fields: [
        { key: "name", label: "Name", type: "text" },
        { key: "brand", label: "Built-in logo", type: "select", options: BRANDS },
        { key: "image", label: "Custom logo image (overrides built-in)", type: "image" },
        { key: "color", label: "Brand colour", type: "color" },
        { key: "text", label: "Description", type: "textarea" },
        { key: "chips", label: "Tags (one per line)", type: "lines" },
      ],
    },
  ]),

  marketing: head([
    {
      key: "features",
      label: "Feature boxes",
      type: "array",
      itemLabel: (i) => i.title,
      newItem: { icon: "★", title: "New feature", text: "" },
      fields: [
        { key: "icon", label: "Icon (emoji or symbol)", type: "text" },
        { key: "title", label: "Title", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
      ],
    },
    { key: "dashboardTitle", label: "Dashboard title", type: "text" },
    {
      key: "kpis",
      label: "Dashboard values (first 3 big, next 3 small)",
      type: "array",
      itemLabel: (i) => `${i.label}: ${i.prefix || ""}${i.value}${i.suffix || ""}`,
      newItem: { label: "Metric", prefix: "", value: 0, decimals: 0, suffix: "", change: "" },
      fields: [
        { key: "label", label: "Label", type: "text" },
        { key: "value", label: "Value", type: "number" },
        { key: "decimals", label: "Decimal places", type: "number" },
        { key: "prefix", label: "Before value (e.g. $)", type: "text" },
        { key: "suffix", label: "After value (e.g. %, M, x)", type: "text" },
        { key: "change", label: "Change badge (e.g. ▲ 38%)", type: "text" },
      ],
    },
    { key: "growthLabel", label: "Chart label", type: "text" },
    { key: "growthValue", label: "Chart value", type: "text" },
    { key: "note", label: "Small note under dashboard", type: "text" },
  ]),

  webdev: head([
    { key: "stack", label: "Technologies (one per line)", type: "lines" },
    { key: "ctaLabel", label: "Button text", type: "text" },
    { key: "image", label: "Image (replaces the code window)", type: "image" },
  ]),

  whyus: head([
    {
      key: "items",
      label: "Boxes",
      type: "array",
      itemLabel: (i) => i.title,
      newItem: { icon: "✨", title: "New reason", text: "", wide: false, accent: false },
      fields: [
        { key: "icon", label: "Icon (emoji)", type: "text" },
        { key: "title", label: "Title", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
        { key: "wide", label: "Wide box (2 columns)", type: "checkbox" },
        { key: "accent", label: "Coloured highlight box", type: "checkbox" },
      ],
    },
  ]),

  process: head([
    {
      key: "steps",
      label: "Steps",
      type: "array",
      itemLabel: (i) => i.title,
      newItem: { title: "New step", text: "" },
      fields: [
        { key: "title", label: "Title", type: "text" },
        { key: "text", label: "Text", type: "textarea" },
      ],
    },
  ]).filter((f) => f.key !== "lead"),

  stats: [
    {
      key: "items",
      label: "Counters",
      type: "array",
      itemLabel: (i) => `${i.value}${i.suffix || ""} ${i.label}`,
      newItem: { value: 0, suffix: "", label: "New stat" },
      fields: [
        { key: "value", label: "Number", type: "number" },
        { key: "suffix", label: "After number (e.g. +, %, /7)", type: "text" },
        { key: "label", label: "Label", type: "text" },
      ],
    },
  ],

  packages: head([
    {
      key: "plans",
      label: "Plans",
      type: "array",
      itemLabel: (i) => i.name,
      newItem: { name: "New plan", desc: "", price: "Custom quote", style: "normal", tag: "", features: [], cta: "Get a quote" },
      fields: [
        { key: "name", label: "Plan name", type: "text" },
        { key: "desc", label: "Short description", type: "text" },
        { key: "price", label: "Price text", type: "text", help: "e.g. $499/mo or Custom quote" },
        { key: "style", label: "Style", type: "select", options: [["normal", "Normal"], ["popular", "Popular (gradient border)"], ["vip", "VIP (dark & gold)"]] },
        { key: "tag", label: "Badge (e.g. Most popular)", type: "text" },
        { key: "features", label: "Features (one per line)", type: "lines" },
        { key: "cta", label: "Button text", type: "text" },
      ],
    },
  ]),

  testimonials: head([
    {
      key: "items",
      label: "Reviews",
      type: "array",
      itemLabel: (i) => `${i.name} · ${i.role}`,
      newItem: { name: "", role: "", rating: 5, photo: "", text: "" },
      fields: [
        { key: "name", label: "Client name", type: "text" },
        { key: "role", label: "Role / company", type: "text" },
        { key: "rating", label: "Stars (0–5)", type: "number", min: 0, max: 5 },
        { key: "photo", label: "Photo", type: "image" },
        { key: "text", label: "Review text", type: "textarea" },
      ],
    },
  ]).filter((f) => f.key !== "lead"),

  faq: head([
    {
      key: "items",
      label: "Questions",
      type: "array",
      itemLabel: (i) => i.q,
      newItem: { q: "New question?", a: "" },
      fields: [
        { key: "q", label: "Question", type: "text" },
        { key: "a", label: "Answer", type: "textarea" },
      ],
    },
  ]),

  contact: head([
    { key: "services", label: "Options in the service dropdown (one per line)", type: "lines" },
    { key: "submitLabel", label: "Send button text", type: "text" },
  ]),
};

export const SITE_SCHEMA = [
  { key: "brandPrefix", label: "Brand name: first part", type: "text" },
  { key: "brandHighlight", label: "Brand name: highlighted part", type: "text" },
  { key: "brandSuffix", label: "Brand name: last part", type: "text" },
  { key: "logo", label: "Logo image (replaces the crown)", type: "image" },
  { key: "emblemTagline", label: "Text under the name on the 3D globe", type: "text" },
  { key: "email", label: "Contact email", type: "text", help: "Contact form and newsletter messages go here." },
  { key: "hours", label: "Working hours", type: "text" },
  { key: "location", label: "Location line", type: "text" },
  { key: "navCta", label: "Menu button text", type: "text" },
  { key: "seoTitle", label: "Browser tab / Google title", type: "text" },
  { key: "seoDescription", label: "Google description", type: "textarea" },
];

export const FOOTER_SCHEMA = [
  { key: "kicker", label: "Small gold label", type: "text" },
  { key: "title", label: "Big title", type: "text", help: "Wrap words in *asterisks* for gold." },
  { key: "ctaLabel", label: "Button text", type: "text" },
  { key: "about", label: "About text", type: "textarea" },
  { key: "newsletterTitle", label: "Newsletter title", type: "text" },
  { key: "newsletterText", label: "Newsletter text", type: "textarea" },
  { key: "wordmark", label: "Giant background word", type: "text" },
  { key: "trademark", label: "Trademark note", type: "textarea" },
  {
    key: "socials",
    label: "Social links",
    type: "array",
    itemLabel: (i) => `${i.network}: ${i.url}`,
    newItem: { network: "facebook", url: "https://" },
    fields: [
      {
        key: "network",
        label: "Network",
        type: "select",
        options: [["facebook", "Facebook"], ["instagram", "Instagram"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["x", "X (Twitter)"], ["whatsapp", "WhatsApp"]],
      },
      { key: "url", label: "Link (https://…)", type: "text", help: "For WhatsApp use https://wa.me/yournumber" },
    ],
  },
];
