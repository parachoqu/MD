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
    title: "1ª Taça Vale do Mucuri de Handebol Júnior",
    shortTitle: "Taça Vale do Mucuri",
    sport: "Handebol",
    sportKey: "handebol",
    featured: true,
    demo: false,
    status: "soon",
    summary:
      "Primeira edição da Taça Vale do Mucuri de Handebol Júnior, organizada pela M&D Projetos e Eventos Desportivos, nos dias 17 e 18 de outubro de 2026, em Itambacuri/MG.",
    description:
      "Competição júnior de handebol nas categorias masculina e feminina, com a participação de até 12 equipes, no Ginásio Poliesportivo de Itambacuri/MG, nos dias 17 e 18 de outubro de 2026. A fase classificatória ocorre no sábado; semifinais, disputa de terceiro lugar e final ocorrem no domingo. Período de inscrições, horários e demais informações operacionais permanecem a confirmar.",
    date: {
      label: "17 e 18 de outubro de 2026",
      start: "2026-10-17",
      end: "2026-10-18",
      sort: "2026-10-17",
    },
    registrationPeriod: {
      start: null,
      end: null,
      label: "A confirmar",
    },
    location: {
      venue: "Ginásio Poliesportivo",
      city: "Itambacuri",
      state: "MG",
    },
    capacity: {
      teams: 12,
      label: "Até 12 equipes",
    },
    categories: [
      {
        id: "junior-masculino",
        name: "Júnior Masculino",
        division: "Júnior (2005 a 2013)",
        gender: "Masculino",
      },
      {
        id: "junior-feminino",
        name: "Júnior Feminino",
        division: "Júnior (2005 a 2013)",
        gender: "Feminino",
      },
    ],
    schedule: [
      {
        label: "Sábado - 17/10",
        value: "Fase classificatória: divisão em chaves, com jogos em turno único.",
      },
      {
        label: "Domingo - 18/10",
        value: "Semifinais, disputa de 3º lugar e Grande Final no sistema mata-mata.",
      },
    ],
    registrationDetails: {
      feePerTeam: "R$ 350,00 por equipe",
      dualInstitutionFee:
        "R$ 700,00 para duas equipes da mesma instituição, masculino e feminino",
      period: "A confirmar",
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
      pages: 3,
    },
    highlights: [
      {
        title: "1º lugar por naipe",
        detail:
          "Troféu de Campeão, medalhas de ouro para até 17 atletas e 3 membros da comissão, mais R$ 3.000,00 (três mil reais).",
      },
      {
        title: "2º lugar por naipe",
        detail:
          "Medalhas de prata para até 17 atletas e 3 membros da comissão, mais R$ 1.200,00 (mil e duzentos reais).",
      },
      {
        title: "3º lugar por naipe",
        detail: "Medalhas de bronze para até 17 atletas e 3 membros da comissão.",
      },
      {
        title: "Destaques individuais e coletivos",
        detail:
          "MVP por partida, troféu de goleador ou artilheiro, troféu de defesa menos vazada e Seleção do Campeonato com 7 atletas por naipe.",
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
      "júnior",
      "junior",
      "masculino",
      "feminino",
      "regulamento",
    ],
    visual: {
      label: "Taça Vale",
      accent: "handebol",
      image: "assets/img/generated/evento-taca-vale-handebol-junior-ficticio.webp",
      imageAlt: "Imagem demonstrativa gerada por IA de uma atividade ilustrativa de handebol juvenil em uma quadra",
    },
  },
  {
    id: "evt-demo-inscricoes-abertas",
    slug: "evento-demonstrativo-inscricoes-abertas",
    title: "Evento Demonstrativo - Inscrições Abertas",
    shortTitle: "Demo Inscrições Abertas",
    sport: "Futsal",
    sportKey: "futsal",
    featured: true,
    demo: true,
    status: "open",
    summary:
      "Evento fictício usado apenas para testar o fluxo completo de inscrição de equipes no frontend.",
    description:
      "Este evento demonstrativo permite validar busca, filtros, detalhe, rascunho, revisão e protocolo local. Ele não representa uma agenda real publicada pela M&D.",
    date: {
      label: "Demonstração 2026",
      start: "2026-09-12",
      end: "2026-09-12",
      sort: "2026-09-12",
    },
    registrationPeriod: {
      start: "2026-08-01",
      end: "2026-09-01",
      label: "Período demonstrativo",
    },
    location: {
      venue: "Ambiente de demonstração",
      city: "A confirmar",
      state: null,
    },
    categories: [
      {
        id: "sub17-misto-demo",
        name: "Sub-17 - Misto",
        division: "Sub-17",
        gender: "Misto",
      },
      {
        id: "adulto-misto-demo",
        name: "Adulto - Misto",
        division: "Adulto",
        gender: "Misto",
      },
    ],
    schedule: [
      {
        label: "Credenciamento",
        value: "Horário demonstrativo a definir",
      },
      {
        label: "Início das atividades",
        value: "Programação demonstrativa",
      },
    ],
    regulation: {
      available: false,
      id: null,
      title: "Regulamento",
      label: "Regulamento disponível em breve",
      pages: null,
    },
    sponsors: [],
    organization: "M&D Projetos e Eventos Desportivos",
    registrationType: "team",
    registrationConfig: {
      minParticipants: 2,
      maxParticipants: 5,
      birthDateRequired: true,
      jerseyNumberRequired: false,
    },
    keywords: ["demo", "demonstrativo", "inscrições abertas", "futsal", "equipe"],
    visual: {
      label: "Demo",
      accent: "open",
      image: "assets/img/generated/evento-demo-futsal-ficticio.webp",
      imageAlt: "Imagem demonstrativa gerada por IA de uma atividade ilustrativa de futsal em uma quadra coberta",
    },
  },
  {
    id: "evt-demo-inscricoes-encerradas",
    slug: "evento-demonstrativo-inscricoes-encerradas",
    title: "Evento Demonstrativo - Inscrições Encerradas",
    shortTitle: "Demo Encerradas",
    sport: "Voleibol",
    sportKey: "voleibol",
    featured: false,
    demo: true,
    status: "closed",
    summary:
      "Evento fictício para validar estados encerrados e filtros sem abrir o formulário de inscrição.",
    description:
      "Este registro demonstrativo existe somente para testar a interface de evento encerrado. Ele não representa competição real da M&D.",
    date: {
      label: "Demonstração encerrada",
      start: null,
      end: null,
      sort: "2026-07-01",
    },
    registrationPeriod: {
      start: null,
      end: null,
      label: "Encerrado para demonstração",
    },
    location: {
      venue: "Ambiente de demonstração",
      city: null,
      state: null,
    },
    categories: [
      {
        id: "adulto-demo",
        name: "Adulto - Misto",
        division: "Adulto",
        gender: "Misto",
      },
    ],
    schedule: [],
    regulation: {
      available: false,
      id: null,
      title: "Regulamento",
      label: "Regulamento disponível em breve",
      pages: null,
    },
    sponsors: [],
    organization: "M&D Projetos e Eventos Desportivos",
    registrationType: "team",
    registrationConfig: {
      minParticipants: 2,
      maxParticipants: 4,
      birthDateRequired: true,
      jerseyNumberRequired: false,
    },
    keywords: ["demo", "demonstrativo", "encerrado", "voleibol"],
    visual: {
      label: "Encerrado",
      accent: "closed",
      image: "assets/img/generated/evento-demo-voleibol-ficticio.webp",
      imageAlt: "Imagem demonstrativa gerada por IA de uma atividade ilustrativa de voleibol em uma quadra",
    },
  },
];

export function getEventStatus(status) {
  return EVENT_STATUS[status] || EVENT_STATUS.soon;
}

export function getEventBySlug(slug) {
  return events.find((event) => event.slug === slug) || null;
}

export function getFeaturedEvents(limit = 3) {
  return events.filter((event) => event.featured).slice(0, limit);
}

export function getSports() {
  return Array.from(
    new Map(events.map((event) => [event.sportKey, event.sport])).entries()
  )
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
