/**
 * Hero Carousel - navegação por dots, teclado e arraste.
 * Toque/trackpad já funcionam via overflow-x:auto nativo com scroll-snap;
 * o arraste com mouse é a única camada extra necessária.
 *
 * A trilha também acompanha a altura do slide ativo: os dois slides têm
 * alturas bem diferentes no celular (imagem 4:3 contra título + CTAs) e,
 * sendo um flex container, sem isto ela travaria na altura do maior e
 * deixaria um vão morto no outro.
 */

export function initHeroCarousel() {
  const track = document.querySelector("[data-hero-track]");
  if (!track) return;

  const slides = Array.from(track.querySelectorAll("[data-hero-slide]"));
  const dots = Array.from(document.querySelectorAll("[data-hero-dot]"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeIndex = 0;

  function setActiveDot(index) {
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i === index);
      if (i === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  // A trilha é medida pelo conteúdo do slide, não pelo container: em
  // height:auto ela já valeria o maior deles.
  function syncHeight() {
    const slide = slides[activeIndex];
    if (!slide) return;
    track.style.setProperty("--hero-track-h", `${slide.scrollHeight}px`);
  }

  function goToSlide(index) {
    activeIndex = index;
    track.scrollTo({
      left: index * track.clientWidth,
      behavior: reduceMotion ? "auto" : "smooth",
    });
    syncHeight();
  }

  if (slides.length && "IntersectionObserver" in window) {
    const slideObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio < 0.6) return;
          activeIndex = slides.indexOf(entry.target);
          setActiveDot(activeIndex);
          syncHeight();
        });
      },
      { root: track, threshold: 0.6 }
    );
    slides.forEach((slide) => slideObserver.observe(slide));
  }

  // Remede quando o conteúdo do slide muda de altura por conta própria:
  // webfont que chega, imagem que decodifica, texto que reflui no zoom.
  if ("ResizeObserver" in window) {
    const sizeObserver = new ResizeObserver(() => syncHeight());
    slides.forEach((slide) => sizeObserver.observe(slide));
  }

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => goToSlide(index));
  });

  track.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const current = Math.round(track.scrollLeft / track.clientWidth);
    const next =
      event.key === "ArrowRight"
        ? Math.min(current + 1, slides.length - 1)
        : Math.max(current - 1, 0);
    goToSlide(next);
  });

  // Girar o aparelho muda clientWidth e deixa o scrollLeft entre dois
  // slides; reancorar no slide ativo evita o carrossel "meio a meio".
  // Só a largura interessa: no celular a barra de endereço entrando e
  // saindo dispara resize a cada scroll, sem mover o eixo horizontal.
  let trackWidth = track.clientWidth;
  let resizeFrame = 0;
  window.addEventListener("resize", () => {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      if (track.clientWidth === trackWidth) return;
      trackWidth = track.clientWidth;
      track.scrollTo({ left: activeIndex * trackWidth, behavior: "auto" });
      syncHeight();
    });
  });

  enableMouseDrag(track, syncHeight);
  syncHeight();
}

function enableMouseDrag(track, syncHeight) {
  let dragging = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;

  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") return;
    // Links/botões dentro do slide (CTAs, dots) navegam com o clique nativo,
    // sem entrar no fluxo de captura de arraste.
    if (event.target.closest("a, button")) return;
    dragging = true;
    moved = false;
    startX = event.clientX;
    startScroll = track.scrollLeft;
    track.setPointerCapture(event.pointerId);
  });

  track.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    const delta = event.clientX - startX;
    if (Math.abs(delta) > 4) {
      moved = true;
      track.classList.add("is-dragging");
      track.style.scrollSnapType = "none";
    }
    track.scrollLeft = startScroll - delta;
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("is-dragging");
    track.style.scrollSnapType = "";
    // Só depois de soltar: durante o arraste a altura ficaria oscilando
    // entre os dois slides parcialmente visíveis.
    syncHeight();
  };

  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);

  track.addEventListener(
    "click",
    (event) => {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    true
  );
}
