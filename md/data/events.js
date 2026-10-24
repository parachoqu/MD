export const EVENT_STATUS = {
  open: {
    label: "Inscrições abertas",
    shortLabel: "Abertas",
    tone: "success",
    cta: "Inscrever equipe",
    canRegister: true,
  },
  soon: {
    label: "Inscrições em breve",
    shortLabel: "Em breve",
    tone: "warning",
    cta: "Inscrições em breve",
    canRegister: false,
  },
  closed: {
    label: "Inscrições encerradas",
    shortLabel: "Encerradas",
    tone: "neutral",
    cta: "Inscrições encerradas",
    canRegister: false,
  },
  finished: {
    label: "Evento realizado",
    shortLabel: "Realizado",
    tone: "neutral",
    cta: "Evento realizado",
    canRegister: false,
  },
  cancelled: {
    label: "Evento cancelado",
    shortLabel: "Cancelado",
    tone: "danger",
    cta: "Evento cancelado",
    canRegister: false,
  },
  full: {
    label: "Vagas preenchidas",
    shortLabel: "Lotado",
    tone: "neutral",
    cta: "Vagas preenchidas",
    canRegister: false,
  },
};

export const events = [
  {
    id: "evt-taca-vale-handebol-2026",
    slug: "taca-vale-handebol-2026",
    title: "1ª Taça Vale do Mucuri de Handebol Juvenil",
    shortTitle: "Taça Vale do Mucuri",
    sport: "Handebol",
    sportKey: "handebol",
    featured: true,
    demo: false,
    status: "open",
    summary:
      "Primeira edição da Taça Vale do Mucuri de Handebol Juvenil, organizada pela M&D Projetos e Eventos Desportivos, nos dias 12 e 13 de dezembro de 2026, em Itambacuri/MG.",
    description:
      "Competição juvenil de handebol nas categorias masculina e feminina, destinada a atletas de 12 a 17 anos completados em 2026 (nascidos entre 2009 e 2014), com a participação de até 16 equipes, no Ginásio Poliesportivo de Itambacuri/MG, nos dias 12 e 13 de dezembro de 2026. A fase classificatória ocorre no sábado; semifinais, disputa de terceiro lugar e final ocorrem no domingo. Inscrições abertas com vagas limitadas.",
    date: {
      label: "12 e 13 de dezembro de 2026",
      start: "2026-12-12",
      end: "2026-12-13",
      sort: "2026-12-12",
    },
    registrationPeriod: {
      start: "2026-08-01",
      end: "2026-12-10",
      label: "Abertas até 10 de dezembro de 2026",
    },
    location: {
      venue: "Ginásio Poliesportivo",
      city: "Itambacuri",
      state: "MG",
    },
    capacity: {
      teams: 16,
      label: "Até 16 equipes",
    },
    categories: [
      {
        id: "junior-masculino",
        name: "Juvenil Masculino",
        division: "Juvenil (2009 a 2014)",
        gender: "Masculino",
      },
      {
        id: "junior-feminino",
        name: "Juvenil Feminino",
        division: "Juvenil (2009 a 2014)",
        gender: "Feminino",
      },
    ],
    schedule: [
      {
        label: "Sábado - 12/12",
        value: "Fase classificatória: divisão em chaves, com jogos em turno único.",
      },
      {
        label: "Domingo - 13/12",
        value: "Semifinais, disputa de 3º lugar e Grande Final no sistema mata-mata.",
      },
    ],
    registrationDetails: {
      feePerTeam: "R$ 350,00 por equipe",
      dualInstitutionFee:
        "R$ 700,00 para duas equipes da mesma instituição, masculino e feminino",
      period: "Até 10 de dezembro de 2026",
      maxMembers: 20,
      maxAthletes: 17,
      maxStaff: 3,
      matchRosterLimit: 16,
    },
    regulation: {
      available: true,
      id: "taca-vale-handebol-2026",
      title: "Regulamento oficial",
      label: "Ler regulamento completo",
      pages: 4,
      version: "2026-10-23",
      publishedAt: "2026-10-23",
    },
    highlights: [
      {
        title: "1º lugar por naipe",
        detail:
          "Troféu, medalhas de ouro e R$ 1.200,00 para o campeão de cada naipe (masculino e feminino).",
      },
      {
        title: "2º lugar por naipe",
        detail:
          "Medalhas de prata e R$ 800,00 para o vice-campeão de cada naipe (masculino e feminino).",
      },
      {
        title: "3º lugar por naipe",
        detail: "Medalhas de bronze.",
      },
      {
        title: "Destaques individuais e coletivos",
        detail:
          "Certificado de MVP por partida; certificados e troféus aos melhores jogadores; troféus de artilheiro e defesa menos vazada; medalhas para a Seleção do Campeonato, com 7 atletas por naipe.",
      },
    ],
    sponsors: [],
    organization: "M&D Projetos e Eventos Desportivos",
    registrationType: "team",
    registrationConfig: {},
    keywords: [
      "taca vale",
      "taça vale do mucuri",
      "mucuri",
      "itambacuri",
      "juvenil",
      "masculino",
      "feminino",
      "regulamento",
    ],
    visual: {
      label: "Taça Vale",
      accent: "handebol",
      image: "assets/img/generated/evento-taca-vale-handebol-junior-ficticio.webp",
      imageAlt: "1ª Taça Vale do Mucuri de Handebol Juvenil em Itambacuri/MG",
    },
  },
];

let currentEvents = [...events];

export function getEvents() {
  return currentEvents;
}

export async function fetchPublicEvents() {
  try {
    const response = await fetch("/api/public/events", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return currentEvents;
    const body = await response.json();
    if (body?.ok && Array.isArray(body.data) && body.data.length > 0) {
      currentEvents = body.data;
    }
  } catch {
    // Mantem dados locais de fallback sem quebrar a execucao
  }
  return currentEvents;
}

export function getEventStatus(status) {
  return EVENT_STATUS[status] || EVENT_STATUS.soon;
}

export function getEventBySlug(slug) {
  return currentEvents.find((event) => event.slug === slug) || null;
}

export function getFeaturedEvents(limit = 3) {
  return currentEvents.filter((event) => event.featured).slice(0, limit);
}

export function getSports() {
  return Array.from(
    new Map(currentEvents.map((event) => [event.sportKey, event.sport])).entries()
  )
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
