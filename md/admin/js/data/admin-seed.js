// Fonte pura do seed manual do banco. Este modulo nao persiste no navegador:
// scripts/seed.mjs valida e grava os dados de forma transacional.
//
// Todos os textos institucionais abaixo (hero, sobre, atuacao, impacto, contato,
// footer, catalogo) sao copiados literalmente de index.html/inscricoes.html --
// nada foi inventado.

import { events as publicEvents } from "../../../data/events.js";
import { projects as publicProjects } from "../../../data/projects.js";
import { clone } from "../utils.js";

const SEEDED_AT = () => new Date().toISOString();

// --- Mapeamento de imagens publicas existentes para ids de midia do admin -----

const IMAGE_TO_MEDIA_ID = {
  "assets/img/generated/evento-taca-vale-handebol-junior-ficticio.webp": "media-evento-taca-vale",
  "assets/img/generated/evento-demo-futsal-ficticio.webp": "media-evento-demo-futsal",
  "assets/img/generated/evento-demo-voleibol-ficticio.webp": "media-evento-demo-voleibol",
  "assets/img/generated/projeto-empresas-ficticio.webp": "media-projeto-empresas",
  "assets/img/generated/projeto-escolas-ficticio.webp": "media-projeto-escolas",
  "assets/img/generated/projeto-comunidades-ficticio.webp": "media-projeto-comunidades",
};

const STATIC_MEDIA_SOURCE = [
  { id: "media-logo", path: "../assets/logo/logo.png", alt: "M&D Projetos e Eventos Desportivos", format: "png", width: null, height: null },
  { id: "media-favicon", path: "../assets/img/favicon.svg", alt: "M&D Projetos e Eventos Desportivos", format: "svg", width: null, height: null },
  { id: "media-logo-mark", path: "../assets/img/logo-mark.svg", alt: "M&D Projetos e Eventos Desportivos", format: "svg", width: null, height: null },
  {
    id: "media-hero-evento",
    path: "../assets/img/generated/hero-evento-esportivo-ficticio.webp",
    alt: "Evento esportivo comunitário organizado, com participantes e equipe de apoio em quadra poliesportiva",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-sobre-bastidores",
    path: "../assets/img/generated/sobre-bastidores-ficticio.webp",
    alt: "Equipe M&D no planejamento técnico e organização de evento esportivo",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-atuacao-empresas",
    path: "../assets/img/generated/atuacao-empresas-ficticio.webp",
    alt: "Atividade de saúde, movimento e integração em ambiente corporativo",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-atuacao-escolas",
    path: "../assets/img/generated/atuacao-escolas-ficticio.webp",
    alt: "Atividade esportiva escolar orientada para formação e convivência",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-atuacao-comunidades",
    path: "../assets/img/generated/atuacao-comunidades-ficticio.webp",
    alt: "Ação esportiva comunitária e inclusiva em quadra poliesportiva",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-atuacao-parceiros",
    path: "../assets/img/generated/atuacao-parceiros-ficticio.webp",
    alt: "Equipe técnica da M&D na organização de infraestrutura e materiais esportivos",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-impacto-evento",
    path: "../assets/img/generated/impacto-evento-ficticio.webp",
    alt: "Participantes e atletas reunidos em celebração após realização de evento esportivo",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-projeto-empresas",
    path: "../assets/img/generated/projeto-empresas-ficticio.webp",
    alt: "Circuito de integração e condicionamento físico para empresas",
    format: "webp",
    width: 1448,
    height: 1086,
  },
  {
    id: "media-projeto-escolas",
    path: "../assets/img/generated/projeto-escolas-ficticio.webp",
    alt: "Circuito recreativo e esportivo escolar para integração e convivência",
    format: "webp",
    width: 1448,
    height: 1086,
  },
  {
    id: "media-projeto-comunidades",
    path: "../assets/img/generated/projeto-comunidades-ficticio.webp",
    alt: "Festival de esportes e lazer para bairros e comunidades",
    format: "webp",
    width: 1448,
    height: 1086,
  },
  {
    id: "media-evento-taca-vale",
    path: "../assets/img/generated/evento-taca-vale-handebol-junior-ficticio.webp",
    alt: "1ª Taça Vale do Mucuri de Handebol Juvenil em Itambacuri/MG",
    format: "webp",
    width: null,
    height: null,
  },
  {
    id: "media-evento-demo-futsal",
    path: "../assets/img/generated/evento-demo-futsal-ficticio.webp",
    alt: "Torneio de futsal em quadra coberta",
    format: "webp",
    width: null,
    height: null,
  },
  {
    id: "media-evento-demo-voleibol",
    path: "../assets/img/generated/evento-demo-voleibol-ficticio.webp",
    alt: "Competição de voleibol em quadra",
    format: "webp",
    width: null,
    height: null,
  },
];

function deriveLabel(path) {
  const filename = path.split("/").pop().replace(/\.[a-z0-9]+$/i, "");
  return filename
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// --- Eventos --------------------------------------------------------------

export function buildEventsSeed() {
  return publicEvents.map((sourceEvent) => {
    const event = clone(sourceEvent);
    event.editorialStatus = "published";
    event.visual = Object.assign({}, event.visual, {
      mediaId: IMAGE_TO_MEDIA_ID[event.visual.image] || null,
    });
    event.seededAt = SEEDED_AT();
    event.updatedAt = event.seededAt;
    return event;
  });
}

export function buildProjectsSeed() {
  return publicProjects.map((source, index) => {
    const project = clone(source);
    project.mediaId = IMAGE_TO_MEDIA_ID[project.image] || null;
    project.order = index;
    project.editorialStatus = "published";
    project.seededAt = SEEDED_AT();
    project.updatedAt = project.seededAt;
    return project;
  });
}

// --- Conteudo institucional (textos copiados literalmente do HTML publico) --

function repeatableItem(fields, index) {
  return Object.assign({ id: fields.id || `item-${index}`, order: index, visible: true }, fields);
}

export function buildContentSeed() {
  const now = SEEDED_AT();
  return {
    home: {
      updatedAt: now,
      sections: {
        navigation: {
          links: [
            "Início",
            "Sobre",
            "Atuação",
            "Eventos",
            "Projetos",
            "Impacto",
            "Contato",
          ].map((label, index) => repeatableItem({ id: `nav-${index}`, label }, index)),
        },
        hero: {
          titleStrong: "Movimento que organiza,",
          titleThin: "conecta e transforma.",
          lead: "Planejamento e realização de projetos, eventos, recreação e lazer para empresas, escolas e comunidades, da ideia à operação em campo.",
          ctaPrimaryLabel: "Ver evento em destaque",
          ctaPrimaryHref: "evento.html?evento=taca-vale-handebol-2026",
          ctaSecondaryLabel: "Conhecer projetos",
          ctaSecondaryHref: "#projetos",
          image: "media-evento-taca-vale",
          imageAlt:
            "1ª Taça Vale do Mucuri de Handebol Juvenil em Itambacuri/MG",
          imageNote: "Evento oficial em destaque · Regulamento oficial publicado",
        },
        sobre: {
          eyebrow: "[ 01 ] Sobre a M&D",
          title: "Planejamento completo, energia em campo, clareza na entrega.",
          description:
            "A M&D apresenta o esporte como experiência organizada: objetivos definidos, execução profissional e atenção à dimensão humana de cada público.",
          quote: "Movimento que organiza, conecta e transforma.",
          image: "media-sobre-bastidores",
          imageAlt: "Equipe M&D no planejamento técnico e organização de evento esportivo",
          principles: [
            { title: "Clareza ativa", description: "A pessoa entende a proposta em poucos segundos e sempre encontra o próximo passo." },
            { title: "Energia com controle", description: "Movimento aparece em recortes, diagonais e microinterações, nunca em ruído visual." },
            { title: "Prova antes da promessa", description: "Projetos, números, parceiros e registros reais sustentam a narrativa." },
            { title: "Comunidade no centro", description: "Pessoas, escolas, empresas e territórios aparecem como protagonistas." },
            { title: "Sistema escalável", description: "A landing page já nasce preparada para receber páginas de projetos e eventos." },
          ].map(repeatableItem),
        },
        eventos: {
          eyebrow: "[ 02 ] Eventos",
          title: "Próximos eventos",
          description: "Competições e experiências esportivas organizadas pela M&D, com status e caminho de inscrição.",
          ctaLabel: "Ver todos os eventos",
          ctaHref: "inscricoes.html",
        },
        atuacao: {
          eyebrow: "[ 03 ] Atuação",
          title: "Uma narrativa, quatro portas de entrada.",
          description:
            "O mesmo rigor de planejamento responde a necessidades diferentes: ginástica laboral, lazer para escolas, fit dance, circuitos funcionais e eventos sob medida.",
          modules: [
            {
              title: "Empresas",
              context: "Integração, saúde e lazer corporativo.",
              need: "Ginástica laboral, circuitos funcionais e calendário claro.",
              benefit: "Engajamento com profissionais qualificados e acompanhamento de resultados.",
              linkLabel: "Solicitar proposta",
              interest: "empresas",
              image: "media-atuacao-empresas",
              imageAlt: "Atividade de saúde, movimento e integração em ambiente corporativo",
            },
            {
              title: "Escolas",
              context: "Projetos adequados à faixa etária e ao ambiente educacional.",
              need: "Momentos de lazer, recreação e comunicação simples.",
              benefit: "Esporte como formação, pertencimento e experiência segura.",
              linkLabel: "Conhecer projetos",
              interest: "escolas",
              image: "media-atuacao-escolas",
              imageAlt: "Atividade esportiva escolar orientada para formação e convivência",
            },
            {
              title: "Comunidades",
              context: "Acesso, território, calendário e participação.",
              need: "Iniciativas claras, inclusivas, viáveis e movimentadas.",
              benefit: "Pessoas e bairros em movimento com planejamento personalizado.",
              linkLabel: "Ver iniciativas",
              interest: "comunidades",
              image: "media-atuacao-comunidades",
              imageAlt: "Ação esportiva comunitária e inclusiva em quadra poliesportiva",
            },
            {
              title: "Parceiros e patrocinadores",
              context: "Marcas buscam alcance com credibilidade.",
              need: "Contrapartidas, presença organizada e compromisso com resultados.",
              benefit: "Associação positiva a experiências que fazem diferença.",
              linkLabel: "Seja parceiro",
              interest: "parceiros",
              image: "media-atuacao-parceiros",
              imageAlt: "Equipe técnica da M&D na organização de infraestrutura e materiais esportivos",
            },
          ].map(repeatableItem),
        },
        projetos: {
          eyebrow: "[ 04 ] Projetos",
          title: "Projetos em destaque e iniciativas realizadas.",
          description: "Iniciativas planejadas e executadas pela M&D para empresas, escolas e comunidades.",
        },
        impacto: {
          eyebrow: "[ 05 ] Impacto",
          title: "Resultado é evidência, não promessa.",
          description:
            "Organização estruturada, rigor técnico e compromisso com o desenvolvimento esportivo de atletas, escolas e comunidades.",
          image: "media-impacto-evento",
          imageAlt: "Participantes e atletas reunidos em celebração após realização de evento esportivo",
          testimonialQuote:
            "O esporte mobiliza e transforma quando planejado com rigor técnico, respeito aos atletas e compromisso com o desenvolvimento da comunidade.",
          testimonialCite: "Coordenação Geral M&D",
          metrics: [
            { label: "Equipes participantes", status: "Confirmado", value: "16" },
            { label: "Atletas e participantes", status: "Estimado", value: "320" },
            { label: "Municípios e regiões", status: "Em expansão", value: "8" },
            { label: "% Regulamento oficial", status: "Oficial", value: "100" },
          ].map(repeatableItem),
        },
        contato: {
          eyebrow: "[ 06 ] Contato",
          title: "Vamos planejar seu próximo projeto.",
          description: "Conte o público, objetivo e momento do projeto para a equipe organizar o próximo passo.",
          panelHeading: "Fale com a equipe da M&D.",
          panelDescription:
            "Entre em contato com nossa equipe para dúvidas sobre inscrições, parcerias ou planejamento de eventos esportivos.",
        },
        footer: {
          tagline: "Planejamento e realização de projetos e eventos esportivos para empresas, escolas e comunidades.",
          copyright: "© 2026 M&D Projetos e Eventos Desportivos.",
          technicalNote: "M&D Projetos e Eventos Desportivos.",
        },
      },
    },
    catalog: {
      updatedAt: now,
      sections: {
        catalog: {
          title: "Encontre seu próximo evento.",
          description:
            "Consulte competições e experiências esportivas organizadas pela M&D, acompanhe o status e acesse o detalhe de cada evento.",
          emptyStateTitle: "Nenhum evento encontrado.",
          emptyStateDescription: "Tente alterar os filtros ou consultar todos os eventos.",
        },
      },
    },
  };
}

// --- Configuracoes globais -------------------------------------------------

export function buildSettingsSeed() {
  return {
    organizationName: "M&D Projetos e Eventos Desportivos",
    shortDescription: "Planejamento e realização de projetos e eventos esportivos para empresas, escolas e comunidades.",
    email: "mdprojetoseeventos@gmail.com",
    emailIsPlaceholder: false,
    phone: "+55 33 98848-1813",
    phoneIsPlaceholder: false,
    whatsapp: "https://wa.me/5533988481813",
    whatsappIsPlaceholder: false,
    instagram: "https://www.instagram.com/mdprojetoseeventos/",
    instagramIsPlaceholder: false,
    address: "",
    addressIsPlaceholder: false,
    logoMediaId: "media-logo",
    faviconMediaId: "media-logo",
    seoTitle: "M&D Projetos e Eventos Desportivos | Movimento que organiza, conecta e transforma",
    seoDescription:
      "Planejamento e realização profissional de projetos e eventos esportivos para empresas, escolas, comunidades e parceiros.",
    updatedAt: SEEDED_AT(),
  };
}

// --- Midia -------------------------------------------------------------

export function buildMediaSeed() {
  return STATIC_MEDIA_SOURCE.map((source) => ({
    id: source.id,
    kind: "static",
    format: source.format,
    path: source.path,
    alt: source.alt,
    label: deriveLabel(source.path),
    width: source.width,
    height: source.height,
    sizeBytes: null,
    originalFilename: null,
    createdAt: SEEDED_AT(),
  }));
}
