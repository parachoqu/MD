// Biblioteca de midia: imagens existentes do projeto (somente leitura) + uploads
// demonstrativos (JPEG/PNG/WebP ate 5MB, decodificados de verdade antes de
// aceitar, blobs no IndexedDB). Busca, filtro por formato, preview, locais de
// uso, substituir e excluir quando nao estiver em uso.

import { element, clearChildren } from "../dom.js";
import { createIcon } from "../icons.js";
import { mediaRepository } from "../repositories/media-repository.js";
import { createTextField } from "../components/form-field.js";
import { openDialog } from "../components/dialog-shell.js";
import { showConfirmDialog } from "../components/confirm-dialog.js";
import { bytesToReadable } from "../utils.js";

const state = { query: "", format: "" };

function openUploadDialog(shell) {
  return openDialog(shell.getDialogRoot(), {
    ariaLabel: "Enviar imagem",
    render(close) {
      const fileInput = element("input", {
        type: "file",
        accept: "image/jpeg,image/png,image/webp",
        className: "admin-input",
        "data-autofocus": "",
      });
      const altField = createTextField({ label: "Texto alternativo", required: true, onInput: () => {} });
      const labelField = createTextField({ label: "Nome (opcional)", onInput: () => {} });
      const errorBox = element("p", { className: "admin-field-error", "aria-live": "polite" });
      const statusBox = element("p", { className: "admin-field-hint", "aria-live": "polite" });

      const uploadButton = element(
        "button",
        {
          type: "button",
          className: "admin-btn admin-btn--primary",
          onClick: async () => {
            const file = fileInput.files[0];
            if (!file) {
              errorBox.textContent = "Selecione um arquivo.";
              return;
            }
            statusBox.textContent = "Enviando…";
            uploadButton.disabled = true;
            const result = await mediaRepository.upload(file, { alt: altField.input.value, label: labelField.input.value });
            uploadButton.disabled = false;
            statusBox.textContent = "";
            if (!result.ok) {
              errorBox.textContent = (result.error.errors || [result.error]).map((err) => err.message).join(" ");
              return;
            }
            close(result.data);
          },
        },
        [element("span", { text: "Enviar" })]
      );

      const cancelButton = element("button", { type: "button", className: "admin-btn admin-btn--ghost", text: "Cancelar", onClick: () => close(null) });

      return element("div", {}, [
        element("div", { className: "admin-dialog__header" }, [element("h2", { className: "admin-dialog__title", text: "Enviar imagem" }), cancelButton]),
        element("p", { className: "admin-field-hint", text: "Aceita JPEG, PNG ou WebP, até 5 MB. SVG enviado pelo usuário é recusado. O upload existe apenas neste navegador." }),
        element("div", { className: "admin-field" }, [element("label", { text: "Arquivo" }), fileInput]),
        altField.root,
        labelField.root,
        errorBox,
        statusBox,
        element("div", { className: "admin-dialog__actions" }, [uploadButton]),
      ]);
    },
  });
}

function openReplaceDialog(shell, item) {
  return openDialog(shell.getDialogRoot(), {
    ariaLabel: "Substituir imagem",
    render(close) {
      const fileInput = element("input", { type: "file", accept: "image/jpeg,image/png,image/webp", className: "admin-input", "data-autofocus": "" });
      const errorBox = element("p", { className: "admin-field-error", "aria-live": "polite" });

      const confirmButton = element(
        "button",
        {
          type: "button",
          className: "admin-btn admin-btn--primary",
          onClick: async () => {
            const file = fileInput.files[0];
            if (!file) {
              errorBox.textContent = "Selecione um arquivo.";
              return;
            }
            const result = await mediaRepository.replace(item.id, file);
            if (!result.ok) {
              errorBox.textContent = (result.error.errors || [result.error]).map((err) => err.message).join(" ");
              return;
            }
            close(result.data);
          },
        },
        [element("span", { text: "Substituir" })]
      );
      const cancelButton = element("button", { type: "button", className: "admin-btn admin-btn--ghost", text: "Cancelar", onClick: () => close(null) });

      return element("div", {}, [
        element("div", { className: "admin-dialog__header" }, [
          element("h2", { className: "admin-dialog__title", text: "Substituir “" + item.label + "”" }),
          cancelButton,
        ]),
        element("p", { className: "admin-field-hint", text: "As referências existentes continuam apontando para este mesmo item." }),
        element("div", { className: "admin-field" }, [element("label", { text: "Novo arquivo" }), fileInput]),
        errorBox,
        element("div", { className: "admin-dialog__actions" }, [confirmButton]),
      ]);
    },
  });
}

function openEditMetadataDialog(shell, item) {
  return openDialog(shell.getDialogRoot(), {
    ariaLabel: "Editar mídia",
    render(close) {
      const altField = createTextField({ label: "Texto alternativo", required: true, value: item.alt, onInput: () => {} });
      const labelField = createTextField({ label: "Nome", value: item.label, onInput: () => {} });
      const errorBox = element("p", { className: "admin-field-error", "aria-live": "polite" });

      const saveButton = element(
        "button",
        {
          type: "button",
          className: "admin-btn admin-btn--primary",
          onClick: async () => {
            const result = await mediaRepository.update(item.id, { alt: altField.input.value, label: labelField.input.value });
            if (!result.ok) {
              errorBox.textContent = (result.error.errors || [result.error]).map((err) => err.message).join(" ");
              return;
            }
            close(result.data);
          },
        },
        [element("span", { text: "Salvar" })]
      );
      const cancelButton = element("button", { type: "button", className: "admin-btn admin-btn--ghost", text: "Cancelar", onClick: () => close(null) });

      return element("div", {}, [
        element("div", { className: "admin-dialog__header" }, [element("h2", { className: "admin-dialog__title", text: "Editar mídia" }), cancelButton]),
        altField.root,
        labelField.root,
        errorBox,
        element("div", { className: "admin-dialog__actions" }, [saveButton]),
      ]);
    },
  });
}

function openUsageDialog(shell, item, usage) {
  return openDialog(shell.getDialogRoot(), {
    ariaLabel: "Locais de uso",
    render(close) {
      const closeButton = element("button", {
        type: "button",
        className: "admin-btn admin-btn--ghost",
        text: "Fechar",
        "data-autofocus": "",
        onClick: () => close(null),
      });
      const list = usage.length
        ? element(
            "ul",
            { className: "admin-usage-list" },
            usage.map((entry) => element("li", { text: entry.domain + ": " + entry.label }))
          )
        : element("p", { className: "admin-empty-state", text: "Esta mídia não está em uso." });
      return element("div", {}, [
        element("div", { className: "admin-dialog__header" }, [
          element("h2", { className: "admin-dialog__title", text: "Locais de uso — " + item.label }),
          closeButton,
        ]),
        list,
      ]);
    },
  });
}

async function buildCard(item, shell, refresh) {
  const previewWrap = element("figure", { className: "admin-media-card__preview" });
  const url = await mediaRepository.getPreviewUrl(item.id);
  previewWrap.appendChild(
    url ? element("img", { src: url, alt: item.alt || "", loading: "lazy" }) : element("span", { className: "admin-media-picker__placeholder", text: "Sem preview" })
  );

  const meta = element("p", { className: "admin-media-card__meta", text: [item.format, item.width ? item.width + "×" + item.height : null, bytesToReadable(item.sizeBytes)].filter(Boolean).join(" · ") });

  const actions = element("div", { className: "admin-row__actions" }, [
    element(
      "button",
      {
        type: "button",
        className: "admin-icon-btn",
        "aria-label": "Ver locais de uso de " + item.label,
        onClick: async () => {
          const result = await mediaRepository.getUsage(item.id);
          openUsageDialog(shell, item, result.data || []);
        },
      },
      [createIcon("info", { size: 16 })]
    ),
  ]);

  if (item.kind !== "static") {
    actions.appendChild(
      element(
        "button",
        {
          type: "button",
          className: "admin-icon-btn",
          "aria-label": "Editar " + item.label,
          onClick: async () => {
            const result = await openEditMetadataDialog(shell, item);
            if (result) {
              shell.showToast("Mídia atualizada.");
              refresh();
            }
          },
        },
        [createIcon("edit", { size: 16 })]
      )
    );
    actions.appendChild(
      element(
        "button",
        {
          type: "button",
          className: "admin-icon-btn",
          "aria-label": "Substituir " + item.label,
          onClick: async () => {
            const result = await openReplaceDialog(shell, item);
            if (result) {
              shell.showToast("Mídia substituída.");
              refresh();
            }
          },
        },
        [createIcon("upload", { size: 16 })]
      )
    );
    actions.appendChild(
      element(
        "button",
        {
          type: "button",
          className: "admin-icon-btn admin-icon-btn--danger",
          "aria-label": "Excluir " + item.label,
          onClick: async () => {
            const confirmed = await showConfirmDialog(shell.getDialogRoot(), {
              title: "Excluir mídia",
              message: 'Esta ação remove "' + item.label + '" definitivamente deste navegador.',
              confirmLabel: "Excluir",
              destructive: true,
            });
            if (!confirmed) return;
            const result = await mediaRepository.delete(item.id);
            if (!result.ok) {
              if (result.error.code === "in_use") {
                shell.showToast("Não é possível excluir: mídia em uso.");
              } else {
                shell.showToast(result.error.message);
              }
              return;
            }
            shell.showToast("Mídia excluída.");
            refresh();
          },
        },
        [createIcon("trash", { size: 16 })]
      )
    );
  }

  return element("article", { className: "admin-media-card" }, [
    previewWrap,
    element("div", { className: "admin-media-card__body" }, [
      element("p", { className: "admin-media-card__title", text: item.label }),
      meta,
      element("p", { className: "admin-media-card__alt", text: item.alt || "(sem texto alternativo)" }),
      item.kind === "static" ? element("span", { className: "admin-tag admin-tag--protected", text: "Somente leitura" }) : null,
      actions,
    ]),
  ]);
}

export const mediaView = {
  async mount(container, params, shell) {
    shell.setTitle("Biblioteca de mídia");
    shell.setBreadcrumb([{ label: "Biblioteca de mídia" }]);
    shell.setActions([
      element(
        "button",
        {
          type: "button",
          className: "admin-btn admin-btn--primary",
          onClick: async () => {
            const result = await openUploadDialog(shell);
            if (result) {
              shell.showToast("Mídia enviada.");
              refresh();
            }
          },
        },
        [createIcon("upload", { size: 16 }), element("span", { text: "Enviar imagem" })]
      ),
    ]);

    const root = element("div", { className: "admin-list-page" });
    const toolbar = element("form", { className: "admin-toolbar", role: "search" });
    const searchInput = element("input", { type: "search", className: "admin-input", placeholder: "Buscar por nome ou texto alternativo", "aria-label": "Buscar mídia" });
    searchInput.value = state.query;
    const formatSelect = element("select", { className: "admin-select", "aria-label": "Filtrar por formato" }, [
      element("option", { value: "", text: "Todos os formatos" }),
      element("option", { value: "jpeg", text: "JPEG" }),
      element("option", { value: "png", text: "PNG" }),
      element("option", { value: "webp", text: "WebP" }),
      element("option", { value: "svg", text: "SVG" }),
    ]);
    formatSelect.value = state.format;
    toolbar.appendChild(searchInput);
    toolbar.appendChild(formatSelect);
    toolbar.addEventListener("submit", (event) => event.preventDefault());

    const countEl = element("p", { className: "admin-count", "aria-live": "polite" });
    const gridEl = element("div", { className: "admin-media-grid" });

    root.appendChild(toolbar);
    root.appendChild(countEl);
    root.appendChild(gridEl);
    container.appendChild(root);

    async function refresh() {
      const result = await mediaRepository.list({ query: state.query || undefined, format: state.format || undefined });
      const items = result.data || [];
      countEl.textContent = items.length + (items.length === 1 ? " item encontrado" : " itens encontrados");
      clearChildren(gridEl);
      if (!items.length) {
        gridEl.appendChild(element("div", { className: "admin-empty-state" }, [element("p", { text: "Nenhuma mídia encontrada." })]));
        return;
      }
      for (const item of items) {
        gridEl.appendChild(await buildCard(item, shell, refresh));
      }
    }

    searchInput.addEventListener("input", () => {
      state.query = searchInput.value;
      refresh();
    });
    formatSelect.addEventListener("change", () => {
      state.format = formatSelect.value;
      refresh();
    });

    await refresh();
  },

  unmount() {
    mediaRepository.releaseAllPreviewUrls();
  },
};
