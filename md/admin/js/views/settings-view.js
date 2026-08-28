// Configuracoes globais do site. Seed a partir dos valores reais hoje
// publicados (ver admin-seed.js); placeholders existentes ficam sinalizados por
// um checkbox proprio, nunca escondidos ou apresentados como dados definitivos.

import { element, clearChildren } from "../dom.js";
import { settingsRepository } from "../repositories/settings-repository.js";
import { mediaRepository } from "../repositories/media-repository.js";
import { createTextField, createTextareaField, createCheckboxField } from "../components/form-field.js";
import { openMediaPicker } from "../components/media-picker.js";
import { dirtyGuard } from "../dirty-guard.js";
import { clone } from "../utils.js";

function mediaPickerField(label, key, formState, shell, onPicked) {
  const previewWrap = element("div", { className: "admin-image-preview admin-image-preview--small" });

  async function refresh() {
    clearChildren(previewWrap);
    if (!formState[key]) {
      previewWrap.appendChild(element("p", { className: "admin-empty-state", text: "Nenhuma imagem selecionada." }));
      return;
    }
    const url = await mediaRepository.getPreviewUrl(formState[key]);
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
          formState[key] = picked.id;
          onPicked();
          await refresh();
        }
      },
    },
    [element("span", { text: "Escolher imagem" })]
  );

  refresh();

  return element("div", { className: "admin-field admin-field--image" }, [
    element("span", { className: "admin-field__label-text", text: label }),
    previewWrap,
    pickButton,
  ]);
}

export const settingsView = {
  async mount(container, params, shell) {
    shell.setTitle("Configurações");
    shell.setBreadcrumb([{ label: "Configurações" }]);

    const result = await settingsRepository.get();
    const formState = result.ok ? result.data : {};
    let snapshot = JSON.stringify(formState);

    dirtyGuard.register(() => JSON.stringify(formState) !== snapshot);

    const errorBox = element("p", { className: "admin-field-error", "aria-live": "polite" });
    const form = element("div", { className: "admin-settings-form" });

    form.appendChild(
      createTextField({ label: "Nome da organização", required: true, value: formState.organizationName, onInput: (v) => (formState.organizationName = v) }).root
    );
    form.appendChild(
      createTextareaField({ label: "Descrição curta", value: formState.shortDescription, rows: 2, onInput: (v) => (formState.shortDescription = v) }).root
    );

    form.appendChild(createTextField({ label: "E-mail", value: formState.email, onInput: (v) => (formState.email = v) }).root);
    form.appendChild(
      createCheckboxField({ label: "E-mail ainda é um placeholder a validar", value: formState.emailIsPlaceholder, onInput: (v) => (formState.emailIsPlaceholder = v) })
        .root
    );

    form.appendChild(createTextField({ label: "Telefone", value: formState.phone, onInput: (v) => (formState.phone = v) }).root);
    form.appendChild(
      createCheckboxField({ label: "Telefone ainda é um placeholder a validar", value: formState.phoneIsPlaceholder, onInput: (v) => (formState.phoneIsPlaceholder = v) })
        .root
    );

    form.appendChild(createTextField({ label: "WhatsApp (link https://wa.me/...)", value: formState.whatsapp, onInput: (v) => (formState.whatsapp = v) }).root);
    form.appendChild(
      createCheckboxField({
        label: "WhatsApp ainda é um placeholder a validar",
        value: formState.whatsappIsPlaceholder,
        onInput: (v) => (formState.whatsappIsPlaceholder = v),
      }).root
    );

    form.appendChild(createTextField({ label: "Instagram (link completo)", value: formState.instagram, onInput: (v) => (formState.instagram = v) }).root);
    form.appendChild(
      createCheckboxField({
        label: "Instagram ainda é um placeholder a validar",
        value: formState.instagramIsPlaceholder,
        onInput: (v) => (formState.instagramIsPlaceholder = v),
      }).root
    );

    form.appendChild(createTextField({ label: "Endereço", value: formState.address, onInput: (v) => (formState.address = v) }).root);
    form.appendChild(
      createCheckboxField({
        label: "Endereço ainda é um placeholder a validar",
        value: formState.addressIsPlaceholder,
        onInput: (v) => (formState.addressIsPlaceholder = v),
      }).root
    );

    form.appendChild(mediaPickerField("Logo", "logoMediaId", formState, shell, () => {}));
    form.appendChild(mediaPickerField("Favicon", "faviconMediaId", formState, shell, () => {}));

    form.appendChild(
      createTextField({ label: "Título SEO padrão", required: true, value: formState.seoTitle, onInput: (v) => (formState.seoTitle = v) }).root
    );
    form.appendChild(
      createTextareaField({ label: "Descrição SEO padrão", required: true, value: formState.seoDescription, onInput: (v) => (formState.seoDescription = v) }).root
    );

    const saveButton = element(
      "button",
      {
        type: "button",
        className: "admin-btn admin-btn--primary",
        onClick: async () => {
          const payload = clone(formState);
          const saveResult = await settingsRepository.update(payload);
          if (!saveResult.ok) {
            const messages = (saveResult.error.errors || [saveResult.error]).map((err) => err.message);
            errorBox.textContent = messages.join(" ");
            return;
          }
          errorBox.textContent = "";
          Object.assign(formState, saveResult.data);
          snapshot = JSON.stringify(formState);
          shell.showToast("Configurações salvas.");
        },
      },
      [element("span", { text: "Salvar configurações" })]
    );

    clearChildren(container);
    container.appendChild(errorBox);
    container.appendChild(form);
    container.appendChild(element("div", { className: "admin-form-actions" }, [saveButton]));
  },

  unmount() {
    dirtyGuard.release();
    mediaRepository.releaseAllPreviewUrls();
  },
};
