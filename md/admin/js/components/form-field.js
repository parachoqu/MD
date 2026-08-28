// Campos de formulario reutilizados por todos os editores (evento, projeto,
// conteudo, configuracoes): rotulo associado, erro inline com aria-live,
// aria-invalid quando ha erro, e um metodo focus() usado pelo resumo de erros
// para levar o foco ao primeiro campo invalido.

import { element } from "../dom.js";

let uid = 0;
function nextId(prefix) {
  uid += 1;
  return prefix + "-" + uid;
}

function wrapField(labelText, required, input, errorEl, extra) {
  const id = input.id;
  const children = [element("label", { for: id, text: labelText + (required ? " *" : "") }), input];
  if (extra) children.push(extra);
  children.push(errorEl);
  return element("div", { className: "admin-field" }, children);
}

export function createTextField(config) {
  const id = config.id || nextId("field");
  const input = element("input", {
    id,
    className: "admin-input",
    type: config.type || "text",
    required: Boolean(config.required),
    "aria-describedby": id + "-error",
  });
  if (config.value !== undefined && config.value !== null) input.value = config.value;
  if (config.placeholder) input.placeholder = config.placeholder;
  input.addEventListener("input", () => config.onInput(input.value));

  const errorEl = element("span", { className: "admin-field__error", id: id + "-error", "aria-live": "polite" });

  return {
    root: wrapField(config.label, config.required, input, errorEl),
    input,
    setError(message) {
      errorEl.textContent = message || "";
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    },
    focus() {
      input.focus();
    },
  };
}

export function createTextareaField(config) {
  const id = config.id || nextId("field");
  const input = element("textarea", {
    id,
    className: "admin-textarea",
    required: Boolean(config.required),
    "aria-describedby": id + "-error",
    rows: String(config.rows || 4),
  });
  if (config.value !== undefined && config.value !== null) input.value = config.value;
  input.addEventListener("input", () => config.onInput(input.value));

  const errorEl = element("span", { className: "admin-field__error", id: id + "-error", "aria-live": "polite" });

  return {
    root: wrapField(config.label, config.required, input, errorEl),
    input,
    setError(message) {
      errorEl.textContent = message || "";
      if (message) input.setAttribute("aria-invalid", "true");
      else input.removeAttribute("aria-invalid");
    },
    focus() {
      input.focus();
    },
  };
}

export function createSelectField(config) {
  const id = config.id || nextId("field");
  const options = (config.options || []).map((option) => element("option", { value: option.value, text: option.label }));
  const input = element("select", { id, className: "admin-select", required: Boolean(config.required) }, options);
  if (config.value !== undefined) input.value = config.value;
  input.addEventListener("change", () => config.onInput(input.value));

  const errorEl = element("span", { className: "admin-field__error", id: id + "-error", "aria-live": "polite" });

  return {
    root: wrapField(config.label, config.required, input, errorEl),
    input,
    setError(message) {
      errorEl.textContent = message || "";
    },
    focus() {
      input.focus();
    },
  };
}

export function createCheckboxField(config) {
  const id = config.id || nextId("field");
  const input = element("input", { id, type: "checkbox" });
  input.checked = Boolean(config.value);
  input.addEventListener("change", () => config.onInput(input.checked));

  return {
    root: element("label", { className: "admin-checkbox" }, [input, element("span", { text: config.label })]),
    input,
    setError() {},
    focus() {
      input.focus();
    },
  };
}

export function createNumberField(config) {
  const field = createTextField(Object.assign({}, config, { type: "number" }));
  return field;
}
