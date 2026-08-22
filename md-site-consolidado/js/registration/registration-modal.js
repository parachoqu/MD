import {
  buildRegistration,
  createInitialState,
  createParticipant,
  getCategory,
  hasMeaningfulData,
  STEPS,
} from "./registration-form.js";
import { firstInvalidStep, validateAll, validateStep } from "./registration-validation.js";
import { deleteDraft, getDraft, saveDraft, saveRegistration } from "./registration-storage.js";

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function createRegistrationModal(event, root = document.body) {
  const modal = element("div", {
    className: "registration-modal",
    attrs: { hidden: "" },
  });

  root.append(modal);

  let state = createInitialState(event);
  let currentStep = 0;
  let maxVisitedStep = 0;
  let errors = {};
  let lastTrigger = null;
  let mode = "form";
  let saveTimer = null;
  let closeTimer = null;
  let saveState = "";
  let submitting = false;
  let completedRegistration = null;
  let showSuccessSummary = false;

  modal.addEventListener("click", (clickEvent) => {
    if (clickEvent.target === modal) requestClose();
  });

  document.addEventListener("keydown", (keyEvent) => {
    if (!isOpen()) return;

    if (keyEvent.key === "Escape") {
      keyEvent.preventDefault();
      requestClose();
      return;
    }

    if (keyEvent.key === "Tab") trapFocus(keyEvent);
  });

  function open(trigger) {
    lastTrigger = trigger;
    const draft = getDraft(event.slug);
    state = createInitialState(event, draft);
    currentStep = clampStep(draft?.step || 0);
    maxVisitedStep = currentStep;
    errors = {};
    submitting = false;
    completedRegistration = null;
    showSuccessSummary = false;
    mode = draft && hasMeaningfulData(state) ? "resume" : "form";
    show();
  }

  function show() {
    clearTimeout(closeTimer);
    modal.hidden = false;
    document.body.classList.add("modal-open");
    render();
    window.requestAnimationFrame(() => modal.classList.add("is-open"));
    focusInitial();
  }

  function closeNow() {
    clearTimeout(saveTimer);
    clearTimeout(closeTimer);
    modal.classList.remove("is-open");
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 220;
    closeTimer = window.setTimeout(() => {
      modal.hidden = true;
      document.body.classList.remove("modal-open");
      lastTrigger?.focus();
    }, delay);
  }

  function requestClose() {
    if (mode === "success" || !hasMeaningfulData(state)) {
      closeNow();
      return;
    }

    mode = "close-choice";
    render();
    focusInitial();
  }

  function render() {
    if (mode === "resume") {
      modal.replaceChildren(renderShell(renderResume()));
      return;
    }

    if (mode === "close-choice") {
      modal.replaceChildren(renderShell(renderCloseChoice()));
      return;
    }

    if (mode === "success") {
      modal.replaceChildren(renderShell(renderSuccess()));
      return;
    }

    modal.replaceChildren(renderShell(renderForm()));
  }

  function renderShell(content) {
    const dialog = element("div", {
      className: "registration-dialog",
      attrs: {
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "registrationTitle",
      },
    });

    const header = element("header", { className: "registration-dialog__header" });
    const headingGroup = element("div");
    headingGroup.append(
      element("p", { className: "eyebrow", text: event.demo ? "Inscrição demonstrativa" : "Inscrição" }),
      element("h2", {
        text: mode === "success" ? "Inscrição concluída para demonstração" : "Inscrever equipe",
        attrs: { id: "registrationTitle" },
      }),
      element("p", {
        className: "registration-dialog__event",
        text: event.title,
      })
    );

    const close = element("button", {
      className: "registration-close",
      text: "Fechar",
      attrs: { type: "button", "aria-label": "Fechar inscrição" },
      on: { click: requestClose },
    });

    header.append(headingGroup, close);
    dialog.append(header, content);
    return dialog;
  }

  function renderResume() {
    const content = element("div", { className: "registration-panel registration-panel--choice" });
    content.append(
      element("h3", { text: "Você possui uma inscrição em andamento." }),
      element("p", {
        text: "Continue de onde parou ou comece novamente. Apenas o rascunho deste evento será alterado.",
      })
    );

    const actions = element("div", { className: "registration-actions" });
    actions.append(
      element("button", {
        className: "btn btn--primary",
        text: "Continuar inscrição",
        attrs: { type: "button", "data-autofocus": "" },
        on: {
          click: () => {
            mode = "form";
            render();
            focusInitial();
          },
        },
      }),
      element("button", {
        className: "btn btn--secondary",
        text: "Começar novamente",
        attrs: { type: "button" },
        on: {
          click: () => {
            deleteDraft(event.slug);
            state = createInitialState(event);
            currentStep = 0;
            maxVisitedStep = 0;
            mode = "form";
            render();
            focusInitial();
          },
        },
      })
    );

    content.append(actions);
    return content;
  }

  function renderCloseChoice() {
    const content = element("div", { className: "registration-panel registration-panel--choice" });
    content.append(
      element("h3", { text: "Você possui uma inscrição em andamento." }),
      element("p", {
        text: "Escolha como deseja sair. O descarte limpa somente o rascunho deste evento.",
      })
    );

    const actions = element("div", { className: "registration-actions registration-actions--wrap" });
    actions.append(
      element("button", {
        className: "btn btn--primary",
        text: "Continuar preenchendo",
        attrs: { type: "button", "data-autofocus": "" },
        on: {
          click: () => {
            mode = "form";
            render();
            focusInitial();
          },
        },
      }),
      element("button", {
        className: "btn btn--secondary",
        text: "Salvar e sair",
        attrs: { type: "button" },
        on: {
          click: () => {
            saveNow();
            closeNow();
          },
        },
      }),
      element("button", {
        className: "btn btn--ghost",
        text: "Descartar",
        attrs: { type: "button" },
        on: {
          click: () => {
            deleteDraft(event.slug);
            state = createInitialState(event);
            closeNow();
          },
        },
      })
    );

    content.append(actions);
    return content;
  }

  function renderForm() {
    const wrapper = element("div", { className: "registration-form-shell" });
    wrapper.append(renderStepper(), renderCurrentStep(), renderFooter());
    return wrapper;
  }

  function renderStepper() {
    const stepper = element("div", {
      className: "registration-stepper",
      attrs: { "aria-label": "Etapas da inscrição" },
    });

    const mobileProgress = element("div", { className: "registration-progress" });
    mobileProgress.append(
      element("span", { text: `Etapa ${currentStep + 1} de ${STEPS.length}` }),
      element("progress", {
        attrs: {
          max: String(STEPS.length),
          value: String(currentStep + 1),
          "aria-label": "Progresso da inscrição",
        },
      })
    );

    const list = element("div", { className: "registration-stepper__list" });
    STEPS.forEach((step, index) => {
      const button = element("button", {
        className: stepButtonClass(index),
        attrs: {
          type: "button",
          "aria-current": index === currentStep ? "step" : "false",
          disabled: index > maxVisitedStep ? "" : null,
        },
        on: {
          click: () => {
            if (index > maxVisitedStep) return;
            currentStep = index;
            errors = {};
            render();
            focusInitial();
          },
        },
      });

      button.append(
        element("span", {
          className: "registration-stepper__track",
          attrs: { "aria-hidden": "true" },
        }),
        element("span", {
          className: "registration-stepper__number",
          text: `0${index + 1}`,
        }),
        element("span", { className: "registration-stepper__label", text: step.label })
      );

      list.append(button);
    });

    stepper.append(mobileProgress, list);
    return stepper;
  }

  function renderCurrentStep() {
    const section = element("section", {
      className: "registration-step",
      attrs: { "aria-labelledby": `registrationStep${currentStep}` },
    });

    const title = element("h3", {
      text: STEPS[currentStep].label,
      attrs: { id: `registrationStep${currentStep}` },
    });
    const content = element("div", { className: "registration-step__content" });
    if (currentStep === 0) content.append(renderTeamStep());
    if (currentStep === 1) content.append(renderResponsibleStep());
    if (currentStep === 2) content.append(renderParticipantsStep());
    if (currentStep === 3) content.append(renderReviewStep());

    section.append(title, content);

    return section;
  }

  function renderTeamStep() {
    const grid = element("div", { className: "registration-grid" });
    grid.append(
      renderField("team.name", "Nome da equipe *", state.team.name, "text", "organization"),
      renderField("team.city", "Cidade *", state.team.city, "text", "address-level2"),
      renderField("team.state", "Estado *", state.team.state, "text", "address-level1"),
      renderField("team.institution", "Instituição / Escola / Empresa", state.team.institution, "text", "organization")
    );
    return grid;
  }

  function renderResponsibleStep() {
    const grid = element("div", { className: "registration-grid" });
    grid.append(
      renderField("responsible.name", "Nome completo *", state.responsible.name, "text", "name"),
      renderField("responsible.email", "E-mail *", state.responsible.email, "email", "email"),
      renderField("responsible.phone", "WhatsApp *", state.responsible.phone, "tel", "tel"),
      renderSelect("responsible.role", "Função na equipe", state.responsible.role, [
        ["", "Selecione"],
        ["tecnico", "Técnico"],
        ["dirigente", "Dirigente"],
        ["responsavel", "Responsável"],
        ["outro", "Outro"],
      ])
    );
    return grid;
  }

  function renderParticipantsStep() {
    const wrapper = element("div", { className: "participants-step" });
    const config = event.registrationConfig || {};
    const limitText = [];
    if (config.minParticipants) limitText.push(`mínimo ${config.minParticipants}`);
    if (config.maxParticipants) limitText.push(`máximo ${config.maxParticipants}`);

    const categoryOptions = [
      ["", "Selecione a categoria"],
      ...event.categories.map((category) => [category.id, category.name]),
    ];

    wrapper.append(
      renderSelect("categoryId", "Categoria *", state.categoryId, categoryOptions),
      element("p", {
        className: "registration-help",
        text: limitText.length
          ? `Configuração demonstrativa de elenco: ${limitText.join(", ")} atletas.`
          : "As regras oficiais de elenco serão aplicadas quando estiverem disponíveis.",
      })
    );

    if (errors.participants) {
      wrapper.append(element("p", { className: "registration-error-text", text: errors.participants }));
    }

    const list = element("div", { className: "participants-list" });
    state.participants.forEach((participant, index) => {
      list.append(renderParticipant(participant, index));
    });

    const add = element("button", {
      className: "btn btn--secondary",
      text: "Adicionar atleta",
      attrs: {
        type: "button",
        disabled: config.maxParticipants && state.participants.length >= config.maxParticipants ? "" : null,
      },
      on: {
        click: () => {
          state.participants.push(createParticipant());
          errors = {};
          scheduleDraft();
          render();
          focusInitial("[data-new-participant] input");
        },
      },
    });

    wrapper.append(list, add);
    return wrapper;
  }

  function renderParticipant(participant, index) {
    const card = element("article", {
      className: "participant-card",
      attrs: index === state.participants.length - 1 ? { "data-new-participant": "" } : {},
    });

    const header = element("header", { className: "participant-card__header" });
    header.append(element("h4", { text: `Atleta ${index + 1}` }));

    const remove = element("button", {
      className: "participant-remove",
      text: "Remover",
      attrs: {
        type: "button",
        disabled: state.participants.length === 1 ? "" : null,
      },
      on: {
        click: () => {
          if (state.participants.length === 1) return;
          state.participants = state.participants.filter((item) => item.id !== participant.id);
          errors = {};
          scheduleDraft();
          render();
        },
      },
    });
    header.append(remove);

    const grid = element("div", { className: "registration-grid" });
    grid.append(
      renderField(`participants.${participant.id}.name`, "Nome completo *", participant.name),
      renderField(`participants.${participant.id}.birthDate`, "Data de nascimento *", participant.birthDate, "date"),
      renderField(`participants.${participant.id}.jerseyNumber`, "Número da camisa", participant.jerseyNumber, "number")
    );

    card.append(header, grid);
    return card;
  }

  function renderReviewStep() {
    const wrapper = element("div", { className: "registration-review" });
    const category = getCategory(event, state.categoryId);

    wrapper.append(
      renderReviewBlock("Evento", [
        ["Evento", event.title],
        ["Status", event.demo ? "Evento demonstrativo" : "Evento real"],
      ]),
      renderReviewBlock(
        "Equipe",
        [
          ["Nome", state.team.name],
          ["Cidade/UF", [state.team.city, state.team.state].filter(Boolean).join(" / ")],
          ["Instituição", state.team.institution || "Não informada"],
        ],
        0
      ),
      renderReviewBlock(
        "Categoria",
        [
          ["Selecionada", category?.name || "Não selecionada"],
          ["Quantidade de atletas", String(state.participants.length)],
        ],
        2
      ),
      renderReviewBlock(
        "Responsável",
        [
          ["Nome", state.responsible.name],
          ["E-mail", state.responsible.email],
          ["WhatsApp", state.responsible.phone],
          ["Função", state.responsible.role || "Não informada"],
        ],
        1
      ),
      renderParticipantsReview()
    );

    wrapper.append(renderConsent("consent", "Declaro que as informações fornecidas estão corretas."));

    if (event.regulation?.available) {
      wrapper.append(renderConsent("regulationConsent", "Li e aceito o regulamento do evento."));
    }

    wrapper.append(
      element("p", {
        className: "registration-demo-note",
        text: "Demonstração frontend - nenhum dado será enviado para um servidor.",
      })
    );

    return wrapper;
  }

  function renderReviewBlock(title, rows, editStep = null) {
    const block = element("section", { className: "review-block" });
    const header = element("header", { className: "review-block__header" });
    header.append(element("h4", { text: title }));

    if (editStep !== null) {
      header.append(
        element("button", {
          className: "link-action",
          text: "Editar",
          attrs: { type: "button" },
          on: {
            click: () => {
              currentStep = editStep;
              maxVisitedStep = Math.max(maxVisitedStep, editStep);
              errors = {};
              render();
              focusInitial();
            },
          },
        })
      );
    }

    const list = element("dl", { className: "review-list" });
    rows.forEach(([label, value]) => {
      list.append(element("dt", { text: label }), element("dd", { text: value || "A confirmar" }));
    });

    block.append(header, list);
    return block;
  }

  function renderParticipantsReview() {
    const block = element("section", { className: "review-block" });
    const header = element("header", { className: "review-block__header" });
    header.append(element("h4", { text: "Atletas" }));
    header.append(
      element("button", {
        className: "link-action",
        text: "Editar",
        attrs: { type: "button" },
        on: {
          click: () => {
            currentStep = 2;
            errors = {};
            render();
            focusInitial();
          },
        },
      })
    );

    const list = element("ol", { className: "review-participants" });
    state.participants.forEach((participant) => {
      const item = element("li");
      item.append(
        element("strong", { text: participant.name || "Nome não informado" }),
        element("span", {
          text: [participant.birthDate || "Nascimento não informado", participant.jerseyNumber ? `Camisa ${participant.jerseyNumber}` : null]
            .filter(Boolean)
            .join(" · "),
        })
      );
      list.append(item);
    });

    block.append(header, list);
    return block;
  }

  function renderConsent(key, label) {
    const wrapper = element("label", {
      className: `registration-checkbox ${errors[key] ? "has-error" : ""}`,
      attrs: { "data-error-key": key },
    });

    const checkbox = element("input", {
      attrs: {
        type: "checkbox",
        checked: state[key] ? "" : null,
        "aria-invalid": errors[key] ? "true" : "false",
      },
      on: {
        change: (changeEvent) => {
          state[key] = changeEvent.target.checked;
          delete errors[key];
          scheduleDraft();
          wrapper.classList.remove("has-error");
        },
      },
    });

    const text = element("span", { text: label });
    const error = element("small", { className: "registration-field-error", text: errors[key] || "" });
    wrapper.append(checkbox, text, error);
    return wrapper;
  }

  function renderFooter() {
    const footer = element("footer", { className: "registration-dialog__footer" });
    const save = element("span", {
      className: "registration-save",
      text: saveState,
      attrs: { "aria-live": "polite" },
    });

    const actions = element("div", { className: "registration-actions" });

    if (currentStep > 0) {
      actions.append(
        element("button", {
          className: "btn btn--ghost",
          text: "Voltar",
          attrs: { type: "button" },
          on: {
            click: () => {
              currentStep -= 1;
              errors = {};
              render();
              focusInitial();
            },
          },
        })
      );
    }

    actions.append(
      element("button", {
        className: "btn btn--primary",
        text: currentStep === STEPS.length - 1 ? (submitting ? "Confirmando..." : "Confirmar inscrição") : "Continuar",
        attrs: {
          type: "button",
          disabled: submitting ? "" : null,
          "data-autofocus": currentStep === 0 ? "" : null,
        },
        on: {
          click: currentStep === STEPS.length - 1 ? confirmRegistration : goNext,
        },
      })
    );

    footer.append(save, actions);
    return footer;
  }

  function renderSuccess() {
    const content = element("div", { className: "registration-panel registration-success" });
    content.append(
      element("h3", { text: "Inscrição concluída para demonstração" }),
      renderProtocolRow("Equipe", completedRegistration?.team?.name || "Equipe"),
      renderProtocolRow("Evento", event.title),
      renderProtocolRow("Protocolo", completedRegistration?.protocol || "MD-DEMO"),
      element("p", {
        className: "registration-demo-note",
        text: "Demonstração frontend - nenhum dado foi enviado para um servidor.",
      })
    );

    if (showSuccessSummary && completedRegistration) {
      content.append(renderFinalSummary(completedRegistration));
    }

    const actions = element("div", { className: "registration-actions" });
    actions.append(
      element("button", {
        className: "btn btn--secondary",
        text: showSuccessSummary ? "Ocultar resumo" : "Ver resumo",
        attrs: { type: "button" },
        on: {
          click: () => {
            showSuccessSummary = !showSuccessSummary;
            render();
            focusInitial();
          },
        },
      }),
      element("button", {
        className: "btn btn--primary",
        text: "Fechar",
        attrs: { type: "button", "data-autofocus": "" },
        on: { click: closeNow },
      })
    );

    content.append(actions);
    return content;
  }

  function renderProtocolRow(label, value) {
    const row = element("div", { className: "protocol-row" });
    row.append(element("span", { text: label }), element("strong", { text: value }));
    return row;
  }

  function renderFinalSummary(registration) {
    const block = element("section", { className: "review-block" });
    block.append(element("h4", { text: "Resumo salvo localmente" }));
    const list = element("dl", { className: "review-list" });
    [
      ["Categoria", registration.category?.name],
      ["Responsável", registration.responsible?.name],
      ["Contato", `${registration.responsible?.email} · ${registration.responsible?.phone}`],
      ["Atletas", String(registration.participants?.length || 0)],
    ].forEach(([label, value]) => {
      list.append(element("dt", { text: label }), element("dd", { text: value || "Não informado" }));
    });
    block.append(list);
    return block;
  }

  function renderField(path, label, value, type = "text", autocomplete = null) {
    const id = fieldId(path);
    const wrapper = element("div", {
      className: `registration-field ${errors[path] ? "has-error" : ""}`,
      attrs: { "data-error-key": path },
    });
    const input = element("input", {
      attrs: {
        id,
        type,
        autocomplete,
        "aria-invalid": errors[path] ? "true" : "false",
        "aria-describedby": errors[path] ? `${id}-error` : null,
      },
      on: {
        input: (inputEvent) => {
          setValue(path, inputEvent.target.value);
          clearFieldError(path, wrapper, inputEvent.target);
          scheduleDraft();
        },
      },
    });
    input.value = value || "";

    wrapper.append(
      element("label", { text: label, attrs: { for: id } }),
      input,
      element("small", { className: "registration-field-error", text: errors[path] || "", attrs: { id: `${id}-error` } })
    );

    return wrapper;
  }

  function renderSelect(path, label, value, options) {
    const id = fieldId(path);
    const wrapper = element("div", {
      className: `registration-field ${errors[path] ? "has-error" : ""}`,
      attrs: { "data-error-key": path },
    });
    const select = element("select", {
      attrs: {
        id,
        "aria-invalid": errors[path] ? "true" : "false",
        "aria-describedby": errors[path] ? `${id}-error` : null,
      },
      on: {
        change: (changeEvent) => {
          setValue(path, changeEvent.target.value);
          clearFieldError(path, wrapper, changeEvent.target);
          scheduleDraft();
        },
      },
    });

    options.forEach(([optionValue, labelText]) => {
      const option = element("option", { text: labelText, attrs: { value: optionValue } });
      option.selected = optionValue === value;
      select.append(option);
    });

    wrapper.append(
      element("label", { text: label, attrs: { for: id } }),
      select,
      element("small", { className: "registration-field-error", text: errors[path] || "", attrs: { id: `${id}-error` } })
    );

    return wrapper;
  }

  function goNext() {
    errors = validateStep(currentStep, state, event);
    if (Object.keys(errors).length) {
      render();
      focusFirstError();
      return;
    }

    currentStep = clampStep(currentStep + 1);
    maxVisitedStep = Math.max(maxVisitedStep, currentStep);
    saveNow();
    render();
    focusInitial();
  }

  function confirmRegistration() {
    if (submitting) return;

    errors = validateAll(state, event);
    if (Object.keys(errors).length) {
      currentStep = firstInvalidStep(errors);
      maxVisitedStep = Math.max(maxVisitedStep, currentStep);
      render();
      focusFirstError();
      return;
    }

    submitting = true;
    render();

    window.setTimeout(() => {
      completedRegistration = buildRegistration(event, state);
      saveRegistration(completedRegistration);
      deleteDraft(event.slug);
      submitting = false;
      mode = "success";
      saveState = "";
      render();
      focusInitial();
    }, 320);
  }

  function scheduleDraft() {
    saveState = "Salvando rascunho...";
    updateSaveText();
    clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      saveNow();
      updateSaveText();
    }, 450);
  }

  function saveNow() {
    if (!hasMeaningfulData(state)) return;
    const saved = saveDraft(event.slug, { state, step: currentStep });
    saveState = saved ? "Rascunho salvo" : "Rascunho mantido nesta sessão";
  }

  function updateSaveText() {
    const save = modal.querySelector(".registration-save");
    if (save) save.textContent = saveState;
  }

  function setValue(path, value) {
    if (path === "categoryId") {
      state.categoryId = value;
      return;
    }

    if (path.startsWith("team.")) {
      state.team[path.split(".")[1]] = value;
      return;
    }

    if (path.startsWith("responsible.")) {
      state.responsible[path.split(".")[1]] = value;
      return;
    }

    if (path.startsWith("participants.")) {
      const [, id, field] = path.split(".");
      const participant = state.participants.find((item) => item.id === id);
      if (participant) participant[field] = value;
    }
  }

  function clearFieldError(path, wrapper, field) {
    delete errors[path];
    wrapper.classList.remove("has-error");
    field.removeAttribute("aria-describedby");
    field.setAttribute("aria-invalid", "false");
    const message = wrapper.querySelector(".registration-field-error");
    if (message) message.textContent = "";
  }

  function focusFirstError() {
    const key = Object.keys(errors)[0];
    if (!key) return;
    focusInitial(`[data-error-key="${cssEscape(key)}"] input, [data-error-key="${cssEscape(key)}"] select, [data-error-key="${cssEscape(key)}"] button`);
  }

  function focusInitial(selector = "[data-autofocus], input, select, button, a[href]") {
    window.setTimeout(() => {
      const target = modal.querySelector(selector);
      if (target) target.focus();
    }, 0);
  }

  function trapFocus(event) {
    const focusable = Array.from(modal.querySelectorAll(FOCUSABLE)).filter((item) => item.offsetParent !== null);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function isOpen() {
    return modal.classList.contains("is-open");
  }

  function stepButtonClass(index) {
    const classes = ["registration-stepper__button"];
    if (index === currentStep) classes.push("is-active");
    if (index < currentStep) classes.push("is-complete");
    return classes.join(" ");
  }

  function clampStep(step) {
    return Math.max(0, Math.min(STEPS.length - 1, Number(step) || 0));
  }

  return { open };
}

function element(tag, options = {}) {
  const node = document.createElement(tag);

  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;

  Object.entries(options.attrs || {}).forEach(([name, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (value === true || value === "") node.setAttribute(name, "");
    else node.setAttribute(name, value);
  });

  Object.entries(options.on || {}).forEach(([eventName, handler]) => {
    node.addEventListener(eventName, handler);
  });

  return node;
}

function fieldId(path) {
  return `registration-${path.replace(/[^a-z0-9]+/gi, "-")}`;
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/"/g, '\\"');
}
