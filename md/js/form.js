export function initContactForm() {
  const form = document.getElementById("contactForm");
  const toast = document.getElementById("toast");
  const interest = document.getElementById("interest");

  if (!form) return;

  document.addEventListener("click", (event) => {
    const shortcut = event.target.closest("[data-interest]");
    if (!shortcut || !interest) return;
    interest.value = shortcut.dataset.interest || "";
  });

  form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("input", () => clearError(field));
    field.addEventListener("change", () => clearError(field));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const isValid = validate(form);
    if (!isValid) return;

    const button = form.querySelector("button[type='submit']");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Enviando...";

    window.setTimeout(() => {
      button.disabled = false;
      button.textContent = original;
      form.reset();
      showToast(toast, "Mensagem registrada nesta versão demonstrativa. Conecte um endpoint real antes da publicação.");
    }, 500);
  });
}

function validate(form) {
  let valid = true;
  const requiredFields = Array.from(form.querySelectorAll("[required]"));

  requiredFields.forEach((field) => {
    const empty = field.type === "checkbox" ? !field.checked : !field.value.trim();
    const invalidEmail = field.type === "email" && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
    if (empty || invalidEmail) {
      markError(field);
      valid = false;
    }
  });

  const firstError = form.querySelector(".has-error input, .has-error select, .has-error textarea");
  firstError?.focus();
  return valid;
}

function markError(field) {
  const wrapper = field.closest(".form-field, .checkbox-field");
  wrapper?.classList.add("has-error");
}

function clearError(field) {
  const wrapper = field.closest(".form-field, .checkbox-field");
  wrapper?.classList.remove("has-error");
}

function showToast(toast, message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 5200);
}
