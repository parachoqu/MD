import { initNavigation } from "./navigation.js";
import { initProjects } from "./projects.js";
import { initContactForm } from "./form.js";
import { initMotion } from "./motion.js";
import { initEventList } from "./events/event-list.js";
import { initEventDetail } from "./events/event-detail.js";
import { initRegulation } from "./regulation.js";
import { initHeroCarousel } from "./hero-carousel.js";
import { initMobile } from "./mobile.js";

document.addEventListener("DOMContentLoaded", async () => {
  // initMotion primeiro: prepara o observer de reveal que os módulos
  // dinâmicos reutilizam via revealScope ao renderizar suas listas.
  initMotion();
  initNavigation();
  initContactForm();
  initRegulation();
  initHeroCarousel();

  // Os módulos que dependem da API publicam o DOM de forma assíncrona.
  // initProjects vem primeiro na lista porque é ele quem dispara o bootstrap;
  // a lista de eventos reaproveita essa mesma resposta na página inicial.
  await Promise.all([initProjects(), initEventList(), initEventDetail()]);

  // initMobile por último: o app shell só monta sobre o DOM já
  // renderizado pelo detalhe do evento e pelo regulamento.
  initMobile();
});
