// View administrativa para gestao e consulta de inscricoes.
// Permite listar com filtros por evento e status, busca por texto,
// inspecionar ficha completa de atletas e atualizar status com auditoria.

import { element, clearChildren } from "../dom.js";
import { createIcon } from "../icons.js";
import { openDialog } from "../components/dialog-shell.js";
import { showConfirmDialog } from "../components/confirm-dialog.js";
import { formatDateTimeBR, formatDateBR } from "../utils.js";
import { eventRepository } from "../repositories/event-repository.js";
import {
  registrationRepository,
  REGISTRATION_STATUSES,
  REGISTRATION_STATUS_LABELS,
} from "../repositories/registration-repository.js";

const state = {
  query: "",
  status: "",
  eventId: "",
};

function statusBadge(status) {
  const label = REGISTRATION_STATUS_LABELS[status] || status;
  return element("span", {
    className: `admin-badge admin-badge--status-${status}`,
    text: label,
  });
}

function metricCard(label, value, meta) {
  return element("div", { className: "admin-metric" }, [
    element("span", { className: "admin-metric__value", text: String(value) }),
    element("span", { className: "admin-metric__label", text: label }),
    meta ? element("span", { className: "admin-metric__meta", text: meta }) : null,
  ]);
}

function filterRegistrations(items) {
  const q = state.query.trim().toLowerCase();
  return items.filter((item) => {
    if (state.status && item.status !== state.status) return false;
    if (state.eventId && item.eventId !== state.eventId) return false;
    if (!q) return true;

    const protocol = (item.protocol || "").toLowerCase();
    const team = (item.teamName || "").toLowerCase();
    const resp = (item.responsibleName || "").toLowerCase();
    const email = (item.responsibleEmail || "").toLowerCase();
    const event = (item.eventTitle || "").toLowerCase();
    const category = (item.categoryId || "").toLowerCase();

    return (
      protocol.includes(q) ||
      team.includes(q) ||
      resp.includes(q) ||
      email.includes(q) ||
      event.includes(q) ||
      category.includes(q)
    );
  });
}

function openDetailDialog(dialogRoot, registrationId, shell, onUpdated) {
  openDialog(dialogRoot, {
    size: "large",
    ariaLabel: "Ficha de Inscrição",
    render(close) {
      const root = element("div", { className: "admin-registration-detail" });
      const loading = element("p", { className: "admin-empty-state", text: "Carregando detalhes da inscrição..." });
      root.appendChild(loading);

      (async () => {
        const result = await registrationRepository.getById(registrationId);
        if (!result.ok) {
          clearChildren(root);
          root.appendChild(
            element("p", { className: "admin-error-banner", text: result.error.message || "Erro ao carregar inscrição." })
          );
          return;
        }

        const reg = result.data;
        clearChildren(root);

        // Header
        const header = element("div", { className: "admin-dialog__header" }, [
          element("div", {}, [
            element("h2", { className: "admin-dialog__title", text: `Inscrição ${reg.protocol}` }),
            element("p", {
              className: "admin-dialog__meta",
              text: `${reg.eventTitle || reg.eventSlug} · Categoria: ${reg.categoryId}`,
            }),
          ]),
          statusBadge(reg.status),
        ]);
        root.appendChild(header);

        // Body with sections
        const body = element("div", { className: "admin-dialog__body" });

        // Secao 1: Equipe e Responsavel
        const grid = element("div", { className: "admin-form-grid" });

        const teamBox = element("div", { className: "admin-detail-box" }, [
          element("h3", { className: "admin-detail-box__title", text: "Dados da Equipe" }),
          element("p", {}, [element("strong", { text: "Nome: " }), element("span", { text: reg.team?.name || "-" })]),
          element("p", {}, [
            element("strong", { text: "Cidade/UF: " }),
            element("span", { text: `${reg.team?.city || "-"} - ${reg.team?.state || "-"}` }),
          ]),
          reg.team?.institution
            ? element("p", {}, [element("strong", { text: "Instituição: " }), element("span", { text: reg.team.institution })])
            : null,
          element("p", {}, [
            element("strong", { text: "Data de envio: " }),
            element("span", { text: formatDateTimeBR(reg.createdAt) }),
          ]),
        ]);

        const respBox = element("div", { className: "admin-detail-box" }, [
          element("h3", { className: "admin-detail-box__title", text: "Responsável" }),
          ...(reg.responsibles || []).map((resp) =>
            element("div", { className: "admin-detail-item" }, [
              element("p", {}, [element("strong", { text: "Nome: " }), element("span", { text: resp.name })]),
              element("p", {}, [element("strong", { text: "E-mail: " }), element("span", { text: resp.email })]),
              element("p", {}, [element("strong", { text: "Telefone: " }), element("span", { text: resp.phone })]),
              resp.role ? element("p", {}, [element("strong", { text: "Cargo: " }), element("span", { text: resp.role })]) : null,
            ])
          ),
        ]);

        grid.appendChild(teamBox);
        grid.appendChild(respBox);
        body.appendChild(grid);

        // Secao 2: Atletas
        const athletes = (reg.members || []).filter((m) => m.type === "athlete");
        const staff = (reg.members || []).filter((m) => m.type === "staff");

        const athletesSection = element("div", { className: "admin-detail-section" }, [
          element("h3", {
            className: "admin-section-subtitle",
            text: `Atletas Inscritos (${athletes.length})`,
          }),
        ]);

        if (athletes.length) {
          const athleteList = element("div", { className: "admin-athletes-table-wrap" });
          const table = element("table", { className: "admin-athletes-table" }, [
            element("thead", {}, [
              element("tr", {}, [
                element("th", { text: "#" }),
                element("th", { text: "Nome" }),
                element("th", { text: "Nascimento" }),
                element("th", { text: "Camisa" }),
              ]),
            ]),
            element(
              "tbody",
              {},
              athletes.map((a, idx) =>
                element("tr", {}, [
                  element("td", { text: String(idx + 1) }),
                  element("td", { text: a.name }),
                  element("td", { text: a.birthDate ? formatDateBR(a.birthDate) : "-" }),
                  element("td", { text: a.jerseyNumber || "-" }),
                ])
              )
            ),
          ]);
          athleteList.appendChild(table);
          athletesSection.appendChild(athleteList);
        } else {
          athletesSection.appendChild(element("p", { className: "admin-empty-state", text: "Nenhum atleta listado." }));
        }
        body.appendChild(athletesSection);

        // Secao 3: Comissao Tecnica (se houver)
        if (staff.length) {
          const staffSection = element("div", { className: "admin-detail-section" }, [
            element("h3", { className: "admin-section-subtitle", text: `Comissão Técnica (${staff.length})` }),
            element(
              "ul",
              { className: "admin-staff-list" },
              staff.map((s) =>
                element("li", {}, [
                  element("strong", { text: s.name }),
                  s.role ? element("span", { text: ` · ${s.role}` }) : null,
                ])
              )
            ),
          ]);
          body.appendChild(staffSection);
        }

        // Secao 4: Consentimentos e Regulamento
        const consentsSection = element("div", { className: "admin-detail-section" }, [
          element("h3", { className: "admin-section-subtitle", text: "Termos e Consentimentos" }),
          element(
            "ul",
            { className: "admin-consent-list" },
            (reg.consents || []).map((c) => {
              const label =
                c.type === "regulation"
                  ? `Regulamento do evento (${c.version || "versão oficial"})`
                  : c.type === "privacy"
                  ? "Política de Privacidade e LGPD"
                  : "Veracidade das Informações";
              return element("li", {}, [
                element("span", { text: `✓ ${label}` }),
                element("span", { className: "admin-consent-time", text: ` — Aceito em ${formatDateTimeBR(c.acceptedAt)}` }),
              ]);
            })
          ),
        ]);
        body.appendChild(consentsSection);

        // Secao 5: Gestao de Status
        const statusSection = element("div", { className: "admin-status-control" }, [
          element("label", {
            className: "admin-field__label",
            for: "changeStatusSelect",
            text: "Alterar status da inscrição:",
          }),
        ]);

        const statusSelect = element("select", {
          id: "changeStatusSelect",
          className: "admin-select",
        });

        REGISTRATION_STATUSES.forEach((st) => {
          const opt = element("option", { value: st, text: REGISTRATION_STATUS_LABELS[st] || st });
          if (st === reg.status) opt.selected = true;
          statusSelect.appendChild(opt);
        });

        const updateBtn = element("button", {
          type: "button",
          className: "admin-btn admin-btn--primary",
          text: "Salvar novo status",
          onClick: async () => {
            const nextStatus = statusSelect.value;
            if (nextStatus === reg.status) {
              shell.showToast("O status selecionado já é o atual.");
              return;
            }

            if (nextStatus === "cancelled" || nextStatus === "rejected") {
              const confirmed = await showConfirmDialog(dialogRoot, {
                title: `${nextStatus === "cancelled" ? "Cancelar" : "Recusar"} Inscrição`,
                message: `Tem certeza que deseja marcar a inscrição ${reg.protocol} como "${REGISTRATION_STATUS_LABELS[nextStatus]}"?`,
                confirmLabel: "Confirmar alteração",
                destructive: true,
              });
              if (!confirmed) return;
            }

            updateBtn.disabled = true;
            updateBtn.textContent = "Atualizando...";
            const res = await registrationRepository.updateStatus(reg.id, nextStatus, reg.updatedAt);
            if (res.ok) {
              shell.showToast(`Inscrição ${reg.protocol} atualizada para "${REGISTRATION_STATUS_LABELS[nextStatus]}".`);
              close();
              onUpdated();
            } else {
              updateBtn.disabled = false;
              updateBtn.textContent = "Salvar novo status";
              shell.showToast(res.error?.message || "Erro ao atualizar status.");
            }
          },
        });

        const statusRow = element("div", { className: "admin-status-row" }, [statusSelect, updateBtn]);
        statusSection.appendChild(statusRow);
        body.appendChild(statusSection);

        root.appendChild(body);

        // Footer Actions
        const footer = element("div", { className: "admin-dialog__actions" }, [
          element("button", {
            type: "button",
            className: "admin-btn admin-btn--secondary",
            text: "Fechar",
            onClick: () => close(),
          }),
        ]);
        root.appendChild(footer);
      })();

      return root;
    },
  });
}

function buildRow(item, shell, refresh) {
  const viewDetailButton = element(
    "button",
    {
      type: "button",
      className: "admin-icon-btn",
      "aria-label": `Ver ficha completa da inscrição ${item.protocol}`,
      onClick: () => openDetailDialog(shell.getDialogRoot(), item.id, shell, refresh),
    },
    [createIcon("eye", { size: 16 })]
  );

  const quickConfirmBtn =
    item.status === "new" || item.status === "reviewing"
      ? element(
          "button",
          {
            type: "button",
            className: "admin-icon-btn",
            "aria-label": `Confirmar inscrição ${item.protocol}`,
            title: "Confirmar inscrição",
            onClick: async () => {
              const res = await registrationRepository.updateStatus(item.id, "confirmed", item.updatedAt);
              if (res.ok) {
                shell.showToast(`Inscrição ${item.protocol} confirmada.`);
                refresh();
              } else {
                shell.showToast(res.error?.message || "Erro ao confirmar.");
              }
            },
          },
          [createIcon("check", { size: 16 })]
        )
      : null;

  const teamDisplay = item.teamName ? `${item.protocol} · ${item.teamName}` : item.protocol;
  const metaParts = [
    item.eventTitle || item.eventSlug,
    item.categoryId ? `Categoria: ${item.categoryId}` : null,
    item.responsibleName ? `Resp: ${item.responsibleName}` : null,
    item.responsibleEmail || null,
    formatDateTimeBR(item.createdAt),
  ].filter(Boolean);

  return element("article", { className: "admin-row" }, [
    element("div", { className: "admin-row__main" }, [
      element("span", { className: "admin-row__title", text: teamDisplay }),
      element("span", { className: "admin-row__meta", text: metaParts.join(" · ") }),
    ]),
    element("div", { className: "admin-row__badges" }, [statusBadge(item.status)]),
    element("div", { className: "admin-row__actions" }, [viewDetailButton, quickConfirmBtn]),
  ]);
}

export const registrationsView = {
  async mount(container, params, shell) {
    shell.setTitle("Inscrições");
    shell.setBreadcrumb([{ label: "Inscrições" }]);

    const root = element("div", { className: "admin-list-page" });
    const metricsContainer = element("div", { className: "admin-metrics-grid" });
    const listContainer = element("div", { className: "admin-list" });

    // Toolbar
    const toolbar = element("form", { className: "admin-toolbar", role: "search" });
    toolbar.addEventListener("submit", (e) => e.preventDefault());

    // Search Input
    const searchLabel = element("label", {
      className: "admin-visually-hidden",
      for: "regSearchInput",
      text: "Buscar inscrições",
    });
    const searchInput = element("input", {
      type: "search",
      id: "regSearchInput",
      className: "admin-search-input",
      placeholder: "Buscar por protocolo, equipe, responsável...",
      value: state.query,
    });
    searchInput.addEventListener("input", (e) => {
      state.query = e.target.value;
      renderList();
    });

    // Event filter
    const eventSelect = element("select", {
      id: "regEventFilter",
      className: "admin-select",
      "aria-label": "Filtrar por evento",
    });
    eventSelect.appendChild(element("option", { value: "", text: "Todos os eventos" }));
    eventSelect.addEventListener("change", (e) => {
      state.eventId = e.target.value;
      renderList();
    });

    // Status filter
    const statusSelect = element("select", {
      id: "regStatusFilter",
      className: "admin-select",
      "aria-label": "Filtrar por status",
    });
    statusSelect.appendChild(element("option", { value: "", text: "Todos os status" }));
    REGISTRATION_STATUSES.forEach((st) => {
      const opt = element("option", { value: st, text: REGISTRATION_STATUS_LABELS[st] || st });
      if (st === state.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.addEventListener("change", (e) => {
      state.status = e.target.value;
      renderList();
    });

    toolbar.appendChild(searchLabel);
    toolbar.appendChild(searchInput);
    toolbar.appendChild(eventSelect);
    toolbar.appendChild(statusSelect);

    root.appendChild(metricsContainer);
    root.appendChild(toolbar);
    root.appendChild(listContainer);
    container.appendChild(root);

    let allRegistrations = [];

    async function refresh() {
      listContainer.replaceChildren(element("p", { className: "admin-empty-state", text: "Carregando inscrições..." }));

      const [eventsRes, regRes] = await Promise.all([
        eventRepository.list({}),
        registrationRepository.list({}),
      ]);

      // Popula dropdown de eventos
      const events = eventsRes.ok ? eventsRes.data || [] : [];
      clearChildren(eventSelect);
      eventSelect.appendChild(element("option", { value: "", text: "Todos os eventos" }));
      events.forEach((ev) => {
        const opt = element("option", { value: ev.id, text: ev.title });
        if (ev.id === state.eventId) opt.selected = true;
        eventSelect.appendChild(opt);
      });

      if (!regRes.ok) {
        listContainer.replaceChildren(
          element("p", { className: "admin-error-banner", text: regRes.error?.message || "Erro ao carregar inscrições." })
        );
        return;
      }

      allRegistrations = regRes.data || [];
      updateMetrics();
      renderList();
    }

    function updateMetrics() {
      const total = allRegistrations.length;
      const countNew = allRegistrations.filter((r) => r.status === "new").length;
      const countReviewing = allRegistrations.filter((r) => r.status === "reviewing").length;
      const countConfirmed = allRegistrations.filter((r) => r.status === "confirmed").length;

      clearChildren(metricsContainer);
      metricsContainer.appendChild(metricCard("Total de inscrições", total));
      metricsContainer.appendChild(metricCard("Novas inscrições", countNew, countNew ? "Requer atenção" : "Sem pendências"));
      metricsContainer.appendChild(metricCard("Em análise", countReviewing));
      metricsContainer.appendChild(metricCard("Confirmadas", countConfirmed));
    }

    function renderList() {
      const filtered = filterRegistrations(allRegistrations);
      clearChildren(listContainer);

      if (!filtered.length) {
        listContainer.appendChild(
          element("p", {
            className: "admin-empty-state",
            text: allRegistrations.length
              ? "Nenhuma inscrição corresponde aos filtros selecionados."
              : "Nenhuma inscrição recebida ainda.",
          })
        );
        return;
      }

      filtered.forEach((item) => {
        listContainer.appendChild(buildRow(item, shell, refresh));
      });
    }

    await refresh();
  },

  unmount() {},
};
