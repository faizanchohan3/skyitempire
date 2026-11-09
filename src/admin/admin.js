import "./admin.css";
import { getSupabase, isConfigured, CONTENT_TABLE, CONTENT_ID, MEDIA_BUCKET } from "../supabase.js";
import defaults, { cloneDefaults, SECTION_TYPES } from "../content/defaults.js";
import { normalizeContent, PREVIEW_KEY } from "../content/load.js";
import { SCHEMAS, SITE_SCHEMA, FOOTER_SCHEMA, SECTION_LABELS, SECTION_ICONS } from "./schema.js";

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) node.append(c.nodeType ? c : String(c));
  return node;
};

const sb = getSupabase();
const demoMode = !isConfigured();

let content = null; // working copy
let savedJson = ""; // last saved state, for the "unsaved changes" indicator
let selected = "site"; // "site" | "footer" | section index
const openItems = new Set(); // open array items, keyed by path

/* ------------------------------------------------------------ */
/* Helpers                                                       */
/* ------------------------------------------------------------ */
function toast(msg, kind = "ok") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = `toast is-on toast--${kind}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (t.className = "toast"), 3200);
}

function isDirty() {
  return JSON.stringify(content) !== savedJson;
}

function updateStatus() {
  const s = $("#status");
  if (isDirty()) {
    s.innerHTML = '<span class="dot dot--warn"></span> Unsaved changes';
  } else {
    s.innerHTML = '<span class="dot dot--ok"></span> All changes saved';
  }
}

let previewTimer;
function changed({ structural = false } = {}) {
  updateStatus();
  if (structural) renderSidebar();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(pushPreview, 500);
}

function pushPreview() {
  try {
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(content));
  } catch (e) {
    toast("Preview storage is full (try smaller images).", "error");
  }
}

function uniqueId(base) {
  const ids = new Set(content.sections.map((s) => s.id));
  if (!ids.has(base)) return base;
  let i = 2;
  while (ids.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/* ------------------------------------------------------------ */
/* Data                                                          */
/* ------------------------------------------------------------ */
async function loadFromServer() {
  if (demoMode) {
    let draft = null;
    try {
      draft = JSON.parse(localStorage.getItem("sky-admin-demo") || "null");
    } catch (e) {
      /* ignore */
    }
    content = normalizeContent(draft || defaults);
  } else {
    const { data, error } = await sb.from(CONTENT_TABLE).select("data").eq("id", CONTENT_ID).maybeSingle();
    if (error) {
      toast(`Could not load content: ${error.message}`, "error");
      content = cloneDefaults();
    } else {
      content = normalizeContent(data?.data || defaults);
    }
  }
  savedJson = JSON.stringify(content);
  pushPreview();
}

async function save() {
  const btn = $("#btnSave");
  btn.disabled = true;
  btn.textContent = "Saving…";
  try {
    if (demoMode) {
      localStorage.setItem("sky-admin-demo", JSON.stringify(content));
      toast("Saved in this browser (demo mode). Connect Supabase to publish for everyone.");
    } else {
      const { data: userData } = await sb.auth.getUser();
      const { error } = await sb
        .from(CONTENT_TABLE)
        .upsert({ id: CONTENT_ID, data: content, updated_at: new Date().toISOString(), updated_by: userData?.user?.email || null });
      if (error) throw error;
      toast("Published! Your website is updated.");
    }
    savedJson = JSON.stringify(content);
    updateStatus();
  } catch (err) {
    toast(`Save failed: ${err.message || err}`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "💾 Save & publish";
  }
}

async function uploadImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image is larger than 5 MB.");
  if (demoMode) {
    if (file.size > 600 * 1024) throw new Error("In demo mode images must be under 600 KB. Connect Supabase for bigger uploads.");
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (error) throw error;
  return sb.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/* ------------------------------------------------------------ */
/* Sidebar: sections list with drag & drop                        */
/* ------------------------------------------------------------ */
let dragIndex = null;

function renderSidebar() {
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("is-active", b.dataset.target === selected));
  const list = $("#sectionList");
  list.replaceChildren(
    ...content.sections.map((s, i) => {
      const li = el(
        "li",
        {
          class: `sec${selected === i ? " is-active" : ""}${s.visible === false ? " is-hidden" : ""}`,
          draggable: "true",
          ondragstart: (e) => {
            dragIndex = i;
            li.classList.add("is-dragging");
            e.dataTransfer.effectAllowed = "move";
          },
          ondragend: () => li.classList.remove("is-dragging"),
          ondragover: (e) => {
            e.preventDefault();
            li.classList.add("is-over");
          },
          ondragleave: () => li.classList.remove("is-over"),
          ondrop: (e) => {
            e.preventDefault();
            li.classList.remove("is-over");
            if (dragIndex === null || dragIndex === i) return;
            moveSection(dragIndex, i);
            dragIndex = null;
          },
        },
        el("span", { class: "sec__grip", "aria-hidden": "true" }, "⋮⋮"),
        el(
          "button",
          { class: "sec__name", onclick: () => select(i), title: `Edit ${SECTION_LABELS[s.type] || s.type}` },
          el("span", {}, SECTION_ICONS[s.type] || "▫️"),
          el("span", { class: "sec__label" }, s.navLabel || SECTION_LABELS[s.type] || s.type, el("small", {}, `#${s.id}`))
        ),
        el(
          "span",
          { class: "sec__tools" },
          el("button", { title: "Move up", "aria-label": "Move up", disabled: i === 0, onclick: () => moveSection(i, i - 1) }, "↑"),
          el("button", { title: "Move down", "aria-label": "Move down", disabled: i === content.sections.length - 1, onclick: () => moveSection(i, i + 1) }, "↓"),
          el(
            "button",
            {
              title: s.visible === false ? "Show on website" : "Hide from website",
              "aria-label": s.visible === false ? "Show section" : "Hide section",
              onclick: () => {
                s.visible = s.visible === false;
                changed({ structural: true });
              },
            },
            s.visible === false ? "🙈" : "👁"
          )
        )
      );
      return li;
    })
  );
}

function moveSection(from, to) {
  if (to < 0 || to >= content.sections.length) return;
  const [item] = content.sections.splice(from, 1);
  content.sections.splice(to, 0, item);
  if (selected === from) selected = to;
  else if (typeof selected === "number") {
    if (from < selected && to >= selected) selected--;
    else if (from > selected && to <= selected) selected++;
  }
  changed({ structural: true });
}

function select(target) {
  selected = target;
  renderSidebar();
  renderEditor();
}

/* ------------------------------------------------------------ */
/* Editor: forms generated from the schema                         */
/* ------------------------------------------------------------ */
function fieldRow(label, help, control, wide = false) {
  return el("div", { class: `field${wide ? " field--wide" : ""}` }, el("label", { class: "field__label" }, label), control, help ? el("p", { class: "field__help" }, help) : null);
}

function imageControl(obj, f) {
  const preview = el("div", { class: "img__preview" });
  const url = el("input", { type: "url", placeholder: "Paste an image URL or upload", value: obj[f.key] || "" });
  const file = el("input", { type: "file", accept: "image/*", hidden: true });
  const refresh = () => {
    preview.replaceChildren(obj[f.key] ? el("img", { src: obj[f.key], alt: "" }) : el("span", { class: "muted" }, "No image"));
  };
  url.addEventListener("input", () => {
    obj[f.key] = url.value.trim();
    refresh();
    changed();
  });
  file.addEventListener("change", async () => {
    const chosen = file.files?.[0];
    if (!chosen) return;
    upBtn.disabled = true;
    upBtn.textContent = "Uploading…";
    try {
      obj[f.key] = await uploadImage(chosen);
      url.value = obj[f.key].startsWith("data:") ? "(uploaded image)" : obj[f.key];
      refresh();
      changed();
      toast("Image uploaded");
    } catch (err) {
      toast(err.message || String(err), "error");
    } finally {
      upBtn.disabled = false;
      upBtn.textContent = "Upload";
      file.value = "";
    }
  });
  const upBtn = el("button", { class: "a-btn a-btn--sm", type: "button", onclick: () => file.click() }, "Upload");
  const clear = el(
    "button",
    {
      class: "a-btn a-btn--sm a-btn--ghost",
      type: "button",
      onclick: () => {
        obj[f.key] = "";
        url.value = "";
        refresh();
        changed();
      },
    },
    "Remove"
  );
  if ((obj[f.key] || "").startsWith("data:")) url.value = "(uploaded image)";
  refresh();
  return el("div", { class: "img" }, preview, el("div", { class: "img__controls" }, url, el("div", { class: "img__btns" }, upBtn, clear)), file);
}

function control(obj, f, path) {
  const v = obj[f.key];
  switch (f.type) {
    case "textarea": {
      const t = el("textarea", { rows: 3 });
      t.value = v ?? "";
      t.addEventListener("input", () => {
        obj[f.key] = t.value;
        changed();
      });
      return t;
    }
    case "number": {
      const n = el("input", { type: "number", step: "any", min: f.min, max: f.max, value: v ?? 0 });
      n.addEventListener("input", () => {
        obj[f.key] = n.value === "" ? 0 : Number(n.value);
        changed();
      });
      return n;
    }
    case "color": {
      const wrap = el("div", { class: "color" });
      const c = el("input", { type: "color", value: /^#[0-9a-f]{6}$/i.test(v) ? v : "#2563eb" });
      const t = el("input", { type: "text", value: v ?? "" });
      c.addEventListener("input", () => {
        obj[f.key] = c.value;
        t.value = c.value;
        changed();
      });
      t.addEventListener("input", () => {
        obj[f.key] = t.value;
        if (/^#[0-9a-f]{6}$/i.test(t.value)) c.value = t.value;
        changed();
      });
      wrap.append(c, t);
      return wrap;
    }
    case "checkbox": {
      const c = el("input", { type: "checkbox", checked: !!v });
      c.addEventListener("change", () => {
        obj[f.key] = c.checked;
        changed();
      });
      return el("label", { class: "switch" }, c, el("span", {}));
    }
    case "select": {
      const s = el("select", {}, ...f.options.map(([val, label]) => el("option", { value: val, selected: val === (v ?? "") }, label)));
      s.addEventListener("change", () => {
        obj[f.key] = s.value;
        changed();
      });
      return s;
    }
    case "lines": {
      const t = el("textarea", { rows: Math.min(8, Math.max(3, (v || []).length + 1)) });
      t.value = (v || []).join("\n");
      t.addEventListener("input", () => {
        obj[f.key] = t.value.split("\n").map((x) => x.trim()).filter(Boolean);
        changed();
      });
      return t;
    }
    case "image":
      return imageControl(obj, f);
    case "array":
      return arrayControl(obj, f, path);
    default: {
      const i = el("input", { type: "text", value: v ?? "" });
      i.addEventListener("input", () => {
        obj[f.key] = i.value;
        changed();
      });
      return i;
    }
  }
}

function arrayControl(obj, f, path) {
  if (!Array.isArray(obj[f.key])) obj[f.key] = [];
  const arr = obj[f.key];
  const wrap = el("div", { class: "arr" });

  const rerender = () => {
    wrap.replaceWith(arrayControl(obj, f, path));
    changed();
  };

  arr.forEach((item, i) => {
    const key = `${path}.${f.key}.${i}`;
    const open = openItems.has(key);
    const title = (f.itemLabel?.(item) || "").trim() || `Item ${i + 1}`;
    const body = el("div", { class: "arr__body" }, ...f.fields.map((sf) => fieldRow(sf.label, sf.help, control(item, sf, key), sf.type === "textarea" || sf.type === "lines" || sf.type === "image" || sf.type === "array")));
    const card = el(
      "div",
      { class: `arr__item${open ? " is-open" : ""}` },
      el(
        "div",
        { class: "arr__head" },
        el(
          "button",
          {
            class: "arr__toggle",
            type: "button",
            onclick: () => {
              if (openItems.has(key)) openItems.delete(key);
              else openItems.add(key);
              card.classList.toggle("is-open");
            },
          },
          el("span", { class: "arr__chev" }, "▸"),
          el("span", { class: "arr__title" }, title)
        ),
        el(
          "span",
          { class: "arr__tools" },
          el("button", { type: "button", title: "Move up", disabled: i === 0, onclick: () => (swap(arr, i, i - 1), rerender()) }, "↑"),
          el("button", { type: "button", title: "Move down", disabled: i === arr.length - 1, onclick: () => (swap(arr, i, i + 1), rerender()) }, "↓"),
          el("button", { type: "button", title: "Duplicate", onclick: () => (arr.splice(i + 1, 0, JSON.parse(JSON.stringify(item))), rerender()) }, "⧉"),
          el(
            "button",
            {
              type: "button",
              title: "Delete",
              class: "danger",
              onclick: () => {
                if (confirm(`Delete "${title}"?`)) {
                  arr.splice(i, 1);
                  rerender();
                }
              },
            },
            "✕"
          )
        )
      ),
      body
    );
    // keep the header title in sync while typing
    body.addEventListener("input", () => {
      card.querySelector(".arr__title").textContent = (f.itemLabel?.(item) || "").trim() || `Item ${i + 1}`;
    });
    wrap.append(card);
  });

  wrap.append(
    el(
      "button",
      {
        class: "a-btn a-btn--sm arr__add",
        type: "button",
        onclick: () => {
          arr.push(JSON.parse(JSON.stringify(f.newItem || {})));
          openItems.add(`${path}.${f.key}.${arr.length - 1}`);
          rerender();
        },
      },
      "＋ Add"
    )
  );
  return wrap;
}

function swap(arr, a, b) {
  if (b < 0 || b >= arr.length) return;
  [arr[a], arr[b]] = [arr[b], arr[a]];
}

function renderEditor() {
  const ed = $("#editor");
  let title;
  let subtitle;
  let obj;
  let fields;
  let path;
  let extra = null;

  if (selected === "site") {
    title = "Site & brand";
    subtitle = "Brand name, logo, contact details and SEO.";
    obj = content.site;
    fields = SITE_SCHEMA;
    path = "site";
  } else if (selected === "footer") {
    title = "VIP footer";
    subtitle = "The dark & gold footer at the bottom of every page.";
    obj = content.footer;
    fields = FOOTER_SCHEMA;
    path = "footer";
  } else {
    const s = content.sections[selected];
    if (!s) return select("site");
    title = SECTION_LABELS[s.type] || s.type;
    subtitle = `Section id: #${s.id}`;
    obj = s;
    fields = SCHEMAS[s.type] || [];
    path = `sec.${s.id}`;
    const idInput = el("input", { type: "text", value: s.id });
    idInput.addEventListener("change", () => {
      const clean = idInput.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      if (!clean) return (idInput.value = s.id);
      if (clean !== s.id && content.sections.some((x) => x.id === clean)) {
        toast("Another section already uses that id.", "error");
        return (idInput.value = s.id);
      }
      s.id = clean;
      idInput.value = clean;
      changed({ structural: true });
    });
    const vis = el("input", { type: "checkbox", checked: s.visible !== false });
    vis.addEventListener("change", () => {
      s.visible = vis.checked;
      changed({ structural: true });
    });
    extra = el(
      "div",
      { class: "card card--meta" },
      fieldRow("Show on website", null, el("label", { class: "switch" }, vis, el("span", {}))),
      fieldRow("Section id (used in links, e.g. #contact)", null, idInput),
      el(
        "div",
        { class: "card__actions" },
        el(
          "button",
          {
            class: "a-btn a-btn--sm",
            type: "button",
            onclick: () => {
              const copy = JSON.parse(JSON.stringify(s));
              copy.id = uniqueId(s.id);
              content.sections.splice(selected + 1, 0, copy);
              changed({ structural: true });
              select(selected + 1);
            },
          },
          "⧉ Duplicate section"
        ),
        el(
          "button",
          {
            class: "a-btn a-btn--sm a-btn--danger",
            type: "button",
            onclick: () => {
              if (!confirm(`Delete the "${title}" section? You can undo by not saving.`)) return;
              content.sections.splice(selected, 1);
              changed({ structural: true });
              select("site");
            },
          },
          "🗑 Delete section"
        )
      )
    );
  }

  const form = el(
    "div",
    { class: "card" },
    ...fields.map((f) => fieldRow(f.label, f.help, control(obj, f, path), ["textarea", "lines", "image", "array"].includes(f.type)))
  );
  ed.replaceChildren(el("div", { class: "editor__head" }, el("h2", {}, title), el("p", { class: "muted" }, subtitle)), extra, form);
  ed.scrollTop = 0;
}

/* ------------------------------------------------------------ */
/* Toolbar                                                        */
/* ------------------------------------------------------------ */
function setupToolbar() {
  $("#btnSave").addEventListener("click", save);

  document.querySelectorAll(".nav-item").forEach((b) => b.addEventListener("click", () => select(b.dataset.target)));

  const addType = $("#addType");
  addType.replaceChildren(...SECTION_TYPES.map((t) => el("option", { value: t }, `${SECTION_ICONS[t]} ${SECTION_LABELS[t]}`)));
  $("#btnAdd").addEventListener("click", () => {
    const type = addType.value;
    const template = defaults.sections.find((s) => s.type === type);
    const copy = JSON.parse(JSON.stringify(template || { type, visible: true }));
    copy.id = uniqueId(template?.id || type);
    copy.visible = true;
    content.sections.push(copy);
    changed({ structural: true });
    select(content.sections.length - 1);
    toast(`${SECTION_LABELS[type]} added at the bottom. Drag it into place.`);
  });

  // more menu
  const more = $("#moreMenu");
  $("#btnMore").addEventListener("click", (e) => {
    e.stopPropagation();
    more.hidden = !more.hidden;
  });
  document.addEventListener("click", () => (more.hidden = true));
  more.addEventListener("click", (e) => e.stopPropagation());

  $("#btnExport").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const a = el("a", { href: URL.createObjectURL(blob), download: `skyitempire-content-${new Date().toISOString().slice(0, 10)}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
    more.hidden = true;
  });

  $("#importFile").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (!parsed || !Array.isArray(parsed.sections)) throw new Error("This file doesn't look like website content.");
      content = normalizeContent(parsed);
      changed({ structural: true });
      select("site");
      toast("Content imported. Click Save & publish to make it live.");
    } catch (err) {
      toast(err.message || "Could not read that file.", "error");
    }
    e.target.value = "";
    more.hidden = true;
  });

  $("#btnReset").addEventListener("click", () => {
    if (!confirm("Reset ALL content to the original defaults? (Nothing is published until you click Save.)")) return;
    content = cloneDefaults();
    changed({ structural: true });
    select("site");
    more.hidden = true;
  });

  $("#btnLogout").addEventListener("click", async () => {
    if (isDirty() && !confirm("You have unsaved changes. Sign out anyway?")) return;
    if (sb) await sb.auth.signOut();
    location.reload();
  });

  // preview controls
  $("#btnPreviewToggle").addEventListener("click", () => {
    // wide screens: hide/show the side preview; narrow screens: open it as an overlay
    if (window.innerWidth > 1200) document.body.classList.toggle("no-preview");
    else document.body.classList.toggle("show-preview");
  });
  document.querySelectorAll("[data-device]").forEach((b) =>
    b.addEventListener("click", () => {
      document.querySelectorAll("[data-device]").forEach((x) => x.classList.toggle("is-active", x === b));
      $("#previewFrameWrap").classList.toggle("is-mobile", b.dataset.device === "mobile");
    })
  );
  $("#btnReload").addEventListener("click", () => {
    pushPreview();
    $("#previewFrame").contentWindow?.location.reload();
  });

  window.addEventListener("beforeunload", (e) => {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  // Ctrl/Cmd + S to save
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      save();
    }
  });
}

/* ------------------------------------------------------------ */
/* Auth + start                                                   */
/* ------------------------------------------------------------ */
async function startApp() {
  $("#loginView").hidden = true;
  $("#appView").hidden = false;
  const banner = $("#banner");
  if (demoMode) {
    banner.hidden = false;
    banner.innerHTML =
      "<strong>Demo mode:</strong> Supabase is not connected, so changes are saved only in this browser and visitors won't see them. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to publish for everyone (see README).";
  } else {
    const { data } = await sb.from("site_admins").select("email").limit(1);
    if (!data || !data.length) {
      banner.hidden = false;
      banner.className = "banner banner--error";
      banner.innerHTML =
        "<strong>Not an admin:</strong> your account is signed in but isn't in the <code>site_admins</code> table, so saving will be blocked. Add your email there (see <code>supabase/schema.sql</code>).";
    }
  }
  await loadFromServer();
  setupToolbar();
  renderSidebar();
  renderEditor();
  updateStatus();
}

async function init() {
  if (demoMode) return startApp();

  const { data } = await sb.auth.getSession();
  if (data.session) return startApp();

  $("#loginView").hidden = false;
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(e.target);
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    $("#loginError").textContent = "";
    const { error } = await sb.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
    btn.disabled = false;
    if (error) {
      $("#loginError").textContent = error.message;
      return;
    }
    startApp();
  });
}

init();
