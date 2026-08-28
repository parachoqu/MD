import { revealScope } from "./motion.js";
import { projects as staticProjects } from "../data/projects.js";

export function initProjects(projects = staticProjects) {
  const grid = document.getElementById("projectsGrid");
  const filters = Array.from(document.querySelectorAll("[data-filter]"));
  const modal = createProjectModal();

  if (!grid) return;

  grid.innerHTML = projects.map(projectTemplate).join("");
  revealScope(grid);

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-id]");
    if (!button) return;
    const project = projects.find((item) => item.id === button.dataset.projectId);
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

function projectTemplate(project, index) {
  return `
    <article class="editorial-row project-row" data-category="${project.category}">
      <figure class="project-row__media media-frame" data-animate>
        <img src="${project.image}" alt="${project.imageAlt}" width="1448" height="1086" loading="lazy">
      </figure>
      <div class="project-row__body">
        <span class="editorial-row__index" data-animate>${String(index + 1).padStart(2, "0")} / ${project.category}</span>
        <h3 class="editorial-row__title">${project.title}</h3>
        <p class="project-row__text" data-animate>${project.description}</p>
      </div>
      <div class="project-row__aside" data-animate>
        <div class="project-row__meta">
          <span class="tag tag--demo">${project.status}</span>
        </div>
        <span class="project-row__date">${project.date}</span>
      </div>
      <button class="link-action" type="button" data-project-id="${project.id}" data-animate>Ver detalhes</button>
    </article>
  `;
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
    image.src = project.image;
    image.alt = project.imageAlt;
    tags.innerHTML = `<span class="tag">${project.category}</span> <span class="tag tag--demo">${project.status}</span>`;
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
