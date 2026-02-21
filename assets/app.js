const GALLERY_URL = "/content/gallery.json";

const state = {
  items: [],
  filter: "all",
  query: "",
  filtered: [],
  activeIndex: -1,
};

// UI
const grid = document.querySelector("#grid");
const pills = document.querySelectorAll("[data-filter]");
const search = document.querySelector("#search");

// Modal
const modal = document.querySelector("#modal");
const modalMedia = document.querySelector("#modalMedia");
const modalTitle = document.querySelector("#modalTitle");
const modalMeta = document.querySelector("#modalMeta");
const modalDesc = document.querySelector("#modalDesc");
const modalClose = document.querySelector("#modalClose");
const modalPrev = document.querySelector("#modalPrev");
const modalNext = document.querySelector("#modalNext");
const modalOpen = document.querySelector("#modalOpen");

// Hero background
const heroBg = document.querySelector("#heroBg");

// Contact
const yearEl = document.querySelector("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// WhatsApp config (CÁMBIALO)
const phone = "56900000000";
const baseMsg = "Hola! Quiero cotizar una sesión 📸";
const waLink = (extra = "") =>
  `https://wa.me/${phone}?text=${encodeURIComponent(extra ? `${baseMsg}\n\n${extra}` : baseMsg)}`;

const ctaWhatsApp = document.querySelector("#ctaWhatsApp");
const ctaWhatsAppTop = document.querySelector("#ctaWhatsAppTop");
if (ctaWhatsApp) ctaWhatsApp.href = waLink();
if (ctaWhatsAppTop) ctaWhatsAppTop.href = waLink();

const sendBtn = document.querySelector("#sendMsg");
sendBtn?.addEventListener("click", () => {
  const service = document.querySelector("#serviceSelect")?.value || "";
  const msg = document.querySelector("#projectMsg")?.value || "";
  const extra = `Servicio: ${service}\nMensaje: ${msg}`.trim();
  window.open(waLink(extra), "_blank");
});

// Filters
pills.forEach((p) =>
  p.addEventListener("click", () => {
    pills.forEach((x) => x.classList.remove("active"));
    p.classList.add("active");
    state.filter = p.dataset.filter;
    render();
  })
);

// Search
search?.addEventListener("input", (e) => {
  state.query = e.target.value.trim().toLowerCase();
  render();
});

// Modal controls
modalClose?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
modalPrev?.addEventListener("click", () => stepModal(-1));
modalNext?.addEventListener("click", () => stepModal(1));

document.addEventListener("keydown", (e) => {
  if (!modal.classList.contains("open")) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowLeft") stepModal(-1);
  if (e.key === "ArrowRight") stepModal(1);
});

// Scroll reveal
setupReveal();

// Init
init();

async function init() {
  try {
    const res = await fetch(GALLERY_URL, { cache: "no-store" });
    const data = await res.json();
    state.items = (Array.isArray(data) ? data : []).map(normalizeItem);

    // Hero background: toma la primera foto disponible
    setHeroBackgroundFromGallery();

    render();
    openFromUrlIfAny();
  } catch (err) {
    console.log("init error:", err?.message || err);
    if (grid) grid.innerHTML = `<div style="color:rgba(255,255,255,.65)">No se pudo cargar la galería.</div>`;
  }
}

function setHeroBackgroundFromGallery() {
  if (!heroBg) return;

  const firstPhoto = state.items.find((x) => x.type === "photo" && x.url);
  if (!firstPhoto) {
    // fallback: gradient
    heroBg.style.backgroundImage =
      "linear-gradient(120deg, rgba(208,168,58,.15), rgba(0,0,0,.55))";
    return;
  }
  heroBg.style.backgroundImage = `url("${firstPhoto.url}")`;
}

function normalizeItem(item) {
  const id = item.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const type = item.type || "photo";
  const category = item.category || "bodas";
  const title = item.title || "Sin título";
  const description = item.description || "";
  const url = item.url || "";
  const thumb = item.thumb || url;
  const createdAt = item.createdAt || item.date || new Date().toISOString();
  return { id, type, category, title, description, url, thumb, createdAt };
}

function render() {
  if (!grid) return;
  grid.innerHTML = "";

  const items = state.items.filter(matchesFilter).filter(matchesQuery);
  state.filtered = items;

  if (!items.length) {
    grid.innerHTML = `<div style="color:rgba(255,255,255,.65)">No hay contenido aún.</div>`;
    return;
  }

  for (const item of items) grid.appendChild(card(item));
}

function matchesFilter(item) {
  if (state.filter === "all") return true;
  return item.category === state.filter;
}

function matchesQuery(item) {
  if (!state.query) return true;
  const hay = `${item.title} ${item.description} ${item.category} ${item.type}`.toLowerCase();
  return hay.includes(state.query);
}

function card(item) {
  const el = document.createElement("div");
  el.className = "gcard reveal";
  el.dataset.id = item.id;

  const media = document.createElement("div");
  media.className = "gmedia";

  if (item.type === "photo") {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = item.title;
    img.src = item.thumb || item.url;
    media.appendChild(img);
  } else {
    // simple poster style for videos
    media.innerHTML = `
      <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center;">
        <div style="width:74px;height:74px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);font-size:24px;">▶</div>
      </div>`;
  }

  const cap = document.createElement("div");
  cap.className = "gcap";
  cap.innerHTML = `
    <h3 class="gtitle">${escapeHtml(item.title)}</h3>
    <div class="gdesc">${escapeHtml(item.description || "")}</div>
  `;

  el.appendChild(media);
  el.appendChild(cap);

  el.addEventListener("click", () => openModalById(item.id));

  // aplicar reveal a cards nuevas
  requestAnimationFrame(() => observeReveal(el));

  return el;
}

function openModalById(id) {
  const idx = state.filtered.findIndex((x) => String(x.id) === String(id));
  if (idx === -1) return;
  state.activeIndex = idx;
  openModal(state.filtered[idx]);
}

function openModal(item) {
  modalTitle.textContent = item.title;
  modalDesc.textContent = item.description || "";
  modalMeta.textContent = `${prettyCat(item.category)} • ${item.type} • ${new Date(item.createdAt).toLocaleDateString()}`;
  modalOpen.href = item.url;

  modalMedia.innerHTML = "";

  if (item.type === "photo") {
    const img = document.createElement("img");
    img.alt = item.title;
    img.src = item.url;
    modalMedia.appendChild(img);
  } else {
    const iframe = document.createElement("iframe");
    iframe.src = embedUrl(item.url);
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    modalMedia.appendChild(iframe);
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  const u = new URL(window.location.href);
  u.searchParams.set("open", item.id);
  history.replaceState({}, "", u.toString());
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modalMedia.innerHTML = "";

  const u = new URL(window.location.href);
  u.searchParams.delete("open");
  history.replaceState({}, "", u.toString());
}

function stepModal(dir) {
  if (state.activeIndex < 0) return;
  const next = state.activeIndex + dir;
  if (next < 0 || next >= state.filtered.length) return;
  state.activeIndex = next;
  openModal(state.filtered[state.activeIndex]);
}

function openFromUrlIfAny() {
  const u = new URL(window.location.href);
  const id = u.searchParams.get("open");
  if (!id) return;

  render();
  openModalById(id);

  const el = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function embedUrl(url) {
  const yt = url.match(/(youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[2]}`;

  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;

  return url;
}

function prettyCat(cat) {
  if (cat === "sesiones-fotograficas") return "Sesiones";
  if (cat === "pre-bodas") return "Prebodas";
  if (cat === "bodas") return "Bodas";
  return cat;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

/* ======================
   Reveal animations
====================== */
let revealObserver;

function setupReveal() {
  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          revealObserver.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll(".reveal").forEach(observeReveal);
}

function observeReveal(el) {
  if (!revealObserver) return;
  revealObserver.observe(el);
}
