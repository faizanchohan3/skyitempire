import defaults, { cloneDefaults } from "./defaults.js";

export const PREVIEW_KEY = "sky-preview";

// Fill in anything missing (e.g. new settings added after content was saved).
export function normalizeContent(c) {
  const base = cloneDefaults();
  if (!c || typeof c !== "object") return base;
  return {
    site: { ...base.site, ...(c.site || {}) },
    footer: { ...base.footer, ...(c.footer || {}) },
    sections: Array.isArray(c.sections) && c.sections.length ? c.sections : base.sections,
  };
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

// Order: admin preview draft -> Supabase -> built-in defaults.
export async function loadContent() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("preview")) {
    try {
      const draft = localStorage.getItem(PREVIEW_KEY);
      if (draft) return normalizeContent(JSON.parse(draft));
    } catch (e) {
      /* fall through */
    }
  }

  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    try {
      const { getSupabase, CONTENT_TABLE, CONTENT_ID } = await import("../supabase.js");
      const { data, error } = await withTimeout(
        getSupabase().from(CONTENT_TABLE).select("data").eq("id", CONTENT_ID).maybeSingle(),
        5000
      );
      if (error) throw error;
      if (data?.data) return normalizeContent(data.data);
    } catch (err) {
      console.warn("Could not load saved content, using defaults.", err);
    }
  }
  return normalizeContent(defaults);
}
