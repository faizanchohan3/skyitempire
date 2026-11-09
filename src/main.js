import "./style.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { brandIcon } from "./brands.js";

gsap.registerPlugin(ScrollTrigger);

document.documentElement.classList.add("js");
document.body.classList.add("is-loading");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---------------- Loader + 3D scene ---------------- */
const loader = document.getElementById("loader");
const loaderBar = document.getElementById("loaderBar");
const setProgress = (p) => (loaderBar.style.width = `${Math.round(p * 100)}%`);

async function boot() {
  setProgress(0.1);
  try {
    const { initScene } = await import("./scene.js");
    initScene(document.getElementById("webgl"), { onProgress: setProgress });
  } catch (err) {
    console.warn("WebGL unavailable, using fallback background.", err);
    document.body.classList.add("no-webgl");
  }
  setProgress(1);
  setTimeout(() => {
    loader.classList.add("is-done");
    document.body.classList.remove("is-loading");
    heroIntro();
  }, 450);
}

/* ---------------- Hero intro ---------------- */
function heroIntro() {
  const items = gsap.utils.toArray(".reveal-hero");
  if (reducedMotion) {
    gsap.set(items, { opacity: 1 });
    return;
  }
  gsap.fromTo(
    items,
    { opacity: 0, yPercent: 60, filter: "blur(8px)" },
    { opacity: 1, yPercent: 0, filter: "blur(0px)", duration: 1.3, ease: "expo.out", stagger: 0.08 }
  );
  gsap.from(".nav", { opacity: 0, y: -20, duration: 1, ease: "expo.out", delay: 0.2 });
}

/* ---------------- Scroll reveals ---------------- */
function setupReveals() {
  gsap.utils.toArray(".reveal").forEach((el) => {
    if (reducedMotion) {
      gsap.set(el, { opacity: 1 });
      return;
    }
    gsap.fromTo(
      el,
      { opacity: 0, y: 60, rotateX: 8, transformPerspective: 900 },
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        duration: 1.2,
        ease: "expo.out",
        clearProps: "transform",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      }
    );
  });

  // Stagger groups (cards)
  [".services", ".platforms", ".process", ".feature-list"].forEach((sel) => {
    const parent = document.querySelector(sel);
    if (!parent || reducedMotion) return;
    ScrollTrigger.create({
      trigger: parent,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.fromTo(
          parent.querySelectorAll(".reveal"),
          { opacity: 0, y: 80, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: "expo.out", stagger: 0.1, clearProps: "transform", overwrite: true }
        );
      },
    });
  });

  // Hero content parallax out
  if (!reducedMotion) {
    gsap.to(".hero__content", {
      yPercent: -18,
      opacity: 0.15,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
    });
  }

  // Dashboard chart draw
  const line = document.querySelector(".chart-line");
  if (line) {
    ScrollTrigger.create({
      trigger: ".dash",
      start: "top 80%",
      once: true,
      onEnter: () => {
        gsap.to(line, { strokeDashoffset: 0, duration: 2.2, ease: "power3.out" });
        gsap.from(".dash__bars span", { scaleY: 0, duration: 1.2, ease: "expo.out", stagger: 0.06 });
        gsap.from(".chart-area", { opacity: 0, duration: 1.6, delay: 0.4 });
      },
    });
  }

  // Counters
  gsap.utils.toArray(".counter").forEach((el) => {
    const to = Number(el.dataset.to);
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () =>
        gsap.to(obj, {
          v: to,
          duration: reducedMotion ? 0 : 2,
          ease: "power3.out",
          onUpdate: () => (el.textContent = Math.round(obj.v)),
        }),
    });
  });
}

/* ---------------- Nav ---------------- */
function setupNav() {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("navToggle");
  const progress = document.getElementById("scrollProgress");

  const onScroll = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 30);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const close = () => {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open menu");
  };
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  document.querySelectorAll("#navLinks a").forEach((a) => a.addEventListener("click", close));
  window.addEventListener("keydown", (e) => e.key === "Escape" && close());
}

/* ---------------- Pointer effects ---------------- */
function setupPointer() {
  if (!finePointer || reducedMotion) return;

  // Cursor glow
  const glow = document.getElementById("cursorGlow");
  const gx = gsap.quickTo(glow, "x", { duration: 0.8, ease: "power3" });
  const gy = gsap.quickTo(glow, "y", { duration: 0.8, ease: "power3" });
  window.addEventListener("pointermove", (e) => {
    gx(e.clientX);
    gy(e.clientY);
  });

  // Magnetic buttons
  document.querySelectorAll(".magnetic").forEach((btn) => {
    const xTo = gsap.quickTo(btn, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(btn, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.3);
      yTo((e.clientY - r.top - r.height / 2) * 0.4);
    });
    btn.addEventListener("pointerleave", () => {
      xTo(0);
      yTo(0);
    });
  });

  // 3D tilt cards
  document.querySelectorAll(".tilt").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * 10}deg) rotateY(${(px - 0.5) * 12}deg) translateZ(0)`;
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

/* ---------------- Marketplace logos ---------------- */
document.querySelectorAll(".platform__badge[data-brand]").forEach((el) => {
  el.appendChild(brandIcon(el.dataset.brand));
});

/* ---------------- Accent colours ---------------- */
document.querySelectorAll("[data-accent]").forEach((el) => el.style.setProperty("--accent", el.dataset.accent));

/* ---------------- Contact form ---------------- */
function setupForm() {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let valid = true;
    form.querySelectorAll("[required]").forEach((input) => {
      const ok = input.checkValidity();
      input.closest(".field").classList.toggle("is-invalid", !ok);
      if (!ok) valid = false;
    });
    if (!valid) {
      status.textContent = "Please fill in all fields with a valid email.";
      status.classList.add("is-error");
      return;
    }
    const data = new FormData(form);
    const subject = `New enquiry: ${data.get("service")} — ${data.get("name")}`;
    const body = `Name: ${data.get("name")}\nEmail: ${data.get("email")}\nService: ${data.get("service")}\n\n${data.get("message")}`;
    window.location.href = `mailto:hello@skyitempire.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.classList.remove("is-error");
    status.textContent = "Opening your email app. We'll reply within 24 hours.";
    form.reset();
  });
  form.querySelectorAll("input, select, textarea").forEach((el) =>
    el.addEventListener("input", () => el.closest(".field").classList.remove("is-invalid"))
  );
}

document.getElementById("year").textContent = new Date().getFullYear();

setupNav();
setupPointer();
setupReveals();
setupForm();
boot();
