// App Shell administrativo: topbar, sidebar/drawer, breadcrumb, titulo de tela,
// acoes de tela, toast e logout. Implementado do zero (nao depende de
// js/mobile.js nem js/navigation.js, que sao exclusivos do site publico).

import { element, clearChildren, trapFocus } from "./dom.js";
import { createIcon } from "./icons.js";
import { authService } from "./auth/auth-service.js";

const NAV_ITEMS = [
  { route: "dashboard", hash: "#dashboard", label: "Visão geral", icon: "dashboard" },
  { route: "events", hash: "#events", label: "Eventos", icon: "calendar" },
  { route: "content", hash: "#content/home", label: "Conteúdo do site", icon: "content" },
  { route: "projects", hash: "#projects", label: "Projetos", icon: "projects" },
  { route: "media", hash: "#media", label: "Biblioteca de mídia", icon: "media" },
  { route: "settings", hash: "#settings", label: "Configurações", icon: "settings" },
];

export function initShell(session) {
  const drawerToggle = document.getElementById("adminDrawerToggle");
  const sidebar = document.getElementById("adminSidebar");
  const scrim = document.getElementById("adminScrim");
  const navList = document.getElementById("adminNavList");
  const breadcrumb = document.getElementById("adminBreadcrumb");
  const pageTitle = document.getElementById("adminPageTitle");
  const pageActions = document.getElementById("adminPageActions");
  const main = document.getElementById("adminMain");
  const toast = document.getElementById("adminToast");
  const accountEmail = document.getElementById("accountEmail");
  const logoutButton = document.getElementById("logoutButton");
  const dialogRoot = document.getElementById("adminDialogRoot");

  let toastTimer = null;
  let lastFocusBeforeDrawer = null;

  if (accountEmail && session) accountEmail.textContent = session.email;

  document.querySelectorAll("[data-icon]").forEach((slot) => {
    slot.appendChild(createIcon(slot.dataset.icon, { size: 22 }));
  });

  function buildNav() {
    clearChildren(navList);
    NAV_ITEMS.forEach((item) => {
      const link = element(
        "a",
        { href: item.hash, className: "admin-nav__link", dataset: { route: item.route } },
        [createIcon(item.icon, { size: 20 }), element("span", { text: item.label })]
      );
      link.addEventListener("click", closeDrawer);
      navList.appendChild(element("li", { className: "admin-nav__item" }, [link]));
    });
  }

  function setActiveRoute(route) {
    Array.from(navList.querySelectorAll("[data-route]")).forEach((link) => {
      const isActive = link.dataset.route === route;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  function setTitle(title) {
    pageTitle.textContent = title;
    document.title = title + " | Painel administrativo M&D";
  }

  function setBreadcrumb(items) {
    clearChildren(breadcrumb);
    (items || []).forEach((item, index) => {
      if (index > 0) breadcrumb.appendChild(element("span", { "aria-hidden": "true", text: " / " }));
      if (item.href) {
        breadcrumb.appendChild(element("a", { href: item.href, text: item.label }));
      } else {
        breadcrumb.appendChild(element("span", { text: item.label, "aria-current": "page" }));
      }
    });
  }

  function setActions(nodes) {
    clearChildren(pageActions);
    (nodes || []).forEach((node) => pageActions.appendChild(node));
  }

  function getMainContainer() {
    return main;
  }

  function getDialogRoot() {
    return dialogRoot;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 4000);
  }

  function isDrawerOpen() {
    return sidebar.classList.contains("is-open");
  }

  function openDrawer() {
    lastFocusBeforeDrawer = document.activeElement;
    sidebar.classList.add("is-open");
    scrim.hidden = false;
    drawerToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("admin-scroll-lock");
    const firstLink = sidebar.querySelector("a");
    if (firstLink) firstLink.focus();
  }

  function closeDrawer() {
    if (!isDrawerOpen()) return;
    sidebar.classList.remove("is-open");
    scrim.hidden = true;
    drawerToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("admin-scroll-lock");
    if (lastFocusBeforeDrawer && document.body.contains(lastFocusBeforeDrawer)) {
      lastFocusBeforeDrawer.focus();
    } else {
      drawerToggle.focus();
    }
  }

  drawerToggle.addEventListener("click", () => {
    if (isDrawerOpen()) closeDrawer();
    else openDrawer();
  });

  scrim.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (event) => {
    if (!isDrawerOpen()) return;
    if (event.key === "Escape") {
      closeDrawer();
      return;
    }
    trapFocus(sidebar, event);
  });

  logoutButton.addEventListener("click", async () => {
    const confirmed = window.confirm("Deseja sair do painel administrativo?");
    if (!confirmed) return;
    await authService.signOut();
    window.location.href = "login.html";
  });

  buildNav();

  return {
    setTitle,
    setBreadcrumb,
    setActions,
    getMainContainer,
    getDialogRoot,
    showToast,
    setActiveRoute,
    closeDrawer,
  };
}
