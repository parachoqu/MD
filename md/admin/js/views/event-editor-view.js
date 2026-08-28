// Editor de evento: formulario organizado em abas acessiveis (tablist/tabpanel),
// validado pelo event-repository.js, com resumo de erros, foco no primeiro campo
// invalido, deteccao de alteracoes nao salvas e acoes de rascunho/publicacao.
//
// Todas as abas sao montadas no DOM de uma so vez (troca de aba so alterna
// `hidden`, nunca recria os campos) para que o registro de campos por caminho
// (fieldsByPath) permaneca estavel entre trocas de aba.

import { element, clearChildren } from "../dom.js";
import { createIcon } from "../icons.js";
import { createTextField, createTextareaField, createSelectField, createCheckboxField } from "../components/form-field.js";
import { renderRepeatableList } from "../components/repeatable-list.js";
import { showConfirmDialog } from "../components/confirm-dialog.js";
import { openMediaPicker } from "../components/media-picker.js";
import { eventRepository, OPERATIONAL_STATUSES } from "../repositories/event-repository.js";
import { mediaRepository } from "../repositories/media-repository.js";
import { dirtyGuard } from "../dirty-guard.js";
import { clone, generateId } from "../utils.js";
import { STATUS_LABELS, openEventPreview } from "./event-preview.js";
import { EDITORIAL_LABELS } from "./events-view.js";

const TABS = [
  { key: "identification", label: "Identificação" },
  { key: "presentation", label: "Apresentação" },
  { key: "schedule-location", label: "Data e local" },
  { key: "categories", label: "Categorias" },
  { key: "programming", label: "Programação" },
  { key: "registration", label: "Inscrição" },
  { key: "regulation", label: "Regulamento" },
  { key: "highlights", label: "Premiação e destaques" },
  { key: "sponsors", label: "Patrocinadores" },
  { key: "image", label: "Imagem" },
];

function createEmptyEvent() {
  return {
    id: null,
    slug: "",
    title: "",
    shortTitle: "",
    sport: "",
    sportKey: "",
    featured: false,
    demo: false,
    status: "soon",
    summary: "",
    description: "",
    organization: "M&D Projetos e Eventos Desportivos",
    date: { label: "", start: "", end: "", sort: "" },
    registrationPeriod: { start: "", end: "", label: "" },
    location: { venue: "", city: "", state: "" },
    capacity: { teams: "", label: "" },
    categories: [],
    schedule: [],
    registrationType: "team",
    registrationDetails: { feePerTeam: "", dualInstitutionFee: "", period: "", maxMembers: "", maxAthletes: "", maxStaff: "", matchRosterLimit: "" },
    registrationConfig: { minParticipants: "", maxParticipants: "", birthDateRequired: false, jerseyNumberRequired: false },
    regulation: { available: false, id: "", title: "Regulamento", label: "Regulamento disponível em breve", pages: "", version: "", publishedAt: "", reference: "", toBeConfirmed: true },
    highlights: [],
    sponsors: [],
    keywords: [],
    visual: { label: "", accent: "", image: "", imageAlt: "", mediaId: null, focalX: 50, focalY: 50 },
    editorialStatus: "draft",
  };
}

function fieldToTab(field) {
  if (field.indexOf("date.") === 0 || field.indexOf("location.") === 0 || field.indexOf("capacity.") === 0) return "schedule-location";
  if (field.indexOf("categories") === 0) return "categories";
  if (field.indexOf("schedule") === 0) return "programming";
  if (
    field.indexOf("registrationPeriod.") === 0 ||
    field.indexOf("registrationDetails.") === 0 ||
    field.indexOf("registrationConfig.") === 0
  )
    return "registration";
  if (field.indexOf("regulation.") === 0) return "regulation";
  if (field.indexOf("highlights") === 0) return "highlights";
  if (field.indexOf("sponsors") === 0) return "sponsors";
  if (field.indexOf("visual.") === 0) return "image";
  if (field === "title" || field === "slug" || field === "status") return "identification";
  return "identification";
}

function toNumberOrUndefined(value) {
  if (value === "" || value === null || value === undefined) return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

function normalizeForSave(state) {
  const payload = clone(state);
  if (payload.capacity) payload.capacity.teams = toNumberOrUndefined(payload.capacity.teams);
  if (payload.registrationDetails) {
    ["maxMembers", "maxAthletes", "maxStaff", "matchRosterLimit"].forEach((key) => {
      payload.registrationDetails[key] = toNumberOrUndefined(payload.registrationDetails[key]);
    });
  }
  if (payload.registrationConfig) {
    ["minParticipants", "maxParticipants"].forEach((key) => {
      payload.registrationConfig[key] = toNumberOrUndefined(payload.registrationConfig[key]);
    });
  }
  if (payload.regulation) payload.regulation.pages = toNumberOrUndefined(payload.regulation.pages);
  return payload;
}

export const eventEditorView = {
  async mount(container, params, shell) {
    const isEditing = Boolean(params.id);
    let formState;

    if (isEditing) {
      const result = await eventRepository.getById(params.id);
      if (!result.ok) {
        shell.setTitle("Evento não encontrado");
        container.appendChild(element("p", { className: "admin-empty-state", text: "Este evento não existe mais nos dados administrativos." }));
        return;
      }
      formState = result.data;
    } else {
      formState = createEmptyEvent();
    }

    let isNew = !isEditing;
    let snapshot = JSON.stringify(formState);
    const fieldsByPath = new Map();
    const panelsByKey = {};
    let activeTab = "identification";

    dirtyGuard.register(() => JSON.stringify(formState) !== snapshot);

    shell.setTitle(isNew ? "Novo evento" : formState.title || "Editar evento");
    shell.setBreadcrumb([{ label: "Eventos", href: "#events" }, { label: isNew ? "Novo evento" : formState.title || "Editar" }]);

    function registerField(path, fieldObj) {
      fieldsByPath.set(path, fieldObj);
    }

    function bindText(config) {
      const field = createTextField(config);
      registerField(config.path, field);
      return field;
    }

    function bindTextarea(config) {
      const field = createTextareaField(config);
      registerField(config.path, field);
      return field;
    }

    // --- Cabecalho: resumo de erros -----------------------------------

    const errorSummary = element("div", { className: "admin-error-summary", role: "alert", hidden: true });

    function clearFieldErrors() {
      fieldsByPath.forEach((field) => field.setError(""));
      errorSummary.hidden = true;
      clearChildren(errorSummary);
    }

    function activateTab(key) {
      activeTab = key;
      TABS.forEach((tab) => {
        const button = tabButtonsByKey[tab.key];
        const isActive = tab.key === key;
        button.setAttribute("aria-selected", String(isActive));
        button.classList.toggle("is-active", isActive);
        panelsByKey[tab.key].hidden = !isActive;
      });
    }

    function applyErrors(errors) {
      clearFieldErrors();
      if (!errors || !errors.length) return;
      errorSummary.hidden = false;
      errorSummary.appendChild(element("p", { className: "admin-error-summary__title", text: "Corrija os campos indicados:" }));
      errorSummary.appendChild(element("ul", {}, errors.map((err) => element("li", { text: err.message }))));

      errors.forEach((err) => {
        const field = fieldsByPath.get(err.field);
        if (field) field.setError(err.message);
      });

      const first = errors[0];
      activateTab(fieldToTab(first.field));
      const field = fieldsByPath.get(first.field);
      if (field) {
        field.focus();
      } else {
        const panel = panelsByKey[fieldToTab(first.field)];
        const target = panel.querySelector("input, select, textarea, button");
        if (target) target.focus();
      }
    }

    // --- Tabs -----------------------------------------------------------

    const tabList = element("div", { className: "admin-tabs", role: "tablist", "aria-label": "Seções do evento" });
    const tabButtonsByKey = {};
    TABS.forEach((tab) => {
      const button = element(
        "button",
        {
          type: "button",
          role: "tab",
          id: "eventTab-" + tab.key,
          "aria-controls": "eventPanel-" + tab.key,
          "aria-selected": String(tab.key === activeTab),
          className: "admin-tab" + (tab.key === activeTab ? " is-active" : ""),
          onClick: () => activateTab(tab.key),
        },
        [tab.label]
      );
      tabButtonsByKey[tab.key] = button;
      tabList.appendChild(button);
    });

    const panelsWrap = element("div", { className: "admin-tab-panels" });
    TABS.forEach((tab) => {
      const panel = element("div", {
        id: "eventPanel-" + tab.key,
        role: "tabpanel",
        "aria-labelledby": "eventTab-" + tab.key,
        className: "admin-tab-panel",
        hidden: tab.key !== activeTab,
      });
      panelsByKey[tab.key] = panel;
      panelsWrap.appendChild(panel);
    });

    // --- Identificacao ----------------------------------------------------

    const identificationPanel = panelsByKey.identification;
    if (!isNew) {
      identificationPanel.appendChild(
        element("p", { className: "admin-field-static" }, [
          element("strong", { text: "ID: " }),
          element("span", { text: formState.id }),
        ])
      );
    }
    identificationPanel.appendChild(
      bindText({ path: "title", id: "eventTitle", label: "Título", required: true, value: formState.title, onInput: (v) => (formState.title = v) }).root
    );
    identificationPanel.appendChild(
      bindText({ path: "slug", id: "eventSlug", label: "Slug", required: true, value: formState.slug, onInput: (v) => (formState.slug = v) }).root
    );
    identificationPanel.appendChild(
      bindText({ path: "shortTitle", id: "eventShortTitle", label: "Título curto", value: formState.shortTitle, onInput: (v) => (formState.shortTitle = v) })
        .root
    );
    identificationPanel.appendChild(
      bindText({ path: "sport", id: "eventSport", label: "Modalidade", value: formState.sport, onInput: (v) => (formState.sport = v) }).root
    );
    identificationPanel.appendChild(
      bindText({ path: "sportKey", id: "eventSportKey", label: "Chave da modalidade", value: formState.sportKey, onInput: (v) => (formState.sportKey = v) })
        .root
    );
    identificationPanel.appendChild(
      createSelectField({
        id: "eventStatus",
        label: "Estado operacional",
        required: true,
        value: formState.status,
        options: OPERATIONAL_STATUSES.map((value) => ({ value, label: STATUS_LABELS[value] })),
        onInput: (v) => (formState.status = v),
      }).root
    );
    identificationPanel.appendChild(
      createCheckboxField({ label: "Evento em destaque na página inicial", value: formState.featured, onInput: (v) => (formState.featured = v) }).root
    );
    identificationPanel.appendChild(
      createCheckboxField({ label: "Evento demonstrativo (não representa agenda real)", value: formState.demo, onInput: (v) => (formState.demo = v) }).root
    );
    identificationPanel.appendChild(
      element("p", { className: "admin-field-static" }, [
        element("strong", { text: "Estado editorial: " }),
        element("span", { className: "admin-badge admin-badge--editorial-" + formState.editorialStatus, text: EDITORIAL_LABELS[formState.editorialStatus] }),
      ])
    );

    // --- Apresentacao -------------------------------------------------

    const presentationPanel = panelsByKey.presentation;
    presentationPanel.appendChild(
      bindTextarea({ path: "summary", id: "eventSummary", label: "Resumo", required: true, value: formState.summary, onInput: (v) => (formState.summary = v) })
        .root
    );
    presentationPanel.appendChild(
      bindTextarea({ path: "description", id: "eventDescription", label: "Descrição completa", value: formState.description, onInput: (v) => (formState.description = v) })
        .root
    );
    presentationPanel.appendChild(
      createTextField({
        id: "eventKeywords",
        label: "Palavras-chave (separadas por vírgula)",
        value: (formState.keywords || []).join(", "),
        onInput: (v) => {
          formState.keywords = v
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        },
      }).root
    );
    presentationPanel.appendChild(
      createTextField({ id: "eventOrganization", label: "Organização", value: formState.organization, onInput: (v) => (formState.organization = v) }).root
    );

    // --- Data e local ---------------------------------------------------

    const scheduleLocationPanel = panelsByKey["schedule-location"];
    scheduleLocationPanel.appendChild(
      bindText({ path: "date.label", id: "eventDateLabel", label: "Label da data", value: formState.date.label, onInput: (v) => (formState.date.label = v) })
        .root
    );
    scheduleLocationPanel.appendChild(
      bindText({ path: "date.start", id: "eventDateStart", label: "Início", type: "date", value: formState.date.start, onInput: (v) => (formState.date.start = v) })
        .root
    );
    scheduleLocationPanel.appendChild(
      bindText({ path: "date.end", id: "eventDateEnd", label: "Fim", type: "date", value: formState.date.end, onInput: (v) => (formState.date.end = v) }).root
    );
    scheduleLocationPanel.appendChild(
      bindText({ path: "date.sort", id: "eventDateSort", label: "Campo de ordenação (AAAA-MM-DD)", value: formState.date.sort, onInput: (v) => (formState.date.sort = v) })
        .root
    );
    scheduleLocationPanel.appendChild(
      createTextField({ id: "eventVenue", label: "Ginásio ou espaço", value: formState.location.venue, onInput: (v) => (formState.location.venue = v) }).root
    );
    scheduleLocationPanel.appendChild(
      createTextField({ id: "eventCity", label: "Cidade", value: formState.location.city, onInput: (v) => (formState.location.city = v) }).root
    );
    scheduleLocationPanel.appendChild(
      createTextField({ id: "eventState", label: "Estado (UF)", value: formState.location.state, onInput: (v) => (formState.location.state = v) }).root
    );
    scheduleLocationPanel.appendChild(
      bindText({
        path: "capacity.teams",
        id: "eventCapacityTeams",
        label: "Capacidade de equipes",
        type: "number",
        value: formState.capacity.teams,
        onInput: (v) => (formState.capacity.teams = v),
      }).root
    );
    scheduleLocationPanel.appendChild(
      createTextField({ id: "eventCapacityLabel", label: "Label da capacidade", value: formState.capacity.label, onInput: (v) => (formState.capacity.label = v) })
        .root
    );

    // --- Categorias -------------------------------------------------

    renderRepeatableList({
      container: panelsByKey.categories,
      items: formState.categories,
      itemLabel: "categoria",
      createEmpty: () => ({ id: generateId("cat"), name: "", division: "", gender: "" }),
      renderItemFields(fieldsContainer, item, index) {
        fieldsContainer.appendChild(createTextField({ label: "ID", value: item.id, required: true, onInput: (v) => (item.id = v) }).root);
        fieldsContainer.appendChild(createTextField({ label: "Nome", value: item.name, required: true, onInput: (v) => (item.name = v) }).root);
        fieldsContainer.appendChild(createTextField({ label: "Divisão", value: item.division, onInput: (v) => (item.division = v) }).root);
        fieldsContainer.appendChild(createTextField({ label: "Gênero", value: item.gender, onInput: (v) => (item.gender = v) }).root);
      },
    });

    // --- Programacao -------------------------------------------------

    renderRepeatableList({
      container: panelsByKey.programming,
      items: formState.schedule,
      itemLabel: "item da programação",
      createEmpty: () => ({ label: "", value: "" }),
      renderItemFields(fieldsContainer, item) {
        fieldsContainer.appendChild(createTextField({ label: "Título ou data", value: item.label, onInput: (v) => (item.label = v) }).root);
        fieldsContainer.appendChild(createTextareaField({ label: "Descrição", value: item.value, rows: 2, onInput: (v) => (item.value = v) }).root);
      },
    });

    // --- Inscricao -------------------------------------------------

    const registrationPanel = panelsByKey.registration;
    registrationPanel.appendChild(
      createSelectField({
        id: "eventRegistrationType",
        label: "Tipo de inscrição",
        value: formState.registrationType,
        options: [{ value: "team", label: "Por equipe" }],
        onInput: (v) => (formState.registrationType = v),
      }).root
    );
    registrationPanel.appendChild(
      bindText({
        path: "registrationPeriod.start",
        id: "eventRegStart",
        label: "Início das inscrições",
        type: "date",
        value: formState.registrationPeriod.start,
        onInput: (v) => (formState.registrationPeriod.start = v),
      }).root
    );
    registrationPanel.appendChild(
      bindText({
        path: "registrationPeriod.end",
        id: "eventRegEnd",
        label: "Fim das inscrições",
        type: "date",
        value: formState.registrationPeriod.end,
        onInput: (v) => (formState.registrationPeriod.end = v),
      }).root
    );
    registrationPanel.appendChild(
      createTextField({ id: "eventRegLabel", label: "Label do período", value: formState.registrationPeriod.label, onInput: (v) => (formState.registrationPeriod.label = v) })
        .root
    );
    registrationPanel.appendChild(
      createTextField({ id: "eventFeePerTeam", label: "Taxa por equipe", value: formState.registrationDetails.feePerTeam, onInput: (v) => (formState.registrationDetails.feePerTeam = v) })
        .root
    );
    registrationPanel.appendChild(
      createTextField({
        id: "eventDualFee",
        label: "Condição para duas equipes",
        value: formState.registrationDetails.dualInstitutionFee,
        onInput: (v) => (formState.registrationDetails.dualInstitutionFee = v),
      }).root
    );
    registrationPanel.appendChild(
      bindText({
        path: "registrationDetails.maxMembers",
        id: "eventMaxMembers",
        label: "Máximo de integrantes",
        type: "number",
        value: formState.registrationDetails.maxMembers,
        onInput: (v) => (formState.registrationDetails.maxMembers = v),
      }).root
    );
    registrationPanel.appendChild(
      bindText({
        path: "registrationDetails.maxAthletes",
        id: "eventMaxAthletes",
        label: "Máximo de atletas",
        type: "number",
        value: formState.registrationDetails.maxAthletes,
        onInput: (v) => (formState.registrationDetails.maxAthletes = v),
      }).root
    );
    registrationPanel.appendChild(
      bindText({
        path: "registrationDetails.maxStaff",
        id: "eventMaxStaff",
        label: "Máximo de comissão técnica",
        type: "number",
        value: formState.registrationDetails.maxStaff,
        onInput: (v) => (formState.registrationDetails.maxStaff = v),
      }).root
    );
    registrationPanel.appendChild(
      bindText({
        path: "registrationDetails.matchRosterLimit",
        id: "eventMatchRoster",
        label: "Limite de relacionados por partida",
        type: "number",
        value: formState.registrationDetails.matchRosterLimit,
        onInput: (v) => (formState.registrationDetails.matchRosterLimit = v),
      }).root
    );
    registrationPanel.appendChild(
      bindText({
        path: "registrationConfig.minParticipants",
        id: "eventMinParticipants",
        label: "Mínimo de participantes",
        type: "number",
        value: formState.registrationConfig.minParticipants,
        onInput: (v) => (formState.registrationConfig.minParticipants = v),
      }).root
    );
    registrationPanel.appendChild(
      bindText({
        path: "registrationConfig.maxParticipants",
        id: "eventMaxParticipants",
        label: "Máximo de participantes",
        type: "number",
        value: formState.registrationConfig.maxParticipants,
        onInput: (v) => (formState.registrationConfig.maxParticipants = v),
      }).root
    );
    registrationPanel.appendChild(
      createCheckboxField({
        label: "Nascimento obrigatório",
        value: formState.registrationConfig.birthDateRequired,
        onInput: (v) => (formState.registrationConfig.birthDateRequired = v),
      }).root
    );
    registrationPanel.appendChild(
      createCheckboxField({
        label: "Número de camisa obrigatório",
        value: formState.registrationConfig.jerseyNumberRequired,
        onInput: (v) => (formState.registrationConfig.jerseyNumberRequired = v),
      }).root
    );

    // --- Regulamento -------------------------------------------------

    const regulationPanel = panelsByKey.regulation;
    regulationPanel.appendChild(
      element("p", { className: "admin-field-hint", text: "Estes campos são apenas metadados. O texto oficial do regulamento não é editado nesta fase." })
    );
    regulationPanel.appendChild(
      createCheckboxField({ label: "Regulamento disponível", value: formState.regulation.available, onInput: (v) => (formState.regulation.available = v) })
        .root
    );
    regulationPanel.appendChild(
      createTextField({ id: "eventRegulationId", label: "Identificador", value: formState.regulation.id, onInput: (v) => (formState.regulation.id = v) }).root
    );
    regulationPanel.appendChild(
      createTextField({ id: "eventRegulationTitle", label: "Título", value: formState.regulation.title, onInput: (v) => (formState.regulation.title = v) })
        .root
    );
    regulationPanel.appendChild(
      createTextField({ id: "eventRegulationLabel", label: "Label da ação", value: formState.regulation.label, onInput: (v) => (formState.regulation.label = v) })
        .root
    );
    regulationPanel.appendChild(
      createTextField({
        id: "eventRegulationPages",
        label: "Quantidade de páginas",
        type: "number",
        value: formState.regulation.pages,
        onInput: (v) => (formState.regulation.pages = v),
      }).root
    );
    regulationPanel.appendChild(
      createTextField({ id: "eventRegulationVersion", label: "Versão", value: formState.regulation.version, onInput: (v) => (formState.regulation.version = v) })
        .root
    );
    regulationPanel.appendChild(
      createTextField({
        id: "eventRegulationPublished",
        label: "Data de publicação",
        type: "date",
        value: formState.regulation.publishedAt,
        onInput: (v) => (formState.regulation.publishedAt = v),
      }).root
    );
    regulationPanel.appendChild(
      createTextField({
        id: "eventRegulationReference",
        label: "Referência do documento",
        value: formState.regulation.reference,
        onInput: (v) => (formState.regulation.reference = v),
      }).root
    );
    regulationPanel.appendChild(
      createCheckboxField({ label: "Marcar como “A confirmar”", value: formState.regulation.toBeConfirmed, onInput: (v) => (formState.regulation.toBeConfirmed = v) })
        .root
    );

    // --- Premiacao e destaques -------------------------------------------------

    renderRepeatableList({
      container: panelsByKey.highlights,
      items: formState.highlights,
      itemLabel: "destaque",
      createEmpty: () => ({ title: "", detail: "" }),
      renderItemFields(fieldsContainer, item) {
        fieldsContainer.appendChild(createTextField({ label: "Título", value: item.title, onInput: (v) => (item.title = v) }).root);
        fieldsContainer.appendChild(createTextareaField({ label: "Descrição", value: item.detail, rows: 2, onInput: (v) => (item.detail = v) }).root);
      },
    });

    // --- Patrocinadores -------------------------------------------------

    renderRepeatableList({
      container: panelsByKey.sponsors,
      items: formState.sponsors,
      itemLabel: "patrocinador",
      createEmpty: () => ({ name: "", image: null, url: "", alt: "" }),
      renderItemFields(fieldsContainer, item, index) {
        fieldsContainer.appendChild(createTextField({ label: "Nome", value: item.name, onInput: (v) => (item.name = v) }).root);
        fieldsContainer.appendChild(
          bindText({
            path: "sponsors." + index + ".url",
            label: "URL",
            type: "url",
            value: item.url,
            onInput: (v) => (item.url = v),
          }).root
        );
        fieldsContainer.appendChild(
          bindText({ path: "sponsors." + index + ".alt", label: "Texto alternativo", value: item.alt, onInput: (v) => (item.alt = v) }).root
        );
        const pickButton = element(
          "button",
          {
            type: "button",
            className: "admin-btn admin-btn--secondary",
            onClick: async () => {
              const picked = await openMediaPicker(shell.getDialogRoot());
              if (picked) {
                item.image = picked.id;
                shell.showToast("Imagem do patrocinador selecionada.");
              }
            },
          },
          [element("span", { text: item.image ? "Trocar imagem" : "Escolher imagem" })]
        );
        fieldsContainer.appendChild(pickButton);
      },
    });

    // --- Imagem do evento -------------------------------------------------

    const imagePanel = panelsByKey.image;
    const imagePreviewWrap = element("div", { className: "admin-image-preview" });

    async function refreshImagePreview() {
      clearChildren(imagePreviewWrap);
      if (!formState.visual.mediaId) {
        imagePreviewWrap.appendChild(element("p", { className: "admin-empty-state", text: "Nenhuma imagem selecionada." }));
        return;
      }
      const url = await mediaRepository.getPreviewUrl(formState.visual.mediaId);
      if (url) {
        imagePreviewWrap.appendChild(element("img", { src: url, alt: formState.visual.imageAlt || "" }));
      }
    }

    imagePanel.appendChild(imagePreviewWrap);
    imagePanel.appendChild(
      element(
        "button",
        {
          type: "button",
          className: "admin-btn admin-btn--secondary",
          onClick: async () => {
            const picked = await openMediaPicker(shell.getDialogRoot());
            if (picked) {
              formState.visual.mediaId = picked.id;
              formState.visual.image = picked.path || formState.visual.image;
              if (!formState.visual.imageAlt) formState.visual.imageAlt = picked.alt || "";
              await refreshImagePreview();
            }
          },
        },
        [element("span", { text: "Escolher imagem" })]
      )
    );
    imagePanel.appendChild(
      bindText({
        path: "visual.imageAlt",
        id: "eventImageAlt",
        label: "Texto alternativo",
        required: true,
        value: formState.visual.imageAlt,
        onInput: (v) => (formState.visual.imageAlt = v),
      }).root
    );
    imagePanel.appendChild(
      createTextField({ id: "eventImageLabel", label: "Label visual", value: formState.visual.label, onInput: (v) => (formState.visual.label = v) }).root
    );
    imagePanel.appendChild(
      createTextField({ id: "eventImageAccent", label: "Accent", value: formState.visual.accent, onInput: (v) => (formState.visual.accent = v) }).root
    );
    imagePanel.appendChild(
      createTextField({
        id: "eventFocalX",
        label: "Posição focal horizontal (0–100)",
        type: "number",
        value: formState.visual.focalX,
        onInput: (v) => (formState.visual.focalX = v),
      }).root
    );
    imagePanel.appendChild(
      createTextField({
        id: "eventFocalY",
        label: "Posição focal vertical (0–100)",
        type: "number",
        value: formState.visual.focalY,
        onInput: (v) => (formState.visual.focalY = v),
      }).root
    );
    refreshImagePreview();

    // --- Acoes -------------------------------------------------

    const actionsBar = element("div", { className: "admin-form-actions" });

    const saveButton = element(
      "button",
      {
        type: "button",
        className: "admin-btn admin-btn--primary",
        onClick: async () => {
          const payload = normalizeForSave(formState);
          const result = isNew ? await eventRepository.create(payload) : await eventRepository.update(formState.id, payload);
          if (!result.ok) {
            if (result.error.code === "validation_error") applyErrors(result.error.errors);
            else shell.showToast(result.error.message);
            return;
          }
          clearFieldErrors();
          formState = result.data;
          snapshot = JSON.stringify(formState);
          shell.showToast("Rascunho salvo.");
          if (isNew) {
            isNew = false;
            window.location.hash = "#events/edit/" + formState.id;
          }
        },
      },
      [element("span", { text: "Salvar rascunho" })]
    );

    const previewButton = element(
      "button",
      { type: "button", className: "admin-btn admin-btn--secondary", onClick: () => openEventPreview(formState, shell) },
      [createIcon("eye", { size: 16 }), element("span", { text: "Pré-visualizar" })]
    );

    actionsBar.appendChild(saveButton);
    actionsBar.appendChild(previewButton);

    if (!isNew) {
      actionsBar.appendChild(
        element(
          "button",
          {
            type: "button",
            className: "admin-btn admin-btn--secondary",
            onClick: async () => {
              const result = await eventRepository.duplicate(formState.id);
              if (result.ok) {
                dirtyGuard.clear();
                window.location.hash = "#events/edit/" + result.data.id;
              }
            },
          },
          [createIcon("duplicate", { size: 16 }), element("span", { text: "Duplicar" })]
        )
      );

      const needsPublish = formState.editorialStatus !== "published" || formState.revision > formState.publishedRevision;
      if (needsPublish) {
        const publishButton = element(
          "button",
          {
            type: "button",
            className: "admin-btn admin-btn--secondary",
            onClick: async () => {
              const confirmed = await showConfirmDialog(shell.getDialogRoot(), {
                title: "Publicar evento",
                message: "O rascunho salvo ficará disponível imediatamente no site público.",
                confirmLabel: "Publicar",
              });
              if (!confirmed) return;
              const result = await eventRepository.publish(formState.id);
              if (result.ok) {
                formState = result.data;
                snapshot = JSON.stringify(formState);
                publishButton.disabled = true;
                shell.showToast("Evento publicado.");
              } else shell.showToast(result.error.message);
            },
          },
          [element("span", { text: "Publicar" })]
        );
        actionsBar.appendChild(publishButton);
      }

      if (formState.editorialStatus !== "archived") {
        actionsBar.appendChild(
          element(
            "button",
            {
              type: "button",
              className: "admin-btn admin-btn--secondary",
              onClick: async () => {
                const confirmed = await showConfirmDialog(shell.getDialogRoot(), {
                  title: "Arquivar evento",
                  message: "O evento deixará de aparecer no site público.",
                  confirmLabel: "Arquivar",
                });
                if (!confirmed) return;
                const result = await eventRepository.archive(formState.id);
                if (result.ok) {
                  formState = result.data;
                  snapshot = JSON.stringify(formState);
                  shell.showToast("Evento arquivado.");
                } else shell.showToast(result.error.message);
              },
            },
            [element("span", { text: "Arquivar" })]
          )
        );
      }

      actionsBar.appendChild(
        element(
          "button",
          {
            type: "button",
            className: "admin-btn admin-btn--danger",
            onClick: async () => {
              const confirmed = await showConfirmDialog(shell.getDialogRoot(), {
                title: "Excluir evento",
                message: "Esta ação remove o evento definitivamente dos dados administrativos locais. Não é possível desfazer.",
                confirmLabel: "Excluir",
                destructive: true,
              });
              if (!confirmed) return;
              const result = await eventRepository.delete(formState.id);
              if (result.ok) {
                dirtyGuard.clear();
                shell.showToast("Evento excluído.");
                window.location.hash = "#events";
              } else shell.showToast(result.error.message);
            },
          },
          [createIcon("trash", { size: 16 }), element("span", { text: "Excluir" })]
        )
      );
    }

    clearChildren(container);
    container.appendChild(errorSummary);
    container.appendChild(tabList);
    container.appendChild(panelsWrap);
    container.appendChild(actionsBar);
  },

  unmount() {
    dirtyGuard.release();
    mediaRepository.releaseAllPreviewUrls();
  },
};
