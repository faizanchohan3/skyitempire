import { siEbay, siEtsy, siTiktok, siFacebook } from "simple-icons";

// Brand marks for the marketplaces we manage.
// eBay, Etsy, TikTok and Facebook come from Simple Icons (CC0 SVG paths).
// Amazon and Temu are not in Simple Icons: drop their official logo files at
// public/logos/amazon.svg and public/logos/temu.svg (PNG also works if you
// change the extension below) and they are picked up automatically.
// Until then a letter badge is shown.
export const BRANDS = {
  amazon: { name: "Amazon", color: "#ff9900", file: "/logos/amazon.svg", letter: "a" },
  ebay: { name: "eBay", color: "#3665f3", path: siEbay.path },
  etsy: { name: "Etsy", color: "#f1641e", path: siEtsy.path },
  temu: { name: "Temu", color: "#fb7701", file: "/logos/temu.svg", letter: "T" },
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
    wrap.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${b.path}" fill="currentColor"/></svg>`;
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
