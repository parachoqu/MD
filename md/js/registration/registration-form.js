import { CONSENT_VERSION } from "../consent.js";

export const STEPS = [
  { id: "team", label: "Equipe" },
  { id: "responsible", label: "Responsável" },
  { id: "participants", label: "Atletas" },
  { id: "review", label: "Revisão" },
];

export function createInitialState(event, draft = null) {
  const saved = draft?.state || draft || {};

  return {
    team: {
      name: saved.team?.name || "",
      city: saved.team?.city || "",
      state: saved.team?.state || "",
      institution: saved.team?.institution || "",
    },
    responsible: {
      name: saved.responsible?.name || "",
      email: saved.responsible?.email || "",
      phone: saved.responsible?.phone || "",
      role: saved.responsible?.role || "",
    },
    categoryId: saved.categoryId || "",
    participants: normalizeParticipants(saved.participants),
    consent: Boolean(saved.consent),
    regulationConsent: Boolean(saved.regulationConsent),
    registrationType: event.registrationType || "team",
  };
}

export function createParticipant() {
  const id = globalThis.crypto?.randomUUID?.() || `participant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    name: "",
    birthDate: "",
    jerseyNumber: "",
  };
}

export function hasMeaningfulData(state) {
  const teamValues = Object.values(state.team || {});
  const responsibleValues = Object.values(state.responsible || {});
  const participantValues = (state.participants || []).flatMap((participant) => [
    participant.name,
    participant.birthDate,
    participant.jerseyNumber,
  ]);

  return [
    ...teamValues,
    ...responsibleValues,
    state.categoryId,
    ...participantValues,
  ].some((value) => String(value || "").trim());
}

export function getCategory(event, categoryId) {
  return event.categories.find((category) => category.id === categoryId) || null;
}

// Espelha exatamente o schema estrito do servidor: qualquer campo a mais vira 422.
// O id local do participante fica de fora para o payload continuar identico entre
// tentativas, o que mantem o hash de idempotencia estavel.
export function buildSubmissionPayload(event, state) {
  return {
    eventSlug: event.slug,
    registrationType: event.registrationType || "team",
    team: {
      name: text(state.team?.name),
      city: text(state.team?.city),
      state: text(state.team?.state),
      institution: text(state.team?.institution),
    },
    responsible: {
      name: text(state.responsible?.name),
      email: text(state.responsible?.email),
      phone: text(state.responsible?.phone),
      role: text(state.responsible?.role),
    },
    categoryId: text(state.categoryId),
    participants: (state.participants || []).map((participant) => ({
      name: text(participant.name),
      birthDate: text(participant.birthDate),
      jerseyNumber: text(participant.jerseyNumber),
      role: text(participant.role),
    })),
    // O formulario ainda nao coleta comissao tecnica; o servidor aceita a lista vazia.
    staff: [],
    // O envio so acontece depois da validacao exigir o aceite explicito.
    consent: true,
    regulationConsent: Boolean(state.regulationConsent),
    consentVersion: CONSENT_VERSION,
  };
}

function normalizeParticipants(participants) {
  if (!Array.isArray(participants) || participants.length === 0) {
    return [createParticipant()];
  }

  return participants.map((participant) => ({
    id: participant.id || createParticipant().id,
    name: participant.name || "",
    birthDate: participant.birthDate || "",
    jerseyNumber: participant.jerseyNumber || "",
  }));
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}
