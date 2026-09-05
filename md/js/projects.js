import { revealScope } from "./motion.js";
import { loadPublicBootstrap } from "./api/public-data.js";

// Os projetos passam a vir do bootstrap publicado; a lista estatica so entra
// pelo fallback de leitura resolvido em public-data.js.
export async function initProjects(projects) {
  const grid = document.getElementById("projectsGrid");
  const filters = Array.from(document.querySelectorAll("[data-filter]"));
  const modal = createProjectModal();

  if (!grid) return;

  const list = Array.isArray(projects) ? projects : (await loadPublicBootstrap()).projects;
  grid.replaceChildren(...list.map(projectRow));
  revealScope(grid);

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-id]");
    if (!button) return;
    const project = list.find((item) => item.id === button.dataset.projectId);
    if (project) modal.open(project, button);
  });

  filters.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      filters.forEach((item) => {
        const isActive = item === button;
        item.classList.toggle("is-active", isActive);
        item.setAttribute("aria-selected", String(isActive));
      });

      grid.querySelectorAll(".project-row").forEach((row) => {
        row.hidden = filter !== "todos" && row.dataset.category !== filter;
      });
    });
  });
}

// Construido pela API do DOM, nunca por string: o conteudo agora chega do
// servidor e nao pode ser interpretado como marcacao.
function projectRow(project, index) {
  const article = element("article", "editorial-row project-row");
  article.dataset.category = project.category || "";

  const figure = element("figure", "project-row__media media-frame");
  figure.dataset.animate = "";
  const image = document.createElement("img");
  image.src = safeImageSource(project.image);
  image.alt = project.imageAlt || "";
  image.width = 1448;
  image.height = 1086;
  image.loading = "lazy";
  figure.append(image);

  const body = element("div", "project-row__body");
  const indexLabel = element("span", "editorial-row__index", `${String(index + 1).padStart(2, "0")} / ${project.category || ""}`);
  indexLabel.dataset.animate = "";
  const description = element("p", "project-row__text", project.description || "");
  description.dataset.animate = "";
  body.append(indexLabel, element("h3", "editorial-row__title", project.title || ""), description);

  const aside = element("div", "project-row__aside");
  aside.dataset.animate = "";
  const meta = element("div", "project-row__meta");
  meta.append(element("span", "tag tag--demo", project.status || ""));
  aside.append(meta, element("span", "project-row__date", project.date || ""));

  const details = document.createElement("button");
  details.className = "link-action";
  details.type = "button";
  details.dataset.projectId = project.id || "";
  details.dataset.animate = "";
  details.textContent = "Ver detalhes";

  article.append(figure, body, aside, details);
  return article;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A imagem do projeto e editada no painel; caminhos relativos e http(s) sao
// aceitos, qualquer outro esquema vira string vazia em vez de virar codigo.
function safeImageSource(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(?:javascript|data|vbscript):/i.test(raw)) return "";
  return raw;
}

function createProjectModal() {
  const modal = document.getElementById("projectModal");
  const closeButton = document.getElementById("modalClose");
  const title = document.getElementById("modalTitle");
  const description = document.getElementById("modalDescription");
  const date = document.getElementById("modalDate");
  const note = document.getElementById("modalNote");
  const tags = document.getElementById("modalTags");
  const image = document.getElementById("modalImage");
  const modalInterest = document.querySelector("[data-modal-interest]");
  let lastTrigger = null;

  if (!modal) {
    return { open() {} };
  }

  const focusableSelector = "a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex='-1'])";

  function open(project, trigger) {
    lastTrigger = trigger;
    title.textContent = project.title;
    description.textContent = project.description;
    date.textContent = project.date;
    note.textContent = project.note;
    image.src = safeImageSource(project.image);
    image.alt = project.imageAlt;
    tags.replaceChildren(
      element("span", "tag", project.category || ""),
      document.createTextNode(" "),
      element("span", "tag tag--demo", project.status || "")
    );
    modalInterest.dataset.interest = project.category;

    modal.classList.add("is-open");
    document.body.classList.add("modal-open");
    closeButton.focus();
  }

  function close() {
    modal.classList.remove("is-open");
    document.body.classList.remove("modal-open");
    lastTrigger?.focus();
  }

  closeButton?.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  modalInterest?.addEventListener("click", close);

  document.addEventListener("keydown", (event) => {
    if (!modal.classList.contains("is-open")) return;
    if (event.key === "Escape") close();
    if (event.key !== "Tab") return;

    const focusable = Array.from(modal.querySelectorAll(focusableSelector));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  return { open };
}
