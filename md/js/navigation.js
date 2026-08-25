export function initNavigation() {
  const header = document.getElementById("siteHeader");
  const toggle = document.getElementById("menuToggle");
  const nav = document.getElementById("mainNav");
  const allNavLinks = Array.from(document.querySelectorAll("#mainNav a"));
  const navLinks = allNavLinks.filter(isLocalAnchor);
  const sections = Array.from(document.querySelectorAll("main section[id]"));

  const setScrolled = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  setScrolled();
  window.addEventListener("scroll", setScrolled, { passive: true });

  const closeMenu = () => {
    nav?.classList.remove("is-open");
    toggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  };

  toggle?.addEventListener("click", () => {
    const isOpen = nav?.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
    document.body.classList.toggle("menu-open", Boolean(isOpen));
  });

  allNavLinks.forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  if (!("IntersectionObserver" in window) || !sections.length || !navLinks.length) return;

  const linkMap = new Map(navLinks.map((link) => [link.hash.slice(1), link]));
  const observableSections = sections.filter((section) => linkMap.has(section.id));
  if (!observableSections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const isActive = link === linkMap.get(entry.target.id);
          link.classList.toggle("is-active", isActive);
          if (isActive) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      });
    },
    { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
  );

  observableSections.forEach((section) => observer.observe(section));
}

function isLocalAnchor(link) {
  if (!link.hash) return false;
  const url = new URL(link.getAttribute("href"), window.location.href);
  return url.origin === window.location.origin && normalizePath(url.pathname) === normalizePath(window.location.pathname);
}

function normalizePath(pathname) {
  return pathname.replace(/\/index\.html$/, "/");
}
