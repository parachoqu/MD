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
    alt: "Imagem demonstrativa gerada por IA de um evento esportivo comunitário organizado, com participantes e equipe de apoio em uma quadra aberta",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-sobre-bastidores",
    path: "../assets/img/generated/sobre-bastidores-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de uma equipe planejando um evento esportivo com pranchetas e cones",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-atuacao-empresas",
    path: "../assets/img/generated/atuacao-empresas-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de adultos participando de uma atividade de movimento em ambiente corporativo",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-atuacao-escolas",
    path: "../assets/img/generated/atuacao-escolas-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de uma atividade esportiva escolar conduzida por um orientador em plano aberto",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-atuacao-comunidades",
    path: "../assets/img/generated/atuacao-comunidades-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de um evento esportivo comunitário inclusivo em uma quadra pública",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-atuacao-parceiros",
    path: "../assets/img/generated/atuacao-parceiros-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de uma equipe organizando materiais e estrutura de um evento esportivo",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-impacto-evento",
    path: "../assets/img/generated/impacto-evento-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de um grupo celebrando discretamente após uma atividade esportiva",
    format: "webp",
    width: 1536,
    height: 1024,
  },
  {
    id: "media-projeto-empresas",
    path: "../assets/img/generated/projeto-empresas-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de uma atividade esportiva leve para uma equipe corporativa",
    format: "webp",
    width: 1448,
    height: 1086,
  },
  {
    id: "media-projeto-escolas",
    path: "../assets/img/generated/projeto-escolas-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de um circuito recreativo esportivo em uma escola",
    format: "webp",
    width: 1448,
    height: 1086,
  },
  {
    id: "media-projeto-comunidades",
    path: "../assets/img/generated/projeto-comunidades-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de uma atividade esportiva comunitária em uma quadra pública",
    format: "webp",
    width: 1448,
    height: 1086,
  },
  {
    id: "media-evento-taca-vale",
    path: "../assets/img/generated/evento-taca-vale-handebol-junior-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de uma atividade ilustrativa de handebol juvenil em uma quadra",
    format: "webp",
    width: null,
    height: null,
  },
  {
    id: "media-evento-demo-futsal",
    path: "../assets/img/generated/evento-demo-futsal-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de uma atividade ilustrativa de futsal em uma quadra coberta",
    format: "webp",
    width: null,
    height: null,
  },
  {
    id: "media-evento-demo-voleibol",
    path: "../assets/img/generated/evento-demo-voleibol-ficticio.webp",
    alt: "Imagem demonstrativa gerada por IA de uma atividade ilustrativa de voleibol em uma quadra",
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
          ctaPrimaryLabel: "Ver eventos e inscrições",
          ctaPrimaryHref: "inscricoes.html",
          ctaSecondaryLabel: "Conhecer projetos",
          ctaSecondaryHref: "#projetos",
          image: "media-hero-evento",
          imageAlt:
            "Imagem demonstrativa gerada por IA de um evento esportivo comunitário organizado, com participantes e equipe de apoio em uma quadra aberta",
          imageNote: "Imagem demonstrativa · gerada por IA. Substituir por registro autorizado da M&D.",
        },
        sobre: {
          eyebrow: "[ 01 ] Sobre a M&D",
          title: "Planejamento completo, energia em campo, clareza na entrega.",
          description:
            "A M&D apresenta o esporte como experiência organizada: objetivos definidos, execução profissional e atenção à dimensão humana de cada público.",
          quote: "Movimento que organiza, conecta e transforma.",
          image: "media-sobre-bastidores",
          imageAlt: "Imagem demonstrativa gerada por IA de uma equipe planejando um evento esportivo com pranchetas e cones",
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
              imageAlt: "Imagem demonstrativa gerada por IA de adultos participando de uma atividade de movimento em ambiente corporativo",
            },
            {
              title: "Escolas",
              context: "Projetos adequados à faixa etária e ao ambiente educacional.",
              need: "Momentos de lazer, recreação e comunicação simples.",
              benefit: "Esporte como formação, pertencimento e experiência segura.",
              linkLabel: "Conhecer projetos",
              interest: "escolas",
              image: "media-atuacao-escolas",
              imageAlt: "Imagem demonstrativa gerada por IA de uma atividade esportiva escolar conduzida por um orientador em plano aberto",
            },
            {
              title: "Comunidades",
              context: "Acesso, território, calendário e participação.",
              need: "Iniciativas claras, inclusivas, viáveis e movimentadas.",
              benefit: "Pessoas e bairros em movimento com planejamento personalizado.",
              linkLabel: "Ver iniciativas",
              interest: "comunidades",
              image: "media-atuacao-comunidades",
              imageAlt: "Imagem demonstrativa gerada por IA de um evento esportivo comunitário inclusivo em uma quadra pública",
            },
            {
              title: "Parceiros e patrocinadores",
              context: "Marcas buscam alcance com credibilidade.",
              need: "Contrapartidas, presença organizada e compromisso com resultados.",
              benefit: "Associação positiva a experiências que fazem diferença.",
              linkLabel: "Seja parceiro",
              interest: "parceiros",
              image: "media-atuacao-parceiros",
              imageAlt: "Imagem demonstrativa gerada por IA de uma equipe organizando materiais e estrutura de um evento esportivo",
            },
          ].map(repeatableItem),
        },
        projetos: {
          eyebrow: "[ 04 ] Projetos",
          title: "Estrutura pronta para cases institucionais reais.",
          description: "As linhas abaixo representam provas da atuação da M&D. Eventos com inscrição ficam no portal dedicado.",
        },
        impacto: {
          eyebrow: "[ 05 ] Impacto",
          title: "Resultado é evidência, não promessa.",
          description:
            "A seção mantém a composição de impacto e contadores, mas sinaliza claramente que os indicadores aguardam validação documental.",
          image: "media-impacto-evento",
          imageAlt: "Imagem demonstrativa gerada por IA de um grupo celebrando discretamente após uma atividade esportiva",
          testimonialQuote: "Depoimentos reais devem entrar aqui com autorização, nome, cargo e organização.",
          testimonialCite: "Placeholder de prova social",
          metrics: [
            { label: "Eventos realizados", status: "A validar" },
            { label: "Participantes impactados", status: "A validar" },
            { label: "Escolas ou cidades atendidas", status: "A validar" },
            { label: "Parceiros confirmados", status: "A validar" },
          ].map(repeatableItem),
        },
        contato: {
          eyebrow: "[ 06 ] Contato",
          title: "Vamos planejar seu próximo projeto.",
          description: "Conte o público, objetivo e momento do projeto para a equipe organizar o próximo passo.",
          panelHeading: "Fale com a equipe da M&D.",
          panelDescription:
            "Contatos reais devem ser confirmados antes da publicação final. O Instagram oficial foi preservado como referência pública.",
        },
        footer: {
          tagline: "Planejamento e realização de projetos e eventos esportivos para empresas, escolas e comunidades.",
          copyright: "© 2026 M&D Projetos e Eventos Desportivos.",
          technicalNote: "Versão consolidada - conteúdo provisório sinalizado.",
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
    email: "contato@mdprojetoseeventos.com.br",
    emailIsPlaceholder: true,
    phone: "",
    phoneIsPlaceholder: true,
    whatsapp: "https://wa.me/5500000000000",
    whatsappIsPlaceholder: true,
    instagram: "https://www.instagram.com/mdprojetoseeventos/",
    instagramIsPlaceholder: false,
    address: "",
    addressIsPlaceholder: true,
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
