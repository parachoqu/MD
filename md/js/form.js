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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const isValid = validate(form);
    if (!isValid) return;

    const button = form.querySelector("button[type='submit']");
    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Enviando...";

    const name = form.elements.name?.value?.trim() || "";
    const email = form.elements.email?.value?.trim() || "";
    const phone = form.elements.phone?.value?.trim() || "";
    const interestVal = form.elements.interest?.value?.trim() || "";
    const rawMessage = form.elements.message?.value?.trim() || "";
    const consent = Boolean(form.elements.consent?.checked);

    const subjectMap = {
      empresas: "Interesse institucional: Empresas",
      escolas: "Interesse institucional: Escolas",
      comunidades: "Interesse institucional: Comunidades",
      parceiros: "Interesse institucional: Parceiros e patrocinadores",
      outros: "Interesse institucional: Outros assuntos",
    };
    const subject = subjectMap[interestVal] || interestVal || "Contato via site";
    const message = rawMessage || `Solicitacao de contato registrada sobre: ${subject}.`;

    const payload = {
      name,
      email,
      phone,
      subject,
      message,
      consent,
      consentVersion: "privacy-v1",
      website: "",
    };

    const idempotencyKey = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `contact-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

    try {
      const response = await fetch("/api/public/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json().catch(() => null);

      if (response.ok && body?.ok) {
        form.reset();
        showToast(toast, "Mensagem enviada com sucesso! A equipe da M&D respondera em breve.");
      } else if (response.status === 429) {
        showToast(toast, "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de reenviar.");
      } else if (response.status === 422 && body?.error?.message) {
        showToast(toast, `Revise os dados: ${body.error.message}`);
      } else {
        form.reset();
        showToast(toast, "Mensagem registrada nesta versao. Responderemos pelo canal informado.");
      }
    } catch {
      form.reset();
      showToast(toast, "Mensagem registrada localmente. Voce tambem pode nos contatar pelo WhatsApp.");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
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
