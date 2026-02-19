const GALLERY_URL = "/content/gallery.json";

const state = {
  items: [],
  filter: "all",
  query: "",
};

const grid = document.querySelector("#grid");
const chips = document.querySelectorAll("[data-filter]");
const search = document.querySelector("#search");

// Modal (IDs del HTML pro)
const modal = document.querySelector("#modal");
const modalBody = document.querySelector("#modalBody");
const modalTitle = document.querySelector("#modalTitle");
const modalMeta = document.querySelector("#modalMeta");
const closeBtn = document.querySelector("#modalClose");

chips.forEach((c) =>
  c.addEventListener("click", () => {
    chips.forEach((x) => x.classList.remove("active"));
    c.classList.add("active");
    state.filter = c.dataset.filter;
    render();
  })
);

search?.addEventListener("input", (e) => {
  state.query = e.target.value.trim().toLowerCase();
  render();
});

closeBtn?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => {
  // cerrar solo si clickeas el overlay, no el card
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
  grid.innerHTML = "";

  const items = state.items.filter(matchesFilter).filter(matchesQuery);

  if (!items.length) {
    grid.innerHTML = `<div style="color:rgba(255,255,255,.6);padding:10px">No hay contenido aún.</div>`;
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
  el.className = "card";
  el.id = `item-${item.id}`;
  el.dataset.id = item.id;

  // Media
  const media = document.createElement("div");
  media.className = "media";

  if (item.type === "photo") {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = item.title;
    img.src = item.thumb || item.url;
    media.appendChild(img);
  } else {
    // Video preview elegante
    media.innerHTML = `
      <div style="position:absolute;inset:0;display:grid;place-items:center;z-index:2">
        <div style="width:74px;height:74px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.35);display:grid;place-items:center;backdrop-filter:blur(10px)">
          ▶
        </div>
      </div>
    `;
  }

  // Badges pro
  const badges = document.createElement("div");
  badges.className = "badges";

  const bCat = document.createElement("span");
  bCat.className = "badge cat";
  bCat.textContent = prettyCat(item.category);

  const bType = document.createElement("span");
  bType.className = `badge ${item.type === "video" ? "video" : "photo"}`;
  bType.textContent = item.type;

  badges.appendChild(bCat);
  badges.appendChild(bType);
  media.appendChild(badges);

  // Content
  const content = document.createElement("div");
  content.className = "content";

  const h = document.createElement("h3");
  h.className = "title";
  h.innerHTML = escapeHtml(item.title);

  const d = document.createElement("p");
  d.className = "desc";
  d.innerHTML = escapeHtml(item.description || "");

  const actions = document.createElement("div");
  actions.className = "actions";

  const btnView = document.createElement("button");
  btnView.className = "btn btn-primary";
  btnView.type = "button";
  btnView.textContent = "Ver";

  const btnOpen = document.createElement("a");
  btnOpen.className = "btn btn-ghost";
  btnOpen.href = item.url;
  btnOpen.target = "_blank";
  btnOpen.rel = "noreferrer";
  btnOpen.textContent = "Abrir";

  actions.appendChild(btnView);
  actions.appendChild(btnOpen);

  content.appendChild(h);
  content.appendChild(d);
  content.appendChild(actions);

  el.appendChild(media);
  el.appendChild(content);

  // Eventos
  btnView.addEventListener("click", () => openModal(item));
  media.addEventListener("click", () => openModal(item));

  return el;
}

function openModal(item) {
  modalTitle.textContent = item.title;
  modalMeta.textContent = `${prettyCat(item.category)} • ${item.type} • ${new Date(
    item.createdAt
  ).toLocaleDateString()}`;

  modalBody.innerHTML = "";

  if (item.type === "photo") {
    const img = document.createElement("img");
    img.alt = item.title;
    img.src = item.url;
    modalBody.appendChild(img);
  } else {
    const iframe = document.createElement("iframe");
    iframe.src = embedUrl(item.url);
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.style.border = "0";
    modalBody.appendChild(iframe);
  }

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  // URL ?open=
  const u = new URL(window.location.href);
  u.searchParams.set("open", item.id);
  history.replaceState({}, "", u.toString());
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modalBody.innerHTML = "";

  // limpia ?open
  const u = new URL(window.location.href);
  u.searchParams.delete("open");
  history.replaceState({}, "", u.toString());
}

function openFromUrlIfAny() {
  const u = new URL(window.location.href);
  const id = u.searchParams.get("open");
  if (!id) return;

  const found = state.items.find((x) => String(x.id) === String(id));
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

  return url;
}

function prettyCat(cat) {
  if (cat === "sesiones-fotograficas") return "Sesiones fotográficas";
  if (cat === "pre-bodas") return "Prebodas";
  if (cat === "bodas") return "Bodas";
  return cat;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

