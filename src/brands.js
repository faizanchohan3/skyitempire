import { siEbay, siEtsy, siTiktok, siFacebook } from "simple-icons";
import { AMAZON, TEMU } from "./brand-logos.js";

// Brand marks for the marketplaces we manage.
// eBay, Etsy, TikTok and Facebook come from Simple Icons (CC0 SVG paths);
// Amazon and Temu from Wikimedia Commons (see brand-logos.js).
export const BRANDS = {
  amazon: { name: "Amazon", color: "#ff9900", path: AMAZON.path, viewBox: AMAZON.viewBox, fillRule: "evenodd" },
  ebay: { name: "eBay", color: "#3665f3", path: siEbay.path },
  etsy: { name: "Etsy", color: "#f1641e", path: siEtsy.path },
  temu: { name: "Temu", color: "#fb7701", path: TEMU.path, viewBox: TEMU.viewBox },
  tiktok: { name: "TikTok Shop", color: "#25f4ee", path: siTiktok.path },
  facebook: { name: "Facebook Shop", color: "#1877f2", path: siFacebook.path },
};

// Returns an element with the brand's logo (or letter fallback).
export function brandIcon(key, className = "brand-icon") {
  const b = BRANDS[key];
  const wrap = document.createElement("span");
  wrap.className = className;
  wrap.dataset.brand = key;
  if (b.path) {
    wrap.innerHTML = `<svg viewBox="${b.viewBox || "0 0 24 24"}" aria-hidden="true"><path d="${b.path}" fill="currentColor" fill-rule="${b.fillRule || "nonzero"}"/></svg>`;
  } else {
    const letter = document.createElement("b");
    letter.textContent = b.letter;
    wrap.appendChild(letter);
    const img = new Image();
    img.alt = "";
    img.src = b.file;
    img.onload = () => wrap.replaceChildren(img);
  }
  return wrap;
}
