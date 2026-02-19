
const GALLERY_URL = "/content/gallery.json";

const state = {
  items: [],
  filter: "all",
  query: "",
};

const grid = document.querySelector("#grid");
const pills = document.querySelectorAll("[data-filter]");
const search = document.querySelector("#search");

const modal = document.querySelector("#modal");
const modalMedia = document.querySelector("#modalMedia");
const modalTitle = document.querySelector("#modalTitle");
const modalDesc = document.querySelector("#modalDesc");
const modalMeta = document.querySelector("#modalMeta");
const closeBtn = document.querySelector("#closeModal");

pills.forEach(p => p.addEventListener("click", () => {
  pills.forEach(x => x.classList.remove("active"));
  p.classList.add("active");
  state.filter = p.dataset.filter;
  render();
}));

search.addEventListener("input", (e) => {
  state.query = e.target.value.trim().toLowerCase();
  render();
});

closeBtn.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

init();

async function init() {
  const res = await fetch(GALLERY_URL, { cache: "no-store" });
  const data = await res.json();
  state.items = (Array.isArray(data) ? data : []).map(normalizeItem);

  render();
  openFromUrlIfAny();
}

function normalizeItem(item) {
  // backward compat
  const id = item.id || `${Date.now()}-${Math.random().toString(16).slice(2,8)}`;
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
  grid.innerHTML = "";

  const items = state.items
    .filter(matchesFilter)
    .filter(matchesQuery);

  if (!items.length) {
    grid.innerHTML = `<div style="color:#aab7d3;padding:10px">No hay contenido aún.</div>`;
    return;
  }

  for (const item of items) {
    grid.appendChild(card(item));
  }
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
  el.className = "card";
  el.id = `item-${item.id}`;
  el.dataset.id = item.id;

  const media = document.createElement("div");
  media.className = "media";

  if (item.type === "photo") {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = item.title;
    img.src = item.thumb || item.url;
    media.appendChild(img);
  } else {
    // video thumbnail simple
    media.innerHTML = `
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
        <div style="width:72px;height:72px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px)">
          ▶
        </div>
      </div>
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15),rgba(0,0,0,.55));"></div>
    `;
  }

  const badge = document.createElement("div");
  badge.className = "badge";
  badge.innerHTML = `
    <span class="tag accent">${prettyCat(item.category)}</span>
    <span class="tag ${item.type === "video" ? "video" : ""}">${item.type}</span>
  `;

  media.appendChild(badge);

  const body = document.createElement("div");
  body.className = "body";
  body.innerHTML = `
    <h3 class="title">${escapeHtml(item.title)}</h3>
    <div class="desc">${escapeHtml(item.description || "")}</div>
    <div class="btnrow">
      <button class="btn primary" data-open>Ver</button>
      ${item.type === "video" ? `<a class="btn" href="${item.url}" target="_blank" rel="noreferrer">Abrir</a>` : `<a class="btn" href="${item.url}" target="_blank" rel="noreferrer">Abrir</a>`}
    </div>
  `;

  el.appendChild(media);
  el.appendChild(body);

  el.querySelector("[data-open]").addEventListener("click", () => openModal(item));
  media.addEventListener("click", () => openModal(item));

  return el;
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
    iframe.style.border = "0";
    modalMedia.appendChild(iframe);
  }

  modal.classList.add("open");

  // Actualiza URL con ?open=
  const u = new URL(window.location.href);
  u.searchParams.set("open", item.id);
  history.replaceState({}, "", u.toString());
}

function closeModal() {
  modal.classList.remove("open");
  modalMedia.innerHTML = "";

  // limpia ?open
  const u = new URL(window.location.href);
  u.searchParams.delete("open");
  history.replaceState({}, "", u.toString());
}

function openFromUrlIfAny() {
  const u = new URL(window.location.href);
  const id = u.searchParams.get("open");
  if (!id) return;

  const found = state.items.find(x => String(x.id) === String(id));
  if (!found) return;

  openModal(found);
  const el = document.getElementById(`item-${id}`);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
}

function embedUrl(url) {
  // youtube
  const yt = url.match(/(youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_\-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[2]}`;

  // vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;

  // fallback (no ideal)
  return url;
}

function prettyCat(cat) {
  if (cat === "sesiones-fotograficas") return "Sesiones fotográficas";
  if (cat === "pre-bodas") return "Pre bodas";
  if (cat === "bodas") return "Bodas";
  return cat;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
