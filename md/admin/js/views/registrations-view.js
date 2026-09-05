// Inscricoes recebidas: metricas por status, listagem paginada com pesquisa e
// filtros, detalhe acessivel e atualizacao automatica a cada cinco segundos.
//
// A listagem carrega o minimo de dado pessoal; telefone, nascimento e a ficha
// completa so aparecem no detalhe, que e uma chamada autenticada separada.

import { element, clearChildren } from "../dom.js";
import { createIcon } from "../icons.js";
import { openDialog } from "../components/dialog-shell.js";
import { formatDateBR, formatDateTimeBR, debounce } from "../utils.js";
import {
  REGISTRATION_STATUSES,
  REGISTRATION_STATUS_LABELS,
  registrationRepository,
} from "../repositories/registration-repository.js";
import { createLiveSync } from "../registrations/live-sync.js";
import { SYNC_INTERVAL_MS, countNewSince, mergeRegistrations } from "../registrations/sync-core.js";

const PAGE_SIZE = 50;

const filters = { query: "", status: "", eventId: "", categoryId: "" };

let liveSync = null;

function statusBadge(status) {
  // Nunca so cor: o rotulo textual acompanha o estado.
  return element("span", {
    className: `admin-badge admin-registrations__status admin-registrations__status--${status}`,
    text: REGISTRATION_STATUS_LABELS[status] || status,
  });
}

function activeFilters() {
  return {
    query: filters.query.trim() || undefined,
    status: filters.status || undefined,
    eventId: filters.eventId || undefined,
    categoryId: filters.categoryId || undefined,
  };
}

export const registrationsView = {
  async mount(container, params, shell) {
    shell.setTitle("Inscrições");
    shell.setBreadcrumb([{ label: "Inscrições" }]);

    // Estado vivo desta montagem. Tudo aqui morre no unmount.
    const view = {
      items: [],
      syncCursor: null,
      nextCursor: null,
      hasMore: false,
      unseen: 0,
      loading: true,
      error: null,
      lastSyncAt: null,
      online: true,
    };

    const metricsStrip = element("div", { className: "admin-metrics-grid admin-registrations__metrics" });
    const liveBar = element("p", {
      className: "admin-registrations__live",
      "aria-live": "polite",
    });
    const newNotice = element("p", {
      className: "admin-registrations__new",
      "aria-live": "polite",
      hidden: true,
    });
    const countEl = element("p", { className: "admin-count", "aria-live": "polite" });
    const listEl = element("div", { className: "admin-registrations__list" });
    const moreWrapper = element("div", { className: "admin-registrations__more" });

    const refreshButton = element(
      "button",
      { type: "button", className: "admin-btn admin-btn--secondary", onClick: () => manualRefresh() },
      [createIcon("check", { size: 16 }), element("span", { text: "Atualizar" })]
    );
    shell.setActions([refreshButton]);

    const searchInput = element("input", {
      id: "registrationSearchInput",
      type: "search",
      className: "admin-input",
      placeholder: "Buscar por protocolo, equipe ou responsável",
    });
    searchInput.value = filters.query;

    const statusSelect = element(
      "select",
      { className: "admin-select", "aria-label": "Filtrar por status" },
      [element("option", { value: "", text: "Todos os status" })].concat(
        REGISTRATION_STATUSES.map((value) => element("option", { value, text: REGISTRATION_STATUS_LABELS[value] }))
      )
    );
    statusSelect.value = filters.status;

    const eventSelect = element("select", { className: "admin-select", "aria-label": "Filtrar por evento" }, [
      element("option", { value: "", text: "Todos os eventos" }),
    ]);
    const categorySelect = element("select", { className: "admin-select", "aria-label": "Filtrar por categoria" }, [
      element("option", { value: "", text: "Todas as categorias" }),
    ]);

    const toolbar = element("form", { className: "admin-toolbar", role: "search" }, [
      element("label", { className: "admin-visually-hidden", for: "registrationSearchInput", text: "Buscar inscrições" }),
      searchInput,
      statusSelect,
      eventSelect,
      categorySelect,
    ]);
    toolbar.addEventListener("submit", (event) => event.preventDefault());

    const root = element("div", { className: "admin-list-page admin-registrations" }, [
      metricsStrip,
      liveBar,
      newNotice,
      toolbar,
      countEl,
      listEl,
      moreWrapper,
    ]);
    container.appendChild(root);

    // --- renderizacao -------------------------------------------------------

    function renderMetrics(metrics) {
      const cards = [
        ["Total", metrics.total],
        [REGISTRATION_STATUS_LABELS.new, metrics.new],
        [REGISTRATION_STATUS_LABELS.reviewing, metrics.reviewing],
        [REGISTRATION_STATUS_LABELS.confirmed, metrics.confirmed],
        [REGISTRATION_STATUS_LABELS.cancelled, metrics.cancelled],
        [REGISTRATION_STATUS_LABELS.rejected, metrics.rejected],
      ].map(([label, value]) =>
        element("div", { className: "admin-metric" }, [
          element("span", { className: "admin-metric__value", text: String(value ?? 0) }),
          element("span", { className: "admin-metric__label", text: label }),
        ])
      );
      metricsStrip.replaceChildren(...cards);
    }

    function renderLiveBar() {
      const parts = [];
      parts.push(view.online ? "Conectado" : "Sem conexão com o servidor");
      parts.push(
        view.lastSyncAt
          ? `última sincronização às ${formatTime(view.lastSyncAt)}`
          : "aguardando primeira sincronização"
      );
      parts.push(`atualização automática a cada ${Math.round(SYNC_INTERVAL_MS / 1000)}s`);
      liveBar.textContent = parts.join(" · ");
      liveBar.classList.toggle("admin-registrations__live--offline", !view.online);
    }

    function renderNewNotice() {
      if (!view.unseen) {
        newNotice.hidden = true;
        newNotice.textContent = "";
        return;
      }
      newNotice.hidden = false;
      newNotice.textContent =
        view.unseen === 1
          ? "1 nova inscrição chegou desde a última visualização."
          : `${view.unseen} novas inscrições chegaram desde a última visualização.`;
    }

    function renderFilterOptions() {
      syncOptions(eventSelect, uniqueBy(view.items, "eventId", "eventTitle", "eventSlug"), filters.eventId);
      syncOptions(categorySelect, uniqueBy(view.items, "categoryId", "categoryId"), filters.categoryId);
    }

    function renderList() {
      clearChildren(listEl);
      clearChildren(moreWrapper);

      if (view.loading && !view.items.length) {
        listEl.appendChild(element("div", { className: "admin-empty-state" }, [element("p", { text: "Carregando inscrições..." })]));
        countEl.textContent = "";
        return;
      }

      if (view.error && !view.items.length) {
        listEl.appendChild(
          element("div", { className: "admin-empty-state" }, [
            element("p", { text: view.error }),
            element("button", { type: "button", className: "admin-btn admin-btn--secondary", text: "Tentar novamente", onClick: () => manualRefresh() }),
          ])
        );
        countEl.textContent = "";
        return;
      }

      countEl.textContent =
        view.items.length === 1 ? "1 inscrição carregada" : `${view.items.length} inscrições carregadas`;

      if (!view.items.length) {
        listEl.appendChild(
          element("div", { className: "admin-empty-state" }, [
            element("p", { text: "Nenhuma inscrição encontrada com os filtros atuais." }),
          ])
        );
        return;
      }

      listEl.appendChild(buildTable(view.items));
      listEl.appendChild(buildCards(view.items));

      if (view.hasMore) {
        moreWrapper.appendChild(
          element("button", {
            type: "button",
            className: "admin-btn admin-btn--secondary",
            text: "Carregar mais inscrições",
            onClick: () => loadMore(),
          })
        );
      }
    }

    function buildTable(items) {
      const head = element("thead", {}, [
        element("tr", {}, [
          element("th", { scope: "col", text: "Protocolo" }),
          element("th", { scope: "col", text: "Equipe" }),
          element("th", { scope: "col", text: "Evento" }),
          element("th", { scope: "col", text: "Categoria" }),
          element("th", { scope: "col", text: "Responsável" }),
          element("th", { scope: "col", text: "Recebida em" }),
          element("th", { scope: "col", text: "Status" }),
          element("th", { scope: "col" }, [element("span", { className: "admin-visually-hidden", text: "Ações" })]),
        ]),
      ]);

      const body = element(
        "tbody",
        {},
        items.map((item) =>
          element("tr", { dataset: { registrationId: item.id } }, [
            element("td", { text: item.protocol || "-" }),
            element("td", { text: item.teamName || "-" }),
            element("td", { text: item.eventTitle || item.eventSlug || "-" }),
            element("td", { text: item.categoryId || "-" }),
            element("td", { text: item.responsibleName || "-" }),
            element("td", { text: formatDateTimeBR(item.createdAt) }),
            element("td", {}, [statusBadge(item.status)]),
            element("td", {}, [
              element("button", {
                type: "button",
                className: "admin-btn admin-btn--ghost admin-btn--small",
                text: "Abrir",
                "aria-label": `Abrir inscrição ${item.protocol || item.id}`,
                onClick: () => openDetail(item),
              }),
            ]),
          ])
        )
      );

      return element("table", { className: "admin-registrations__table" }, [
        element("caption", { className: "admin-visually-hidden", text: "Inscrições recebidas" }),
        head,
        body,
      ]);
    }

    function buildCards(items) {
      return element(
        "ul",
        { className: "admin-registrations__cards" },
        items.map((item) =>
          element("li", { className: "admin-registrations__card" }, [
            element("div", { className: "admin-registrations__card-head" }, [
              element("strong", { text: item.protocol || item.id }),
              statusBadge(item.status),
            ]),
            element("p", { className: "admin-registrations__card-team", text: item.teamName || "Equipe não informada" }),
            definitionList([
              ["Evento", item.eventTitle || item.eventSlug || "-"],
              ["Categoria", item.categoryId || "-"],
              ["Responsável", item.responsibleName || "-"],
              ["Recebida em", formatDateTimeBR(item.createdAt)],
            ]),
            element("button", {
              type: "button",
              className: "admin-btn admin-btn--secondary admin-btn--small",
              text: "Abrir inscrição",
              "aria-label": `Abrir inscrição ${item.protocol || item.id}`,
              onClick: () => openDetail(item),
            }),
          ])
        )
      );
    }

    // --- dados --------------------------------------------------------------

    async function loadMetrics() {
      const result = await registrationRepository.metrics(activeFilters());
      if (result.ok) renderMetrics(result.data || {});
    }

    async function loadFirstPage({ preserveUnseen = false } = {}) {
      view.loading = true;
      view.error = null;
      renderList();

      const result = await registrationRepository.list({ ...activeFilters(), limit: PAGE_SIZE });
      view.loading = false;

      if (!result.ok) {
        view.error = describeError(result.error);
        view.online = false;
        renderLiveBar();
        renderList();
        return;
      }

      const data = result.data || {};
      view.items = Array.isArray(data.items) ? data.items : [];
      view.syncCursor = data.syncCursor || null;
      view.nextCursor = data.nextCursor || null;
      view.hasMore = Boolean(data.hasMore);
      view.online = true;
      view.lastSyncAt = Date.now();
      if (!preserveUnseen) view.unseen = 0;

      renderFilterOptions();
      renderNewNotice();
      renderLiveBar();
      renderList();
    }

    async function loadMore() {
      if (!view.nextCursor) return;
      const result = await registrationRepository.list({
        ...activeFilters(),
        limit: PAGE_SIZE,
        cursor: view.nextCursor,
      });
      if (!result.ok) {
        shell.showToast(describeError(result.error));
        return;
      }
      const data = result.data || {};
      view.items = mergeRegistrations(view.items, data.items || []);
      view.nextCursor = data.nextCursor || null;
      view.hasMore = Boolean(data.hasMore);
      renderFilterOptions();
      renderList();
    }

    function applyBatch(result, context) {
      const data = result.data || {};
      const incoming = Array.isArray(data.items) ? data.items : [];

      if (context.reconcile) {
        // Reconciliacao troca a pagina inteira, mas preserva o que ja foi
        // carregado por paginacao alem da primeira pagina.
        view.syncCursor = data.syncCursor || view.syncCursor;
        view.nextCursor = data.nextCursor || null;
        view.hasMore = Boolean(data.hasMore);
      } else if (data.syncCursor) {
        view.syncCursor = data.syncCursor;
      }

      if (!incoming.length) {
        renderLiveBar();
        return;
      }

      const merged = mergeRegistrations(view.items, incoming);
      const added = countNewSince(view.items, merged);
      view.items = merged;
      if (added) view.unseen += added;

      renderFilterOptions();
      renderNewNotice();
      renderLiveBar();
      renderList();
    }

    async function manualRefresh() {
      view.unseen = 0;
      renderNewNotice();
      await Promise.all([loadFirstPage(), loadMetrics()]);
      liveSync?.refreshNow();
    }

    // --- detalhe ------------------------------------------------------------

    async function openDetail(item) {
      const result = await registrationRepository.getById(item.id);
      if (!result.ok) {
        shell.showToast(describeError(result.error));
        return;
      }
      await showDetailDialog(result.data);
    }

    async function showDetailDialog(registration) {
      let current = registration;

      const changed = await openDialog(shell.getDialogRoot(), {
        size: "large",
        ariaLabel: `Inscrição ${current.protocol}`,
        escapeValue: false,
        render(close) {
          const feedback = element("p", { className: "admin-registrations__detail-feedback", "aria-live": "polite" });

          const statusField = element(
            "select",
            { className: "admin-select", "aria-label": "Status da inscrição" },
            REGISTRATION_STATUSES.map((value) =>
              element("option", { value, text: REGISTRATION_STATUS_LABELS[value] })
            )
          );
          statusField.value = current.status;

          const saveButton = element("button", {
            type: "button",
            className: "admin-btn admin-btn--primary",
            text: "Salvar status",
            onClick: async () => {
              saveButton.disabled = true;
              const update = await registrationRepository.updateStatus(current.id, statusField.value, current.updatedAt);
              saveButton.disabled = false;

              if (update.ok) {
                shell.showToast("Status atualizado.");
                close(true);
                return;
              }

              if (update.error?.code === "revision_conflict" || update.error?.status === 409) {
                // Outra sessao alterou antes: recarrega em vez de sobrescrever.
                const fresh = await registrationRepository.getById(current.id);
                if (fresh.ok) {
                  current = fresh.data;
                  statusField.value = current.status;
                }
                feedback.textContent =
                  "Outro organizador alterou esta inscrição enquanto ela estava aberta. O registro foi recarregado; confira o status atual antes de salvar de novo.";
                return;
              }

              feedback.textContent = describeError(update.error);
            },
          });

          return element("div", {}, [
            element("header", { className: "admin-dialog__header" }, [
              element("h2", { text: `Inscrição ${current.protocol}` }),
              element("p", { className: "admin-dialog__subtitle", text: current.eventTitle || current.eventSlug || "" }),
            ]),
            element("div", { className: "admin-registrations__detail" }, [
              section("Equipe", definitionList([
                ["Nome", current.team?.name || "-"],
                ["Cidade", current.team?.city || "-"],
                ["Estado", current.team?.state || "-"],
                ["Instituição", current.team?.institution || "-"],
                ["Categoria", current.categoryId || "-"],
                ["Modalidade de inscrição", current.registrationType || "-"],
              ])),
              section(
                "Responsáveis",
                (current.responsibles || []).length
                  ? element(
                      "ul",
                      { className: "admin-registrations__people" },
                      current.responsibles.map((person) =>
                        element("li", {}, [
                          element("strong", { text: person.name || "-" }),
                          element("span", { text: [person.email, person.phone, person.role].filter(Boolean).join(" · ") }),
                        ])
                      )
                    )
                  : element("p", { text: "Nenhum responsável registrado." })
              ),
              section("Atletas", memberList(current.members, "athlete", "Nenhum atleta registrado.")),
              section("Comissão técnica", memberList(current.members, "staff", "Nenhum membro da comissão registrado.")),
              section(
                "Consentimentos e regulamento",
                definitionList(
                  (current.consents || [])
                    .map((consent) => [consentLabel(consent.type), `${consent.version} · ${formatDateTimeBR(consent.acceptedAt)}`])
                    .concat([
                      ["Regulamento", current.regulation?.version || "Sem regulamento vinculado"],
                      ["Publicado em", current.regulation?.publishedAt ? formatDateTimeBR(current.regulation.publishedAt) : "-"],
                    ])
                )
              ),
              section("Registro", definitionList([
                ["Identificador", current.id],
                ["Recebida em", formatDateTimeBR(current.createdAt)],
                ["Última alteração", formatDateTimeBR(current.updatedAt)],
              ])),
            ]),
            element("div", { className: "admin-dialog__actions" }, [
              element("label", { className: "admin-visually-hidden", for: "registrationStatusField", text: "Status" }),
              statusField,
              saveButton,
              element("button", {
                type: "button",
                className: "admin-btn admin-btn--ghost",
                text: "Fechar",
                "data-autofocus": "",
                onClick: () => close(false),
              }),
            ]),
            feedback,
          ]);
        },
      });

      if (changed) await manualRefresh();
    }

    // --- ligacao ------------------------------------------------------------

    const runSearch = debounce(() => {
      filters.query = searchInput.value;
      manualRefresh();
    }, 300);

    searchInput.addEventListener("input", runSearch);
    statusSelect.addEventListener("change", () => {
      filters.status = statusSelect.value;
      manualRefresh();
    });
    eventSelect.addEventListener("change", () => {
      filters.eventId = eventSelect.value;
      manualRefresh();
    });
    categorySelect.addEventListener("change", () => {
      filters.categoryId = categorySelect.value;
      manualRefresh();
    });

    await Promise.all([loadFirstPage(), loadMetrics()]);

    liveSync = createLiveSync({
      fetchSync: () =>
        view.syncCursor
          ? registrationRepository.sync(view.syncCursor, activeFilters())
          : registrationRepository.list({ ...activeFilters(), limit: PAGE_SIZE }),
      fetchReconcile: () => registrationRepository.list({ ...activeFilters(), limit: PAGE_SIZE }),
      onBatch: (result, context) => {
        applyBatch(result, context);
        loadMetrics();
      },
      onState: (state) => {
        view.online = state.online;
        if (state.lastSyncAt) view.lastSyncAt = state.lastSyncAt;
        renderLiveBar();
      },
    });
    liveSync.start();
  },

  unmount() {
    liveSync?.stop();
    liveSync = null;
  },
};

// --- auxiliares --------------------------------------------------------------

function section(title, content) {
  return element("section", { className: "admin-registrations__section" }, [
    element("h3", { text: title }),
    content,
  ]);
}

function definitionList(rows) {
  const list = element("dl", { className: "admin-registrations__definitions" });
  rows.forEach(([label, value]) => {
    list.appendChild(element("dt", { text: label }));
    list.appendChild(element("dd", { text: value === null || value === undefined || value === "" ? "-" : String(value) }));
  });
  return list;
}

function memberList(members, type, emptyText) {
  const filtered = (members || []).filter((member) => member.type === type);
  if (!filtered.length) return element("p", { text: emptyText });
  return element(
    "ol",
    { className: "admin-registrations__people" },
    filtered.map((member) =>
      element("li", {}, [
        element("strong", { text: member.name || "-" }),
        element("span", {
          text: [
            member.birthDate ? `nasc. ${formatDateBR(member.birthDate)}` : "",
            member.jerseyNumber ? `camisa ${member.jerseyNumber}` : "",
            member.role || "",
          ]
            .filter(Boolean)
            .join(" · "),
        }),
      ])
    )
  );
}

function consentLabel(type) {
  if (type === "accuracy") return "Veracidade das informações";
  if (type === "privacy") return "Uso dos dados";
  if (type === "regulation") return "Regulamento";
  return type;
}

// As opcoes de evento e categoria saem das proprias inscricoes carregadas: o
// papel organizer nao pode consultar a API de eventos.
function uniqueBy(items, valueKey, labelKey, fallbackKey) {
  const map = new Map();
  (items || []).forEach((item) => {
    const value = item?.[valueKey];
    if (!value || map.has(value)) return;
    map.set(value, String(item[labelKey] || item[fallbackKey] || value));
  });
  return Array.from(map.entries())
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function syncOptions(select, options, selected) {
  const keep = select.firstElementChild;
  clearChildren(select);
  select.appendChild(keep);
  options.forEach((option) => select.appendChild(element("option", { value: option.value, text: option.label })));
  select.value = options.some((option) => option.value === selected) ? selected : "";
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function describeError(error) {
  const code = String(error?.code || "");
  if (code === "offline") return "Sem conexão com o servidor. A lista volta a atualizar assim que a rede retornar.";
  if (code === "timeout") return "O servidor demorou a responder. Tente atualizar novamente.";
  if (code === "forbidden") return "Seu perfil não tem permissão para esta operação.";
  return error?.message || "Não foi possível carregar as inscrições.";
}
