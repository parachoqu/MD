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
    title: "Taça Vale de Handebol Júnior",
    shortTitle: "Taça Vale de Handebol",
    sport: "Handebol",
    sportKey: "handebol",
    featured: true,
    demo: false,
    status: "soon",
    summary:
      "Primeira edição da Taça Vale de Handebol Júnior, apresentada pela M&D Projetos e Eventos Desportivos.",
    description:
      "Competição júnior Sub-21 de handebol com previsão para outubro de 2026. As inscrições, local, cronograma, regulamento e demais regras serão publicados após confirmação oficial.",
    date: {
      label: "Outubro de 2026",
      start: null,
      end: null,
      sort: "2026-10-01",
    },
    registrationPeriod: {
      start: null,
      end: null,
      label: "A confirmar",
    },
    location: {
      venue: null,
      city: null,
      state: null,
    },
    categories: [
      {
        id: "junior-sub21-masculino",
        name: "Júnior / Sub-21 - Masculino",
        division: "Júnior / Sub-21",
        gender: "Masculino",
      },
      {
        id: "junior-sub21-feminino",
        name: "Júnior / Sub-21 - Feminino",
        division: "Júnior / Sub-21",
        gender: "Feminino",
      },
    ],
    schedule: [],
    regulation: {
      available: false,
      url: null,
    },
    sponsors: [
      {
        name: "Ópticas Tecnotica",
        note: "Parceiro apresentado nas artes oficiais. Inserir logomarca oficial quando disponível.",
        logo: null,
      },
    ],
    organization: "M&D Projetos e Eventos Desportivos",
    registrationType: "team",
    registrationConfig: {},
    keywords: ["taca vale", "júnior", "junior", "sub 21", "sub-21", "masculino", "feminino"],
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
      url: null,
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
      url: null,
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
