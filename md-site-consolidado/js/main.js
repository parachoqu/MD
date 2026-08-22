import { initNavigation } from "./navigation.js";
import { initProjects } from "./projects.js";
import { initContactForm } from "./form.js";
import { initMotion } from "./motion.js";
import { initEventList } from "./events/event-list.js";
import { initEventDetail } from "./events/event-detail.js";

document.addEventListener("DOMContentLoaded", () => {
  // initMotion primeiro: prepara o observer de reveal que os módulos
  // dinâmicos reutilizam via revealScope ao renderizar suas listas.
  initMotion();
  initNavigation();
  initProjects();
  initContactForm();
  initEventList();
  initEventDetail();
});
