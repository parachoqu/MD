// Helpers de DOM compartilhados pelo painel admin. Nenhuma view, componente ou
// diretorio deste projeto deve usar innerHTML/outerHTML com dado editavel pelo
// usuario -- element() e svg() constroem nos via API do DOM, nunca via string.

export const FOCUSABLE_SELECTOR =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

const SVG_NS = "http://www.w3.org/2000/svg";

function applyAttrs(node, attrs) {
  if (!attrs) return;
  Object.keys(attrs).forEach((key) => {
    const value = attrs[key];
    if (value === undefined || value === null || value === false) return;
    if (key === "className") {
      node.setAttribute("class", value);
    } else if (key === "text") {
      node.textContent = value;
    } else if (key === "dataset") {
      Object.keys(value).forEach((dataKey) => {
        node.dataset[dataKey] = value[dataKey];
      });
    } else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, value);
    }
  });
}

// element("button", { className: "btn", text: "Salvar", onClick: fn }, [child1, child2])
export function element(tag, attrs, children) {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  (children || []).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  });
  return node;
}

export function svg(tag, attrs, children) {
  const node = document.createElementNS(SVG_NS, tag);
  applyAttrs(node, attrs);
  (children || []).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.appendChild(child);
  });
  return node;
}

export function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// Ciclo de Tab/Shift+Tab entre o primeiro e o ultimo elemento focavel de `container`,
// reproduzindo o padrao ja usado em js/registration/registration-modal.js e
// js/projects.js no site publico.
export function trapFocus(container, event) {
  if (event.key !== "Tab") return;
  const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (node) => node.offsetParent !== null || node === document.activeElement
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export function focusFirst(container) {
  const target = container.querySelector("[data-autofocus]") || container.querySelector(FOCUSABLE_SELECTOR);
  if (target) target.focus();
}
