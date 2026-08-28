// Editor de conteudo institucional, guiado por content-schema.js. Cada secao e
// um <details> com seus campos e um botao "Salvar secao" proprio (a API do
// repositorio e por secao: updateSection(pageId, sectionId, data)). Nunca
// permite editar HTML/CSS/JS/nomes de classe -- so os tipos de campo do schema.

import { element, clearChildren } from "../dom.js";
import { contentRepository } from "../repositories/content-repository.js";
import { mediaRepository } from "../repositories/media-repository.js";
import { CONTENT_PAGES } from "../data/content-schema.js";
import { createTextField, createTextareaField, createCheckboxField } from "../components/form-field.js";
import { renderRepeatableList } from "../components/repeatable-list.js";
import { openMediaPicker } from "../components/media-picker.js";
import { showConfirmDialog } from "../components/confirm-dialog.js";
import { openDialog } from "../components/dialog-shell.js";
import { createPreviewPanel } from "../components/preview-panel.js";
import { dirtyGuard } from "../dirty-guard.js";
import { generateId } from "../utils.js";

let activePageKey = "home";

function createEmptyRepeatableItem(itemFields) {
  const item = { id: generateId("item"), visible: true };
  itemFields.forEach((field) => {
    item[field.key] = field.type === "boolean" ? false : "";
  });
  return item;
}

function buildFieldControl(field, data, shell) {
  if (field.type === "textarea") {
    return createTextareaField({
      label: field.label,
      required: field.required,
      value: data[field.key],
      onInput: (v) => (data[field.key] = v),
    }).root;
  }
  if (field.type === "boolean") {
    return createCheckboxField({ label: field.label, value: data[field.key], onInput: (v) => (data[field.key] = v) }).root;
  }
  if (field.type === "image") {
    const previewWrap = element("div", { className: "admin-image-preview admin-image-preview--small" });
    async function refreshPreview() {
      clearChildren(previewWrap);
      if (!data[field.key]) {
        previewWrap.appendChild(element("p", { className: "admin-empty-state", text: "Nenhuma imagem selecionada." }));
        return;
      }
      const url = await mediaRepository.getPreviewUrl(data[field.key]);
      if (url) previewWrap.appendChild(element("img", { src: url, alt: "" }));
    }
    const pickButton = element(
      "button",
      {
        type: "button",
        className: "admin-btn admin-btn--secondary",
        onClick: async () => {
          const picked = await openMediaPicker(shell.getDialogRoot());
          if (picked) {
            data[field.key] = picked.id;
            await refreshPreview();
          }
        },
      },
      [element("span", { text: "Escolher imagem" })]
    );
    refreshPreview();
    return element("div", { className: "admin-field admin-field--image" }, [
      element("span", { className: "admin-field__label-text", text: field.label + (field.required ? " *" : "") }),
      previewWrap,
      pickButton,
    ]);
  }
  return createTextField({
    label: field.label,
    required: field.required,
    type: field.type === "url" ? "url" : "text",
    value: data[field.key],
    onInput: (v) => (data[field.key] = v),
  }).root;
}

function buildSectionForm(schema, sectionData, shell) {
  const form = element("div", { className: "admin-content-section-fields" });
  (schema.fields || []).forEach((field) => {
    form.appendChild(buildFieldControl(field, sectionData, shell));
  });

  if (schema.repeatable) {
    if (!Array.isArray(sectionData[schema.repeatable.key])) sectionData[schema.repeatable.key] = [];
    const repeatWrap = element("div", { className: "admin-content-repeatable" });
    repeatWrap.appendChild(element("h4", { className: "admin-section-title", text: schema.repeatable.label }));
    renderRepeatableList({
      container: repeatWrap,
      items: sectionData[schema.repeatable.key],
      itemLabel: schema.repeatable.label,
      minItems: schema.protected ? schema.repeatable.minItems : 0,
      createEmpty: () => createEmptyRepeatableItem(schema.repeatable.itemFields),
      renderItemFields(fieldsContainer, item) {
        schema.repeatable.itemFields.forEach((field) => {
          fieldsContainer.appendChild(buildFieldControl(field, item, shell));
        });
        fieldsContainer.appendChild(
          createCheckboxField({ label: "Visível", value: item.visible !== false, onInput: (v) => (item.visible = v) }).root
        );
      },
    });
    form.appendChild(repeatWrap);
  }

  return form;
}

function openHomePreview(pageData, shell) {
  const sections = pageData.sections || {};
  openDialog(shell.getDialogRoot(), {
    size: "large",
    ariaLabel: "Pré-visualização da página inicial",
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
          const hero = sections.hero || {};
          const sobre = sections.sobre || {};
          const footer = sections.footer || {};
          target.appendChild(
            element("div", { className: "admin-preview-home" }, [
              element("h2", { text: (hero.titleStrong || "") + " " + (hero.titleThin || "") }),
              element("p", { text: hero.lead || "" }),
              element("h3", { text: sobre.title || "" }),
              element("p", { text: sobre.description || "" }),
              element("footer", { className: "admin-preview-home__footer", text: footer.tagline || "" }),
            ])
          );
        },
        publicUrl: "../index.html",
      });
      return element("div", {}, [
        element("div", { className: "admin-dialog__header" }, [
          element("h2", { className: "admin-dialog__title", text: "Pré-visualização — Página inicial" }),
          closeButton,
        ]),
        preview.root,
      ]);
    },
  });
}

export const contentView = {
  async mount(container, params, shell) {
    shell.setTitle("Conteúdo do site");
    shell.setBreadcrumb([{ label: "Conteúdo do site" }]);

    const pageIds = Object.keys(CONTENT_PAGES);
    const pageData = {};
    const snapshots = {};

    async function loadAll() {
      for (const pageId of pageIds) {
        const result = await contentRepository.getPage(pageId);
        pageData[pageId] = result.ok && result.data ? result.data : { sections: {}, updatedAt: null };
        snapshots[pageId] = JSON.stringify(pageData[pageId]);
      }
    }

    await loadAll();

    dirtyGuard.register(() => pageIds.some((id) => JSON.stringify(pageData[id]) !== snapshots[id]));

    function render() {
      clearChildren(container);

      const pageTabs = element("div", { className: "admin-tabs", role: "tablist", "aria-label": "Página de conteúdo" });
      const pagePanels = {};
      const pageTabButtons = {};

      function activatePage(pageId) {
        activePageKey = pageId;
        pageIds.forEach((id) => {
          const isActive = id === pageId;
          pageTabButtons[id].setAttribute("aria-selected", String(isActive));
          pageTabButtons[id].classList.toggle("is-active", isActive);
          pagePanels[id].hidden = !isActive;
        });
      }

      pageIds.forEach((pageId) => {
        const pageSchema = CONTENT_PAGES[pageId];
        const button = element(
          "button",
          {
            type: "button",
            role: "tab",
            className: "admin-tab" + (pageId === activePageKey ? " is-active" : ""),
            "aria-selected": String(pageId === activePageKey),
            onClick: () => activatePage(pageId),
          },
          [pageSchema.label]
        );
        pageTabButtons[pageId] = button;
        pageTabs.appendChild(button);

        const panel = element("div", { className: "admin-tab-panel", hidden: pageId !== activePageKey });
        pagePanels[pageId] = panel;

        const toolbar = element("div", { className: "admin-content-page-toolbar" });
        if (pageId === "home") {
          toolbar.appendChild(
            element(
              "button",
              { type: "button", className: "admin-btn admin-btn--secondary", onClick: () => openHomePreview(pageData.home, shell) },
              [element("span", { text: "Pré-visualizar" })]
            )
          );
        }
        toolbar.appendChild(
          element(
            "button",
            {
              type: "button",
              className: "admin-btn admin-btn--ghost",
              onClick: async () => {
                const confirmed = await showConfirmDialog(shell.getDialogRoot(), {
                  title: "Restaurar conteúdo ao seed",
                  message: 'Todas as edições feitas em "' + pageSchema.label + '" serão substituídas pelos dados demonstrativos originais.',
                  confirmLabel: "Restaurar",
                  destructive: true,
                });
                if (!confirmed) return;
                const result = await contentRepository.restore(pageId);
                if (result.ok) {
                  pageData[pageId] = result.data;
                  snapshots[pageId] = JSON.stringify(pageData[pageId]);
                  shell.showToast("Conteúdo restaurado ao seed.");
                  render();
                }
              },
            },
            [element("span", { text: "Restaurar dados demonstrativos" })]
          )
        );
        panel.appendChild(toolbar);

        pageSchema.sections.forEach((sectionSchema) => {
          if (!pageData[pageId].sections[sectionSchema.key]) pageData[pageId].sections[sectionSchema.key] = {};
          const sectionData = pageData[pageId].sections[sectionSchema.key];

          const errorBox = element("p", { className: "admin-field-error", "aria-live": "polite" });

          const saveButton = element(
            "button",
            {
              type: "button",
              className: "admin-btn admin-btn--primary",
              onClick: async () => {
                const result = await contentRepository.updateSection(pageId, sectionSchema.key, sectionData);
                if (!result.ok) {
                  const messages = (result.error.errors || [result.error]).map((err) => err.message);
                  errorBox.textContent = messages.join(" ");
                  return;
                }
                errorBox.textContent = "";
                pageData[pageId] = result.data;
                snapshots[pageId] = JSON.stringify(pageData[pageId]);
                shell.showToast("Seção salva: " + sectionSchema.label);
              },
            },
            [element("span", { text: "Salvar seção" })]
          );

          const summaryChildren = [element("span", { text: sectionSchema.label })];
          if (sectionSchema.protected) {
            summaryChildren.push(element("span", { className: "admin-tag admin-tag--protected", text: "Protegida" }));
          }

          const detailsChildren = [element("summary", { className: "admin-accordion__summary" }, summaryChildren)];
          if (sectionSchema.description) {
            detailsChildren.push(element("p", { className: "admin-field-hint", text: sectionSchema.description }));
          }
          detailsChildren.push(buildSectionForm(sectionSchema, sectionData, shell));
          detailsChildren.push(errorBox);
          detailsChildren.push(saveButton);

          panel.appendChild(element("details", { className: "admin-accordion" }, detailsChildren));
        });
      });

      container.appendChild(pageTabs);
      pageIds.forEach((pageId) => container.appendChild(pagePanels[pageId]));
    }

    render();
  },

  unmount() {
    dirtyGuard.release();
    mediaRepository.releaseAllPreviewUrls();
  },
};
