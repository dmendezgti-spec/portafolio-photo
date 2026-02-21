const GALLERY_URL = "/content/gallery.json";

const state = {
  items: [],
  filter: "all",
  query: "",
  filtered: [],
  activeIndex: -1,
};

const grid = document.querySelector("#grid");
const chips = document.querySelectorAll("[data-filter]");
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

chips.forEach((c) => c.addEventListener("click", () => {
  chips.forEach(x => x.classList.remove("active"));
  c.classList.add("active");
  state.filter = c.dataset.filter;
  render();
}));

search?.addEventListener("input", (e) => {
  state.query = e.target.value.trim().toLowerCase();
  render();
});

modalClose?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
modalPrev?.addEventListener("click", () => stepModal(-1));
modalNext?.addEventListener("click", () => stepModal(1));

document.addEventListener("keydown", (e) => {
  if (!modal.classList.contains("open")) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowLeft") stepModal(-1);
  if (e.key === "ArrowRight") stepModal(1);
});

init();

async function init() {
  try {
    const res = await fetch(GALLERY_URL, { cache: "no-store" });
    const data = await res.json();
    state.items = (Array.isArray(data) ? data : []).map(normalizeItem);
    render();
    openFromUrlIfAny();
  } catch (err) {
    console.log("init error:", err?.message || err);
    grid.innerHTML = `<div style="color:rgba(255,255,255,.65);padding:10px">No se pudo cargar la galería.</div>`;
  }
}

function normalizeItem(item) {
  const id = item.id || `${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
  const type = item.type || "photo";
  const category = item.category || "bodas";
  const title = item.title || "Sin título";
  const description = item.description || "";
  const url = item.url || "";
  const thumb = item.thumb || url;
  const createdAt = item.createdAt || item.date || new Date().toISOString();
  return { id, type, category, title, description, url, thumb, createdAt, publicId: item.publicId };
}

function render() {
  grid.innerHTML = "";

  const items = state.items
    .filter(matchesFilter)
    .filter(matchesQuery);

  state.filtered = items;

  if (!items.length) {
    grid.innerHTML = `<div style="color:rgba(255,255,255,.65);padding:10px">No hay contenido aún.</div>`;
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
  const el = document.createElement("article");
  el.className = "item";
  el.id = `item-${item.id}`;

  const media = document.createElement("div");
  media.className = "media";

  if (item.type === "photo") {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = item.title;
    img.src = item.thumb || item.url;
    media.appendChild(img);
  } else {
    // video placeholder
    media.innerHTML = `
      <div style="aspect-ratio:16/10; position:relative;">
        <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:1;">
          <div style="width:76px;height:76px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px); font-size:24px;">
            ▶
          </div>
        </div>
      </div>
    `;
  }

  const badgebar = document.createElement("div");
  badgebar.className = "badgebar";
  badgebar.innerHTML = `
    <span class="tag accent">${escapeHtml(prettyCat(item.category))}</span>
    <span class="tag ${item.type === "video" ? "video" : ""}">${escapeHtml(item.type)}</span>
  `;
  media.appendChild(badgebar);

  const body = document.createElement("div");
  body.className = "body";
  body.innerHTML = `
    <h3 class="title">${escapeHtml(item.title)}</h3>
    <p class="desc">${escapeHtml(item.description || "")}</p>
    <div class="row">
      <button class="btn btn-primary" type="button" data-open>Ver</button>
      <a class="btn" href="${item.url}" target="_blank" rel="noreferrer">Abrir</a>
    </div>
  `;

  el.appendChild(media);
  el.appendChild(body);

  el.querySelector("[data-open]").addEventListener("click", () => openModalById(item.id));
  media.addEventListener("click", () => openModalById(item.id));

  return el;
}

function openModalById(id) {
  const idx = state.filtered.findIndex(x => String(x.id) === String(id));
  if (idx === -1) return;
  state.activeIndex = idx;
  openModal(state.filtered[idx]);
}

function openModal(item) {
  modalTitle.textContent = item.title;
  modalDesc.textContent = item.description || "";
  modalMeta.textContent = `${prettyCat(item.category)} • ${item.type} • ${new Date(item.createdAt).toLocaleDateString()}`;

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

  modalOpen.href = item.url;

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

  const found = state.items.find(x => String(x.id) === String(id));
  if (!found) return;

  // fuerza render para que exista en filtered
  render();
  openModalById(id);

  const el = document.getElementById(`item-${id}`);
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
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
