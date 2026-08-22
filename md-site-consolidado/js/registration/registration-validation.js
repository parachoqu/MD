import { STEPS } from "./registration-form.js";

export function validateStep(stepIndex, state, event) {
  const step = STEPS[stepIndex]?.id;
  const errors = {};

  if (step === "team") validateTeam(errors, state);
  if (step === "responsible") validateResponsible(errors, state);
  if (step === "participants") validateParticipants(errors, state, event);
  if (step === "review") validateReview(errors, state, event);

  return errors;
}

export function validateAll(state, event) {
  return STEPS.reduce((result, _, index) => {
    return {
      ...result,
      ...validateStep(index, state, event),
    };
  }, {});
}

export function firstInvalidStep(errors) {
  const keys = Object.keys(errors);
  if (keys.some((key) => key.startsWith("team."))) return 0;
  if (keys.some((key) => key.startsWith("responsible."))) return 1;
  if (keys.some((key) => key.startsWith("category") || key.startsWith("participants"))) return 2;
  return 3;
}

function validateTeam(errors, state) {
  required(errors, "team.name", state.team.name, "Informe o nome da equipe.");
  required(errors, "team.city", state.team.city, "Informe a cidade da equipe.");
  required(errors, "team.state", state.team.state, "Informe o estado.");
}

function validateResponsible(errors, state) {
  required(errors, "responsible.name", state.responsible.name, "Informe o nome do responsável.");
  required(errors, "responsible.email", state.responsible.email, "Informe o e-mail do responsável.");
  required(errors, "responsible.phone", state.responsible.phone, "Informe o WhatsApp do responsável.");

  if (state.responsible.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.responsible.email.trim())) {
    errors["responsible.email"] = "Informe um e-mail válido.";
  }

  const phoneDigits = String(state.responsible.phone || "").replace(/\D/g, "");
  if (state.responsible.phone && phoneDigits.length < 10) {
    errors["responsible.phone"] = "Informe um WhatsApp com DDD.";
  }
}

function validateParticipants(errors, state, event) {
  const config = event.registrationConfig || {};
  const min = Number(config.minParticipants || 1);
  const max = Number(config.maxParticipants || 0);

  required(errors, "categoryId", state.categoryId, "Selecione a categoria.");

  if (!state.participants.length) {
    errors.participants = "Adicione pelo menos um atleta.";
  }

  if (state.participants.length < min) {
    errors.participants = `Adicione pelo menos ${min} atletas.`;
  }

  if (max && state.participants.length > max) {
    errors.participants = `Este evento demonstrativo aceita no máximo ${max} atletas.`;
  }

  state.participants.forEach((participant) => {
    required(errors, `participants.${participant.id}.name`, participant.name, "Informe o nome do atleta.");

    if (config.birthDateRequired !== false) {
      required(
        errors,
        `participants.${participant.id}.birthDate`,
        participant.birthDate,
        "Informe a data de nascimento."
      );
    }

    if (config.jerseyNumberRequired) {
      required(
        errors,
        `participants.${participant.id}.jerseyNumber`,
        participant.jerseyNumber,
        "Informe o número da camisa."
      );
    }
  });
}

function validateReview(errors, state, event) {
  validateTeam(errors, state);
  validateResponsible(errors, state);
  validateParticipants(errors, state, event);

  if (!state.consent) {
    errors.consent = "Confirme que as informações fornecidas estão corretas.";
  }

  if (event.regulation?.available && !state.regulationConsent) {
    errors.regulationConsent = "Aceite o regulamento para concluir.";
  }
}

function required(errors, key, value, message) {
  if (!String(value || "").trim()) {
    errors[key] = message;
  }
}
