// Listagem e editor de projetos institucionais. Como a lista de rotas nao
// define uma rota dedicada de edicao, o formulario abre como um dialogo
// acessivel sobre a propria listagem (mesmo padrao de dialogo do restante do
// painel).

import { element, clearChildren } from "../dom.js";
import { createIcon } from "../icons.js";
import { projectRepository, PROJECT_CATEGORIES } from "../repositories/project-repository.js";
import { mediaRepository } from "../repositories/media-repository.js";
import { createTextField, createTextareaField, createSelectField } from "../components/form-field.js";
import { openMediaPicker } from "../components/media-picker.js";
import { showConfirmDialog } from "../components/confirm-dialog.js";
import { openDialog } from "../components/dialog-shell.js";
import { createPreviewPanel } from "../components/preview-panel.js";

const CATEGORY_LABELS = { empresas: "Empresas", escolas: "Escolas", comunidades: "Comunidades" };

const EDITORIAL_LABELS = { draft: "Rascunho", published: "Publicado (local)", archived: "Arquivado" };

const state = { query: "", category: "" };

function editorialBadge(status) {
  return element("span", { className: "admin-badge admin-badge--editorial-" + status, text: EDITORIAL_LABELS[status] || status });
}

function openProjectPreview(project, shell) {
  openDialog(shell.getDialogRoot(), {
    size: "large",
    ariaLabel: "Pré-visualização do projeto",
    render(close) {
      const closeButton = element("button", {
        type: "button",
        className: "admin-btn admin-btn--ghost",
        text: "Fechar",
        "data-autofocus": "",
        onClick: () => close(null),
      });
      const preview = createPreviewPanel({
        renderContent(target) {
          target.appendChild(
            element("div", { className: "admin-preview-event" }, [
              element("span", { className: "admin-tag", text: CATEGORY_LABELS[project.category] || project.category }),
              element("h3", { text: project.title }),
              element("p", { text: project.description || "" }),
              element("p", { className: "admin-field-hint", text: project.note || "" }),
            ])
          );
        },
      });
      return element("div", {}, [
        element("div", { className: "admin-dialog__header" }, [
          element("h2", { className: "admin-dialog__title", text: "Pré-visualização — " + project.title }),
          closeButton,
        ]),
        preview.root,
      ]);
    },
  });
}

function openProjectEditor(shell, existingProject) {
  return openDialog(shell.getDialogRoot(), {
    size: "large",
    ariaLabel: existingProject ? "Editar projeto" : "Novo projeto",
    render(close) {
      const draft = Object.assign(
        { category: "empresas", title: "", status: "Placeholder", date: "", description: "", note: "", image: null, imageAlt: "" },
        existingProject
      );

      const errorBox = element("p", { className: "admin-field-error", "aria-live": "polite" });
      const previewWrap = element("div", { className: "admin-image-preview" });

      async function refreshPreview() {
        clearChildren(previewWrap);
        if (!draft.mediaId) {
          previewWrap.appendChild(element("p", { className: "admin-empty-state", text: "Nenhuma imagem selecionada." }));
          return;
        }
        const url = await mediaRepository.getPreviewUrl(draft.mediaId);
        if (url) previewWrap.appendChild(element("img", { src: url, alt: draft.imageAlt || "" }));
      }

      const categoryField = createSelectField({
        label: "Categoria",
        required: true,
        value: draft.category,
        options: PROJECT_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
        onInput: (v) => (draft.category = v),
      });
      const titleField = createTextField({ label: "Título", required: true, value: draft.title, onInput: (v) => (draft.title = v) });
      const statusField = createTextField({ label: "Status", value: draft.status, onInput: (v) => (draft.status = v) });
      const dateField = createTextField({ label: "Data", value: draft.date, onInput: (v) => (draft.date = v) });
      const descriptionField = createTextareaField({ label: "Descrição", value: draft.description, onInput: (v) => (draft.description = v) });
      const noteField = createTextareaField({ label: "Nota", value: draft.note, rows: 2, onInput: (v) => (draft.note = v) });
      const altField = createTextField({ label: "Texto alternativo da imagem", required: true, value: draft.imageAlt, onInput: (v) => (draft.imageAlt = v) });

      const pickButton = element(
        "button",
        {
          type: "button",
          className: "admin-btn admin-btn--secondary",
          onClick: async () => {
            const picked = await openMediaPicker(shell.getDialogRoot());
            if (picked) {
              draft.mediaId = picked.id;
              draft.image = picked.path || draft.image;
              if (!draft.imageAlt) {
                draft.imageAlt = picked.alt || "";
                altField.input.value = draft.imageAlt;
              }
              await refreshPreview();
            }
          },
        },
        [element("span", { text: "Escolher imagem" })]
      );

      const saveButton = element(
        "button",
        {
          type: "button",
          className: "admin-btn admin-btn--primary",
          onClick: async () => {
            const result = existingProject ? await projectRepository.update(existingProject.id, draft) : await projectRepository.create(draft);
            if (!result.ok) {
              const messages = (result.error.errors || [result.error]).map((err) => err.message);
              errorBox.textContent = messages.join(" ");
              return;
            }
            close(result.data);
          },
        },
        [element("span", { text: "Salvar" })]
      );

      const cancelButton = element("button", {
        type: "button",
        className: "admin-btn admin-btn--ghost",
        text: "Cancelar",
        onClick: () => close(null),
      });

      refreshPreview();

      return element("div", {}, [
        element("div", { className: "admin-dialog__header" }, [
          element("h2", { className: "admin-dialog__title", text: existingProject ? "Editar projeto" : "Novo projeto" }),
          cancelButton,
        ]),
        errorBox,
        categoryField.root,
        titleField.root,
        statusField.root,
        dateField.root,
        descriptionField.root,
        noteField.root,
        previewWrap,
        pickButton,
        altField.root,
        element("div", { className: "admin-dialog__actions" }, [saveButton]),
      ]);
    },
  });
}

function buildRow(project, shell, refresh, index, total) {
  const editButton = element(
    "button",
    {
      type: "button",
      className: "admin-icon-btn",
      "aria-label": "Editar " + project.title,
      onClick: async () => {
        const result = await openProjectEditor(shell, project);
        if (result) {
          shell.showToast("Projeto salvo.");
          refresh();
        }
      },
    },
    [createIcon("edit", { size: 16 })]
  );

  const previewButton = element(
    "button",
    { type: "button", className: "admin-icon-btn", "aria-label": "Pré-visualizar " + project.title, onClick: () => openProjectPreview(project, shell) },
    [createIcon("eye", { size: 16 })]
  );

  const duplicateButton = element(
    "button",
    {
      type: "button",
      className: "admin-icon-btn",
      "aria-label": "Duplicar " + project.title,
      onClick: async () => {
        const result = await projectRepository.duplicate(project.id);
        if (result.ok) {
          shell.showToast("Projeto duplicado.");
          refresh();
        }
      },
    },
    [createIcon("duplicate", { size: 16 })]
  );

  const moveUpButton = element(
    "button",
    {
      type: "button",
      className: "admin-icon-btn",
      "aria-label": "Mover " + project.title + " para cima",
      disabled: index === 0,
      onClick: async () => {
        await projectRepository.reorder(project.id, "up");
        refresh();
      },
    },
    [createIcon("moveUp", { size: 16 })]
  );

  const moveDownButton = element(
    "button",
    {
      type: "button",
      className: "admin-icon-btn",
      "aria-label": "Mover " + project.title + " para baixo",
      disabled: index === total - 1,
      onClick: async () => {
        await projectRepository.reorder(project.id, "down");
        refresh();
      },
    },
    [createIcon("moveDown", { size: 16 })]
  );

  const deleteButton = element(
    "button",
    {
      type: "button",
      className: "admin-icon-btn admin-icon-btn--danger",
      "aria-label": "Excluir " + project.title,
      onClick: async () => {
        const confirmed = await showConfirmDialog(shell.getDialogRoot(), {
          title: "Excluir projeto",
          message: 'Esta ação remove "' + project.title + '" definitivamente dos dados administrativos locais.',
          confirmLabel: "Excluir",
          destructive: true,
        });
        if (!confirmed) return;
        const result = await projectRepository.delete(project.id);
        if (result.ok) {
          shell.showToast("Projeto excluído.");
          refresh();
        }
      },
    },
    [createIcon("trash", { size: 16 })]
  );

  return element("article", { className: "admin-row" }, [
    element("div", { className: "admin-row__main" }, [
      element("span", { className: "admin-row__title", text: project.title }),
      element("span", { className: "admin-row__meta", text: (CATEGORY_LABELS[project.category] || project.category) + " · " + project.date }),
    ]),
    element("div", { className: "admin-row__badges" }, [editorialBadge(project.editorialStatus)]),
    element("div", { className: "admin-row__actions" }, [previewButton, editButton, duplicateButton, moveUpButton, moveDownButton, deleteButton]),
  ]);
}

export const projectsView = {
  async mount(container, params, shell) {
    shell.setTitle("Projetos");
    shell.setBreadcrumb([{ label: "Projetos" }]);

    const root = element("div", { className: "admin-list-page" });

    const toolbar = element("form", { className: "admin-toolbar", role: "search" });
    const searchInput = element("input", { type: "search", className: "admin-input", placeholder: "Buscar projetos", "aria-label": "Buscar projetos" });
    searchInput.value = state.query;

    const categorySelect = element(
      "select",
      { className: "admin-select", "aria-label": "Filtrar por categoria" },
      [element("option", { value: "", text: "Todas as categorias" })].concat(
        PROJECT_CATEGORIES.map((value) => element("option", { value, text: CATEGORY_LABELS[value] }))
      )
    );
    categorySelect.value = state.category;

    toolbar.appendChild(searchInput);
    toolbar.appendChild(categorySelect);
    toolbar.addEventListener("submit", (event) => event.preventDefault());

    const countEl = element("p", { className: "admin-count", "aria-live": "polite" });
    const listEl = element("div", { className: "admin-row-list" });

    root.appendChild(toolbar);
    root.appendChild(countEl);
    root.appendChild(listEl);
    container.appendChild(root);

    async function refresh() {
      const result = await projectRepository.list({ query: state.query || undefined, category: state.category || undefined });
      const projects = result.data || [];
      countEl.textContent = projects.length + (projects.length === 1 ? " projeto encontrado" : " projetos encontrados");
      clearChildren(listEl);
      if (!projects.length) {
        listEl.appendChild(element("div", { className: "admin-empty-state" }, [element("p", { text: "Nenhum projeto encontrado." })]));
        return;
      }
      projects.forEach((project, index) => listEl.appendChild(buildRow(project, shell, refresh, index, projects.length)));
    }

    searchInput.addEventListener("input", () => {
      state.query = searchInput.value;
      refresh();
    });
    categorySelect.addEventListener("change", () => {
      state.category = categorySelect.value;
      refresh();
    });

    shell.setActions([
      element(
        "button",
        {
          type: "button",
          className: "admin-btn admin-btn--primary",
          onClick: async () => {
            const result = await openProjectEditor(shell, null);
            if (result) {
              shell.showToast("Projeto criado.");
              refresh();
            }
          },
        },
        [createIcon("plus", { size: 16 }), element("span", { text: "Novo projeto" })]
      ),
    ]);

    await refresh();
  },

  unmount() {
    mediaRepository.releaseAllPreviewUrls();
  },
};
