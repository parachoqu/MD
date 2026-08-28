// Schema declarativo do conteudo institucional editavel pelo admin. Define quais
// campos existem por secao, nunca permite HTML/CSS/JS livre -- so os tipos abaixo
// (text, textarea, url, image, boolean) e listas repetiveis com itens tipados.
//
// Secoes marcadas com protected:true nao podem ser esvaziadas por completo (o
// content-repository.js recusa updateSection() que apague todos os campos
// obrigatorios ou zere um repetivel abaixo de minItems).

export const CONTENT_PAGES = {
  home: {
    label: "Página inicial",
    sections: [
      {
        key: "navigation",
        label: "Navegação principal",
        protected: true,
        description:
          "Rótulos dos links do menu. Estrutura, âncoras, comportamento do menu mobile e ARIA técnico continuam sendo código.",
        fields: [],
        repeatable: {
          key: "links",
          label: "Links do menu",
          minItems: 1,
          itemFields: [{ key: "label", type: "text", label: "Rótulo", required: true }],
        },
      },
      {
        key: "hero",
        label: "Hero",
        protected: true,
        description: "Primeira dobra do site. Não pode ficar sem título nem CTA principal.",
        fields: [
          { key: "titleStrong", type: "text", label: "Título — parte em destaque", required: true },
          { key: "titleThin", type: "text", label: "Título — parte leve", required: true },
          { key: "lead", type: "textarea", label: "Texto de apoio", required: true },
          { key: "ctaPrimaryLabel", type: "text", label: "CTA principal — rótulo", required: true },
          { key: "ctaPrimaryHref", type: "url", label: "CTA principal — destino", required: true },
          { key: "ctaSecondaryLabel", type: "text", label: "CTA secundário — rótulo", required: false },
          { key: "ctaSecondaryHref", type: "url", label: "CTA secundário — destino", required: false },
          { key: "image", type: "image", label: "Imagem do hero", required: true },
          { key: "imageAlt", type: "text", label: "Texto alternativo da imagem", required: true },
          { key: "imageNote", type: "text", label: "Nota sob a imagem", required: false },
        ],
      },
      {
        key: "sobre",
        label: "Sobre a M&D",
        protected: false,
        fields: [
          { key: "eyebrow", type: "text", label: "Índice da seção", required: true },
          { key: "title", type: "text", label: "Título da seção", required: true },
          { key: "description", type: "textarea", label: "Descrição da seção", required: true },
          { key: "quote", type: "textarea", label: "Citação de destaque", required: true },
          { key: "image", type: "image", label: "Imagem", required: true },
          { key: "imageAlt", type: "text", label: "Texto alternativo", required: true },
        ],
        repeatable: {
          key: "principles",
          label: "Princípios",
          minItems: 1,
          itemFields: [
            { key: "title", type: "text", label: "Título", required: true },
            { key: "description", type: "textarea", label: "Descrição", required: true },
          ],
        },
      },
      {
        key: "eventos",
        label: "Eventos",
        protected: false,
        description: "Os dados dos eventos em si vêm do módulo Eventos — aqui só os textos fixos da seção.",
        fields: [
          { key: "eyebrow", type: "text", label: "Índice da seção", required: true },
          { key: "title", type: "text", label: "Título da seção", required: true },
          { key: "description", type: "textarea", label: "Descrição da seção", required: true },
          { key: "ctaLabel", type: "text", label: "CTA — rótulo", required: true },
          { key: "ctaHref", type: "url", label: "CTA — destino", required: true },
        ],
      },
      {
        key: "atuacao",
        label: "Atuação",
        protected: false,
        fields: [
          { key: "eyebrow", type: "text", label: "Índice da seção", required: true },
          { key: "title", type: "text", label: "Título da seção", required: true },
          { key: "description", type: "textarea", label: "Descrição da seção", required: true },
        ],
        repeatable: {
          key: "modules",
          label: "Frentes de atuação",
          minItems: 1,
          itemFields: [
            { key: "title", type: "text", label: "Título", required: true },
            { key: "context", type: "textarea", label: "Contexto", required: true },
            { key: "need", type: "textarea", label: "Necessidade", required: true },
            { key: "benefit", type: "textarea", label: "Benefício", required: true },
            { key: "linkLabel", type: "text", label: "Rótulo da ação", required: true },
            { key: "interest", type: "text", label: "Identificador de interesse", required: true },
            { key: "image", type: "image", label: "Imagem", required: true },
            { key: "imageAlt", type: "text", label: "Texto alternativo", required: true },
          ],
        },
      },
      {
        key: "projetos",
        label: "Projetos",
        protected: false,
        description: "Os projetos em si vêm do módulo Projetos — aqui só os textos fixos da seção.",
        fields: [
          { key: "eyebrow", type: "text", label: "Índice da seção", required: true },
          { key: "title", type: "text", label: "Título da seção", required: true },
          { key: "description", type: "textarea", label: "Descrição da seção", required: true },
        ],
      },
      {
        key: "impacto",
        label: "Impacto",
        protected: false,
        fields: [
          { key: "eyebrow", type: "text", label: "Índice da seção", required: true },
          { key: "title", type: "text", label: "Título da seção", required: true },
          { key: "description", type: "textarea", label: "Descrição da seção", required: true },
          { key: "image", type: "image", label: "Imagem", required: true },
          { key: "imageAlt", type: "text", label: "Texto alternativo", required: true },
          { key: "testimonialQuote", type: "textarea", label: "Depoimento (placeholder)", required: false },
          { key: "testimonialCite", type: "text", label: "Assinatura do depoimento", required: false },
        ],
        repeatable: {
          key: "metrics",
          label: "Métricas de impacto",
          minItems: 1,
          itemFields: [
            { key: "label", type: "text", label: "Rótulo do indicador", required: true },
            { key: "status", type: "text", label: "Status (ex.: A validar)", required: true },
          ],
        },
      },
      {
        key: "contato",
        label: "Contato",
        protected: true,
        description: "Dados de contato (e-mail, telefone, WhatsApp, Instagram) ficam em Configurações — aqui só o texto editorial.",
        fields: [
          { key: "eyebrow", type: "text", label: "Índice da seção", required: true },
          { key: "title", type: "text", label: "Título da seção", required: true },
          { key: "description", type: "textarea", label: "Descrição da seção", required: true },
          { key: "panelHeading", type: "text", label: "Título do painel de canais", required: true },
          { key: "panelDescription", type: "textarea", label: "Texto do painel de canais", required: true },
        ],
      },
      {
        key: "footer",
        label: "Footer",
        protected: true,
        fields: [
          { key: "tagline", type: "text", label: "Tagline institucional", required: true },
          { key: "copyright", type: "text", label: "Texto de copyright", required: true },
          { key: "technicalNote", type: "text", label: "Nota técnica de rodapé", required: false },
        ],
      },
    ],
  },
  catalog: {
    label: "Catálogo de eventos",
    sections: [
      {
        key: "catalog",
        label: "Catálogo de eventos (inscricoes.html)",
        protected: false,
        description: "Busca, filtros e lógica de listagem continuam sendo código — aqui só os textos editoriais.",
        fields: [
          { key: "title", type: "text", label: "Título da página", required: true },
          { key: "description", type: "textarea", label: "Descrição da página", required: false },
          { key: "emptyStateTitle", type: "text", label: "Estado vazio — título", required: true },
          { key: "emptyStateDescription", type: "textarea", label: "Estado vazio — descrição", required: false },
        ],
      },
    ],
  },
};

export function getPageSchema(pageId) {
  return CONTENT_PAGES[pageId] || null;
}

export function getSectionSchema(pageId, sectionId) {
  const page = getPageSchema(pageId);
  if (!page) return null;
  return page.sections.find((section) => section.key === sectionId) || null;
}
