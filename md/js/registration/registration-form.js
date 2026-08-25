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
  const id = window.crypto?.randomUUID?.() || `participant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

export function buildRegistration(event, state) {
  const now = new Date().toISOString();
  const protocol = generateProtocol();

  return {
    id: window.crypto?.randomUUID?.() || protocol,
    protocol,
    eventId: event.id,
    eventSlug: event.slug,
    registrationType: event.registrationType || "team",
    createdAt: now,
    team: trimObject(state.team),
    responsible: trimObject(state.responsible),
    category: getCategory(event, state.categoryId),
    participants: state.participants.map((participant) => trimObject(participant)),
    consent: Boolean(state.consent),
    regulationConsent: Boolean(state.regulationConsent),
    demoOnly: true,
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

function trimObject(object) {
  return Object.fromEntries(
    Object.entries(object || {}).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
  );
}

function generateProtocol() {
  const bytes = new Uint8Array(3);
  if (window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }

  return `MD-DEMO-${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}
