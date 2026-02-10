// script.js
// Versión base (Prompt 1): navegación responsiva + utilidades pequeñas.
// En próximos prompts se añadirá calculadora, temas por era y parallax.

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);

  // ----------------------------
  // Mobile nav
  // ----------------------------
  function initMobileNav() {
    const toggle = $(".nav__toggle");
    const menu = $("#navMenu");
    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    // Cerrar al clicar un enlace
    menu.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });

    // Cerrar al clicar fuera
    document.addEventListener("click", (e) => {
      const isInside = e.target.closest(".nav");
      if (!isInside) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Init
  document.addEventListener("DOMContentLoaded", () => {
    initMobileNav();
  });
})();