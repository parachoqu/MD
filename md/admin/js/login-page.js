// Logica da tela de login. Nao ha credencial pre-preenchida no HTML: o unico
// dado restaurado automaticamente e o e-mail lembrado (nunca a senha).

import { authService } from "./auth/auth-service.js";
import { redirectIfAuthenticated } from "./auth/auth-guard.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("loginPassword");
const emailError = document.getElementById("loginEmailError");
const passwordError = document.getElementById("loginPasswordError");
const formError = document.getElementById("loginError");
const submitButton = document.getElementById("loginSubmit");
const submitLabel = document.getElementById("loginSubmitLabel");
const toggleButton = document.getElementById("togglePassword");
const rememberCheckbox = document.getElementById("rememberEmail");
const sessionExpiredNotice = document.getElementById("sessionExpiredNotice");
const forgotToggle = document.getElementById("forgotPasswordToggle");
const forgotPanel = document.getElementById("forgotPasswordPanel");
const forgotForm = document.getElementById("forgotPasswordForm");
const forgotEmailInput = document.getElementById("forgotEmail");
const forgotStatus = document.getElementById("forgotPasswordStatus");

function clearErrors() {
  formError.hidden = true;
  formError.textContent = "";
  emailError.textContent = "";
  passwordError.textContent = "";
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitLabel.textContent = isLoading ? "Entrando…" : "Entrar";
}

toggleButton.addEventListener("click", () => {
  const isCurrentlyPassword = passwordInput.type === "password";
  passwordInput.type = isCurrentlyPassword ? "text" : "password";
  toggleButton.textContent = isCurrentlyPassword ? "Ocultar" : "Mostrar";
  toggleButton.setAttribute("aria-pressed", String(isCurrentlyPassword));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email) {
    emailError.textContent = "Informe seu e-mail.";
    emailInput.focus();
    return;
  }
  if (!password) {
    passwordError.textContent = "Informe sua senha.";
    passwordInput.focus();
    return;
  }

  setLoading(true);
  const result = await authService.signIn({ email, password });
  setLoading(false);

  if (!result.ok) {
    formError.textContent = result.error.message;
    formError.hidden = false;
    emailInput.focus();
    return;
  }

  authService.setRememberedEmail(rememberCheckbox.checked ? email : null);
  window.location.href = "index.html#dashboard";
});

forgotToggle.addEventListener("click", () => {
  const isOpen = !forgotPanel.hidden;
  forgotPanel.hidden = isOpen;
  forgotToggle.setAttribute("aria-expanded", String(!isOpen));
  if (!isOpen) forgotEmailInput.focus();
});

forgotForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  forgotStatus.textContent = "Registrando solicitação…";
  const result = await authService.requestPasswordReset(forgotEmailInput.value.trim());
  forgotStatus.textContent = result.ok
    ? result.data.message
    : result.error.message;
});

async function init() {
  const alreadyAuthenticated = await redirectIfAuthenticated();
  if (alreadyAuthenticated) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get("expired") === "1") {
    sessionExpiredNotice.hidden = false;
  }
  if (params.get("unavailable") === "1") {
    sessionExpiredNotice.hidden = false;
    sessionExpiredNotice.textContent = "O backend administrativo esta indisponivel. Nenhum dado local foi usado como alternativa.";
  }

  const rememberedEmail = authService.getRememberedEmail();
  if (rememberedEmail) {
    emailInput.value = rememberedEmail;
    rememberCheckbox.checked = true;
  }
}

init();
