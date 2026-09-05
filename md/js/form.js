import { apiPost } from "./api/public-client.js";
import { CONSENT_VERSION } from "./consent.js";

const CONTACT_ENDPOINT = "/api/public/contact";
const IDEMPOTENCY_STORAGE_KEY = "md.contact.idempotency.v1";
// Mesmo padrao aceito por readIdempotencyKey no servidor.
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9._:-]{8,200}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOAST_DURATION_MS = 5200;

// O select guarda apenas o slug; o servidor exige texto legivel em `subject`.
const SUBJECT_LABELS = {
  empresas: "Empresas",
  escolas: "Escolas",
  comunidades: "Comunidades",
  parceiros: "Parceiros e patrocinadores",
  outros: "Outros assuntos",
};

// Chaves do schema de contato (server/validation/submissions.js) -> campo do formulario.
const FIELD_BY_SERVER_KEY = {
  name: "name",
  email: "email",
  phone: "phone",
  subject: "interest",
  message: "message",
  consent: "consent",
};

// Texto original de cada .form-error, para restaurar depois de mostrar mensagem do servidor.
const defaultMessages = new WeakMap();

export function initContactForm() {
  const form = document.getElementById("contactForm");
  const toast = document.getElementById("toast");
  const interest = document.getElementById("interest");

  if (!form) return;

  form.querySelectorAll(".form-error").forEach((slot) => {
    defaultMessages.set(slot, slot.textContent);
  });

  document.addEventListener("click", (event) => {
    const shortcut = event.target.closest("[data-interest]");
    if (!shortcut || !interest) return;
    interest.value = shortcut.dataset.interest || "";
  });

  form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => clearError(field));
    field.addEventListener("change", () => clearError(field));
  });

  let sending = false;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    // Guard de concorrencia: clique duplo ou Enter repetido nao gera segunda requisicao.
    if (sending) return;
    if (!validate(form)) return;

    const button = form.querySelector("button[type='submit']");
    const originalLabel = button ? button.textContent : "";
    sending = true;
    if (button) {
      button.disabled = true;
      button.textContent = "Enviando...";
    }

    // A chave sobrevive a falha de rede: reenviar a mesma mensagem nao duplica o registro.
    const idempotencyKey = ensureIdempotencyKey();
    let result;
    try {
      result = await apiPost(CONTACT_ENDPOINT, buildContactPayload(form), { idempotencyKey });
    } finally {
      sending = false;
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }

    if (result?.ok) {
      clearIdempotencyKey();
      form.reset();
      resetErrors(form);
      showToast(toast, "Mensagem enviada. A equipe responde pelo canal informado.");
      return;
    }

    handleFailure(form, toast, result?.error);
  });
}

function buildContactPayload(form) {
  const honeypot = control(form, "website");
  return {
    name: trimmedValue(form, "name"),
    email: trimmedValue(form, "email"),
    phone: trimmedValue(form, "phone"),
    subject: subjectLabel(control(form, "interest")),
    message: trimmedValue(form, "message"),
    consent: true,
    consentVersion: CONSENT_VERSION,
    // Honeypot sem trim: espaco em branco tambem denuncia preenchimento automatico.
    website: honeypot ? String(honeypot.value || "") : "",
  };
}

function control(form, name) {
  return form.elements.namedItem(name);
}

function trimmedValue(form, name) {
  const field = control(form, name);
  return field ? String(field.value || "").trim() : "";
}

function subjectLabel(select) {
  if (!select) return "";
  const value = String(select.value || "").trim();
  if (SUBJECT_LABELS[value]) return SUBJECT_LABELS[value];
  // Fallback pelo rotulo visivel: o servidor recusa `subject` vazio.
  const option = select.selectedOptions?.[0];
  return option ? option.textContent.trim() : value;
}

function handleFailure(form, toast, error) {
  const fault = error || {};
  const code = String(fault.code || "");
  const status = Number(fault.status || 0);

  if (code === "validation_error" || status === 422) {
    // Payload recusado: a proxima tentativa e outra submissao e precisa de chave nova.
    clearIdempotencyKey();
    const marked = applyServerFields(form, fault.fields);
    showToast(
      toast,
      marked
        ? "Corrija os campos indicados e envie novamente."
        : "Não foi possível validar o envio. Recarregue a página e tente de novo."
    );
    return;
  }

  if (code === "idempotency_conflict") {
    // A chave ja foi usada com outro conteudo; recomeçar limpo evita o conflito.
    clearIdempotencyKey();
    showToast(toast, "A solicitação mudou desde a última tentativa. Envie novamente.");
    return;
  }

  if (status === 409) {
    // Mesma submissao ainda em processamento: manter a chave para o retry repetir a resposta.
    showToast(toast, fault.message || "A mesma solicitação ainda está sendo processada. Aguarde alguns instantes.");
    return;
  }

  if (code === "rate_limited" || status === 429) {
    const wait = Number(fault.retryAfter);
    showToast(
      toast,
      Number.isFinite(wait) && wait > 0
        ? `Muitas tentativas. Aguarde ${wait} ${wait === 1 ? "segundo" : "segundos"} e envie novamente.`
        : "Muitas tentativas seguidas. Aguarde um instante antes de enviar novamente."
    );
    return;
  }

  // offline, timeout e 5xx mantem a chave: o retry reaproveita a mesma tentativa.
  showToast(toast, unavailableMessage(fault, code, status));
}

function unavailableMessage(fault, code, status) {
  if (code === "offline") return "Sem conexão com o servidor. Sua mensagem não foi enviada; tente novamente.";
  if (code === "timeout") return "O envio demorou demais. Tente de novo — a mensagem não será duplicada.";
  if (code === "aborted") return "Envio cancelado. Tente novamente quando quiser.";
  if (status >= 500 || status === 0) return "Serviço indisponível no momento. Tente novamente em instantes.";
  return fault.message || "Não foi possível enviar sua mensagem agora. Tente novamente.";
}

function applyServerFields(form, fields) {
  if (!fields || typeof fields !== "object") return false;
  let firstInvalid = null;

  Object.entries(fields).forEach(([key, message]) => {
    const name = FIELD_BY_SERVER_KEY[key];
    const field = name ? control(form, name) : null;
    // consentVersion, website e _form nao tem campo visivel: viram mensagem geral.
    if (!field) return;
    markError(field, typeof message === "string" ? message : "");
    if (!firstInvalid) firstInvalid = field;
  });

  firstInvalid?.focus();
  return Boolean(firstInvalid);
}

function validate(form) {
  let valid = true;
  // Limpa marcacoes da tentativa anterior para nao misturar erro velho com novo.
  resetErrors(form);
  const requiredFields = Array.from(form.querySelectorAll("[required]"));

  requiredFields.forEach((field) => {
    const empty = field.type === "checkbox" ? !field.checked : !field.value.trim();
    const invalidEmail = field.type === "email" && field.value && !EMAIL_PATTERN.test(field.value);
    if (empty || invalidEmail) {
      markError(field);
      valid = false;
    }
  });

  const firstError = form.querySelector(".has-error input, .has-error select, .has-error textarea");
  firstError?.focus();
  return valid;
}

function markError(field, message) {
  const wrapper = field.closest(".form-field, .checkbox-field");
  if (!wrapper) return;
  wrapper.classList.add("has-error");
  const slot = wrapper.querySelector(".form-error");
  // textContent: mensagem vinda da API nunca e interpretada como HTML.
  if (slot && message) slot.textContent = message;
}

function clearError(field) {
  const wrapper = field.closest(".form-field, .checkbox-field");
  if (!wrapper) return;
  wrapper.classList.remove("has-error");
  restoreMessage(wrapper);
}

function resetErrors(form) {
  form.querySelectorAll(".has-error").forEach((wrapper) => {
    wrapper.classList.remove("has-error");
    restoreMessage(wrapper);
  });
}

function restoreMessage(wrapper) {
  const slot = wrapper.querySelector(".form-error");
  const original = slot ? defaultMessages.get(slot) : undefined;
  if (slot && typeof original === "string") slot.textContent = original;
}

// sessionStorage pode lancar em navegacao privada ou com storage bloqueado.
function sessionStore() {
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

function ensureIdempotencyKey() {
  const store = sessionStore();
  try {
    const saved = store?.getItem(IDEMPOTENCY_STORAGE_KEY);
    if (saved && IDEMPOTENCY_PATTERN.test(saved)) return saved;
  } catch {
    // Sem storage o envio continua; apenas o retry deixa de ser idempotente.
  }

  const key = createIdempotencyKey();
  try {
    store?.setItem(IDEMPOTENCY_STORAGE_KEY, key);
  } catch {
    // Ignora: a chave ainda vale para esta tentativa.
  }
  return key;
}

function clearIdempotencyKey() {
  try {
    sessionStore()?.removeItem(IDEMPOTENCY_STORAGE_KEY);
  } catch {
    // Nada a limpar quando o storage esta indisponivel.
  }
}

function createIdempotencyKey() {
  const source = globalThis.crypto;
  if (typeof source?.randomUUID === "function") return source.randomUUID();
  if (typeof source?.getRandomValues === "function") {
    const bytes = source.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  // Ultimo recurso, ainda dentro do formato aceito pelo servidor.
  return `contact-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function showToast(toast, message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  // Um timer por vez: mensagem nova nao e apagada pelo temporizador da anterior.
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), TOAST_DURATION_MS);
}
