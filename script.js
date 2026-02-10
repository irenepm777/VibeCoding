/**
 * VibeCoding — ¿Cuánto durarías en el Mesozoico?
 * Vanilla JS. Sin librerías.
 * - Selector inmersivo por época (tema)
 * - Validación estricta (valores realistas)
 * - Calculadora divulgativa con explicación por periodo
 * - Gráfico simple en canvas
 */

(() => {
  "use strict";

  // ----------------------------
  // Config
  // ----------------------------
  const RANGES = {
    age: { min: 5, max: 110 },
    height: { min: 80, max: 230 }, // cm
    weight: { min: 20, max: 250 }, // kg
  };

  const ERAS = [
    { id: "intro", label: "Inicio" },
    { id: "triasico", label: "Triásico" },
    { id: "jurasico", label: "Jurásico" },
    { id: "cretacico", label: "Cretácico" },
    { id: "calculadora", label: "Calculadora" },
  ];

  const DINO_BY_ERA = {
    intro: null,
    default: null,
    triasico: "assets/coelophysis.png",
    jurasico: "assets/brachiosaurus.png",
    cretacico: "assets/tyrannosaurus-rex.webp",
    calculadora: null,
  };

  /**
   * Factores “educativos” (no médicos).
   * Valores más altos = entorno más favorable para la supervivencia humana.
   */
  const ERA_MODEL = {
    triasico: {
      baseHours: 14,
      environment: 0.55, // sequedad / calor penaliza
      predation: 0.72,
      disease: 0.65,
      resources: 0.45,
      headline: "La limitación dominante es el estrés ambiental: calor, deshidratación y exposición.",
      bullets: [
        "Clima más árido en el interior de Pangea: hidratarse y refugiarse es prioritario.",
        "Recursos más impredecibles: conseguir agua segura decide el resultado.",
        "Heridas pequeñas se complican rápido sin medicina moderna.",
      ],
    },
    jurasico: {
      baseHours: 22,
      environment: 0.78, // más humedad / templado
      predation: 0.48,   // depredación fuerte
      disease: 0.62,
      resources: 0.70,
      headline: "Más recursos, pero mayor presión de depredación: la cadena trófica es intensa.",
      bullets: [
        "Ecosistemas exuberantes: hay biomasa, pero también competidores y depredadores.",
        "La supervivencia depende de refugio y discreción más que de “fuerza”.",
        "Infecciones y parásitos serían un problema serio sin antibióticos.",
      ],
    },
    cretacico: {
      baseHours: 18,
      environment: 0.70,
      predation: 0.55,
      disease: 0.58,
      resources: 0.62,
      headline: "Ecosistemas complejos: más vectores biológicos, más competencia y más azar.",
      bullets: [
        "Paisajes cambiantes (mares interiores, costas): más oportunidades y más riesgos.",
        "Mayor complejidad ecológica: más vectores y exposición a patógenos.",
        "La energía (comida/agua) y el descanso realista marcan diferencias enormes.",
      ],
    },
  };

  // ----------------------------
  // DOM helpers
  // ----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function fmtDuration(hours) {
    if (hours < 1) return `${Math.round(hours * 60)} min`;
    if (hours < 24) return `${Math.round(hours)} h`;
    const days = hours / 24;
    if (days < 14) return `${days.toFixed(days < 2 ? 1 : 0)} días`;
    const weeks = days / 7;
    if (weeks < 8) return `${weeks.toFixed(weeks < 2 ? 1 : 0)} semanas`;
    const months = days / 30;
    return `${months.toFixed(months < 2 ? 1 : 0)} meses`;
  }

  function bmi(heightCm, weightKg) {
    const h = heightCm / 100;
    return weightKg / (h * h);
  }

  function ageFactor(age) {
    // Pico aproximado en 28, cae suavemente hacia extremos
    // 0.0–1.0
    const peak = 28;
    const spread = 22; // cuanto mayor, más suave
    const x = (age - peak) / spread;
    const f = Math.exp(-0.5 * x * x);
    return clamp(f, 0.15, 1);
  }

  function mobilityFactor(heightCm, weightKg) {
    // penaliza extremos de BMI (simplificado) y alturas extremas por “demandas energéticas”
    const b = bmi(heightCm, weightKg);
    let bmiPenalty = 1;
    if (b < 18.5) bmiPenalty = 0.82;
    else if (b < 25) bmiPenalty = 1.0;
    else if (b < 30) bmiPenalty = 0.90;
    else if (b < 35) bmiPenalty = 0.80;
    else bmiPenalty = 0.70;

    // altura: ligera penalización por consumo energético/visibilidad (muy simplificado)
    let heightPenalty = 1.0;
    if (heightCm < 145) heightPenalty = 0.92;
    if (heightCm > 195) heightPenalty = 0.93;

    return clamp(bmiPenalty * heightPenalty, 0.55, 1);
  }

  function profileText(age, heightCm, weightKg) {
    const b = bmi(heightCm, weightKg);
    let bmiLabel = "IMC en rango medio";
    if (b < 18.5) bmiLabel = "IMC bajo (reserva energética menor)";
    else if (b < 25) bmiLabel = "IMC medio (movilidad eficiente)";
    else if (b < 30) bmiLabel = "IMC alto (movilidad penalizada)";
    else bmiLabel = "IMC muy alto (movilidad y calor penalizados)";

    let ageLabel = "adulto joven (buena recuperación)";
    if (age < 14) ageLabel = "infancia/adolescencia (vulnerabilidad alta)";
    else if (age < 20) ageLabel = "adolescencia (buena energía, menos experiencia)";
    else if (age < 40) ageLabel = "adulto joven (mejor equilibrio físico)";
    else if (age < 60) ageLabel = "adulto medio (recuperación más lenta)";
    else ageLabel = "edad avanzada (recuperación y resistencia penalizadas)";

    return { bmi: b, bmiLabel, ageLabel };
  }

  function survivalHoursForEra(eraId, age, heightCm, weightKg) {
    const model = ERA_MODEL[eraId];

    const aF = ageFactor(age); // 0.15..1
    const mF = mobilityFactor(heightCm, weightKg); // 0.55..1

    // Mezcla de factores: entorno + recursos + depredación + enfermedad
    // Entorno/resources favorecen, predation/disease penalizan. Todo divulgativo.
    const env = model.environment;
    const res = model.resources;
    const pred = model.predation;
    const dis = model.disease;

    const human = 0.55 * aF + 0.45 * mF; // 0.15..1
    const world = 0.45 * env + 0.35 * res + 0.20 * (1 - pred); // predación alta reduce
    const bio = 0.65 * (1 - dis) + 0.35 * (1 - pred); // presión biológica (simplificado)

    // Resultado base
    let hours =
      model.baseHours *
      (0.9 + 0.6 * human) *
      (0.8 + 0.8 * world) *
      (0.85 + 0.7 * bio);

    // Ajuste final: evita extremos absurdos
    hours = clamp(hours, 0.25, 24 * 180); // 15 min .. 6 meses
    return { hours, human, world, bio, aF, mF };
  }

  function explainEra(eraId, age, heightCm, weightKg, calc) {
    const model = ERA_MODEL[eraId];
    const prof = profileText(age, heightCm, weightKg);

    // Construye explicación conectando datos con el periodo
    const humanNotes = [];
    if (calc.aF < 0.45) humanNotes.push(`Tu edad (${age}) reduce la recuperación física y aumenta el riesgo ante exposición y heridas.`);
    else if (calc.aF < 0.75) humanNotes.push(`Tu edad (${age}) ofrece un equilibrio razonable, aunque la recuperación no es “instantánea”.`);
    else humanNotes.push(`Tu edad (${age}) favorece resistencia y recuperación en comparación con extremos de edad.`);

    if (calc.mF < 0.70) humanNotes.push(`${prof.bmiLabel}: en un entorno hostil, la movilidad y el calor juegan en contra.`);
    else if (calc.mF < 0.90) humanNotes.push(`${prof.bmiLabel}: movilidad aceptable, pero el gasto energético importa.`);
    else humanNotes.push(`${prof.bmiLabel}: buena movilidad para buscar refugio y recursos.`);

    // Ajustes por era
    const eraNotes = [];
    if (eraId === "triasico") {
      eraNotes.push("Triásico: la deshidratación y la exposición térmica suelen imponerse antes que un encuentro con fauna.");
      if (weightKg > 95) eraNotes.push("Más masa corporal puede penalizar disipación de calor en ambientes cálidos y secos.");
    }
    if (eraId === "jurasico") {
      eraNotes.push("Jurásico: el problema no es “escasez”, sino evitar interacciones letales con fauna y mantener refugio.");
      if (heightCm > 190) eraNotes.push("Mayor altura puede aumentar visibilidad; la discreción es un recurso en ecosistemas densos.");
    }
    if (eraId === "cretacico") {
      eraNotes.push("Cretácico: la complejidad ecológica aumenta exposición a vectores biológicos y riesgos ambientales regionales.");
      if (age > 55) eraNotes.push("La recuperación más lenta amplifica el impacto de infecciones o heridas pequeñas.");
    }

    const why = `${model.headline} Tu perfil (${prof.ageLabel}; ${prof.bmiLabel}) modula cuánto “margen” tienes antes de que el entorno te alcance.`;

    const bullets = [
      ...model.bullets,
      ...humanNotes.slice(0, 2),
      ...eraNotes.slice(0, 2),
    ].slice(0, 6);

    return { why, bullets };
  }

  // ----------------------------
  // Theme switching (inmersivo)
  // ----------------------------
  function setActiveEra(eraId, { scrollIntoView = false } = {}) {
    document.body.dataset.era = eraId;

    // Update tab buttons
    $$(".era-card").forEach((btn) => {
      const active = btn.dataset.era === eraId;
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    // Update nav highlighting (aria-current)
    $$(".nav__link[data-era-link]").forEach((a) => {
      a.removeAttribute("aria-current");
      if (a.dataset.eraLink === eraId) a.setAttribute("aria-current", "page");
    });

    // Label
    const label = ERAS.find((e) => e.id === eraId)?.label ?? "Triásico";
    const activeLabel = $("#activeEraLabel");
    if (activeLabel) activeLabel.textContent = label;
    if (scrollIntoView) {
      const section = getEraSection(eraId);
      if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // ----------------------------
  // Era section lookup (robust)
  // ----------------------------
  function getEraSection(eraId) {
    return (
      document.querySelector(`[data-era-section="${eraId}"]`) ||
      document.getElementById(eraId)
    );
  }

  // ----------------------------
  // Validation
  // ----------------------------
  function validateNumber(id, value) {
    const v = Number(value);
    if (Number.isNaN(v)) return { ok: false, msg: "Introduce un número." };

    const range = RANGES[id];
    if (!range) return { ok: true, msg: "" };

    if (v < range.min || v > range.max) {
      return { ok: false, msg: `Valor fuera de rango (${range.min}–${range.max}).` };
    }
    return { ok: true, msg: "" };
  }

  function setError(id, msg) {
    const el = $(`#${id}Error`);
    if (el) el.textContent = msg || "";
    const input = $(`#${id}`);
    if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
  }

  // ----------------------------
  // Rendering results + chart
  // ----------------------------
  function renderResult(eraId, timeText, whyText, bullets) {
    const map = {
      triasico: { time: "#resTriTime", why: "#resTriWhy", ul: "#resTriBullets" },
      jurasico: { time: "#resJurTime", why: "#resJurWhy", ul: "#resJurBullets" },
      cretacico: { time: "#resCreTime", why: "#resCreWhy", ul: "#resCreBullets" },
    };
    const t = $(map[eraId].time);
    const w = $(map[eraId].why);
    const ul = $(map[eraId].ul);

    if (t) t.textContent = timeText;
    if (w) w.textContent = whyText;

    if (ul) {
      ul.innerHTML = "";
      bullets.forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b;
        ul.appendChild(li);
      });
    }
  }

  function renderExplanation(eraId, whyText, bullets) {
    const map = {
      triasico: { why: "#expTriWhy", ul: "#expTriBullets" },
      jurasico: { why: "#expJurWhy", ul: "#expJurBullets" },
      cretacico: { why: "#expCreWhy", ul: "#expCreBullets" },
    };

    const w = document.querySelector(map[eraId].why);
    const ul = document.querySelector(map[eraId].ul);

    if (w) w.textContent = whyText;

    if (ul) {
      ul.innerHTML = "";
      bullets.forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b;
        ul.appendChild(li);
      });
    }
  }

  function drawChart(valuesByEra) {
    const canvas = $("#chart");
    if (!canvas) return;

    // Handle DPR
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 640;
    const cssH = 240;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.clearRect(0, 0, cssW, cssH);

    // Data
    const labels = ["Triásico", "Jurásico", "Cretácico"];
    const keys = ["triasico", "jurasico", "cretacico"];
    const vals = keys.map((k) => valuesByEra[k]);

    const max = Math.max(...vals, 1);
    const pad = 18;
    const barW = (cssW - pad * 2) / 3 - 14;
    const gap = 14;

    // Colors from CSS variables
    const styles = getComputedStyle(document.body);
    const accent = styles.getPropertyValue("--accent").trim() || "#c7a246";
    const accent2 = styles.getPropertyValue("--accent-2").trim() || "#6aa36f";
    const border = styles.getPropertyValue("--border").trim() || "rgba(255,255,255,0.14)";
    const muted = styles.getPropertyValue("--muted").trim() || "rgba(255,255,255,0.65)";
    const text = styles.getPropertyValue("--text").trim() || "rgba(255,255,255,0.92)";

    // Axis baseline
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, cssH - 44);
    ctx.lineTo(cssW - pad, cssH - 44);
    ctx.stroke();

    // Bars
    vals.forEach((v, i) => {
      const h = (cssH - 80) * (v / max);
      const x = pad + i * (barW + gap) + 7;
      const y = cssH - 44 - h;

      // gradient
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, accent);
      g.addColorStop(1, accent2);

      // bar
      ctx.fillStyle = g;
      ctx.fillRect(x, y, barW, h);

      // label
      ctx.fillStyle = muted;
      ctx.font = "600 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial";
      ctx.textAlign = "center";
      ctx.fillText(labels[i], x + barW / 2, cssH - 22);

      // value
      ctx.fillStyle = text;
      ctx.font = "800 12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Arial";
      ctx.fillText(fmtDuration(v), x + barW / 2, y - 8);
    });
  }

  // ----------------------------
  // Placeholders for empty <img src="">
  // ----------------------------
  function initImagePlaceholders() {
    $$('img[data-placeholder="true"]').forEach((img) => {
      // If src is empty, keep it empty (placeholder bg via CSS). If src is provided, remove data-placeholder.
      if (img.getAttribute("src") && img.getAttribute("src").trim().length > 0) {
        img.removeAttribute("data-placeholder");
      } else {
        // Avoid broken image icon: keep src unset
        img.removeAttribute("src");
      }
    });
  }

  // ----------------------------
  // Events
  // ----------------------------
  function initNav() {
    const toggle = $(".nav__toggle");
    const menu = $("#navMenu");

    if (!toggle || !menu) return;

    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Close menu on link click (mobile)
    $$(".nav__link", menu).forEach((a) => {
      a.addEventListener("click", () => {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function initEraSelector() {
    // Era cards: solo scroll, NO cambian el tema directamente
    $$(".era-card").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const era = btn.dataset.era;
        if (!era) return;

        const section = getEraSection(era);
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });

    // Nav links: solo scroll
    $$(".nav__link[data-era-link]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const era = a.dataset.eraLink;
        if (!era) return;

        const section = getEraSection(era);
        if (section) {
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    });
  }

  // ----------------------------
  // Era auto-detection on scroll
  // ----------------------------
  function initEraAutoScroll() {
    const sections = ERAS.map(e => ({
      id: e.id,
      el: document.getElementById(e.id)
    })).filter(s => s.el);

    function detectEra() {
      const viewportMiddle = window.innerHeight * 0.5;

      for (const { id, el } of sections) {
        const rect = el.getBoundingClientRect();
        if (rect.top <= viewportMiddle && rect.bottom >= viewportMiddle) {
          if (document.body.dataset.era !== id) {
            setActiveEra(id);
          }
          break;
        }
      }
    }

    window.addEventListener("scroll", detectEra, { passive: true });
    detectEra();
  }

  function initCalculator() {
    const form = $("#calcForm");
    const resetBtn = $("#resetBtn");
    const live = $("#resultsLive");
    if (!form) return;

    function validateAll(values) {
      const vAge = validateNumber("age", values.age);
      const vHeight = validateNumber("height", values.height);
      const vWeight = validateNumber("weight", values.weight);
      setError("age", vAge.ok ? "" : vAge.msg);
      setError("height", vHeight.ok ? "" : vHeight.msg);
      setError("weight", vWeight.ok ? "" : vWeight.msg);

      return vAge.ok && vHeight.ok && vWeight.ok;
    }

    function readValues() {
      const age = Number($("#age").value);
      const height = Number($("#height").value);
      const weight = Number($("#weight").value);
      return { age, height, weight };
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const values = readValues();
      if (!validateAll(values)) {
        if (live) live.textContent = "Hay errores en el formulario. Revisa los rangos permitidos.";
        return;
      }

      const { age, height, weight } = values;

      const hoursByEra = {};

      // Solo eras con modelo científico
      ["triasico", "jurasico", "cretacico"].forEach((id) => {
        const calc = survivalHoursForEra(id, age, height, weight);
        const exp = explainEra(id, age, height, weight, calc);

        hoursByEra[id] = calc.hours;
        renderResult(id, fmtDuration(calc.hours));
        renderExplanation(id, exp.why, exp.bullets);
      });

      drawChart(hoursByEra);

      if (live) live.textContent = "Resultados actualizados. Revisa Triásico, Jurásico y Cretácico.";
    });

    // Live validation as user types
    ["age", "height", "weight"].forEach((id) => {
      const input = $(`#${id}`);
      if (!input) return;
      input.addEventListener("input", () => {
        const res = validateNumber(id, input.value);
        setError(id, res.ok ? "" : res.msg);
      });
      input.addEventListener("blur", () => {
        const res = validateNumber(id, input.value);
        setError(id, res.ok ? "" : res.msg);
      });
    });

    resetBtn?.addEventListener("click", () => {
      form.reset();
      setError("age", "");
      setError("height", "");
      setError("weight", "");
      renderResult("triasico", "—", "Introduce tus datos y calcula.", []);
      renderResult("jurasico", "—", "Introduce tus datos y calcula.", []);
      renderResult("cretacico", "—", "Introduce tus datos y calcula.", []);
      ["Tri", "Jur", "Cre"].forEach((k) => {
        const w = document.querySelector(`#exp${k}Why`);
        const ul = document.querySelector(`#exp${k}Bullets`);
        if (w) w.textContent = "";
        if (ul) ul.innerHTML = "";
      });
      drawChart({ triasico: 0, jurasico: 0, cretacico: 0 });
      if (live) live.textContent = "Formulario restablecido.";
    });

    // Initial empty chart
    drawChart({ triasico: 0, jurasico: 0, cretacico: 0 });
  }

  // ----------------------------
  // Dino parallax (background layer)
  // ----------------------------
  function initDinoParallax() {
    const dino = document.getElementById("dinoParallax");
    if (!dino) {
      console.log("❌ Dino (#dinoParallax) no encontrado");
      return;
    }

    console.log("✅ Dino parallax inicializado");

    // Evita quedarte “enganchada” a rutas antiguas
    dino.loading = "eager";

    function onScroll() {
      const eraId = document.body.dataset.era && DINO_BY_ERA[document.body.dataset.era] ? document.body.dataset.era : "default";
      // Ocultar dino en intro/calculadora (o donde no hay dino)
      if (!DINO_BY_ERA[eraId]) {
        dino.style.opacity = "0";
        return;
      }
      const section = getEraSection(eraId);

      // Si no encontramos la sección de la era activa, ocultamos el dino
      if (!section) {
        dino.style.opacity = "0";
        return;
      }

      const rect = section.getBoundingClientRect();

      // Solo visible mientras ESA sección está en pantalla
      const inView =
        rect.top < window.innerHeight * 0.85 &&
        rect.bottom > window.innerHeight * 0.15;

      if (!inView) {
        dino.style.opacity = "0";
        return;
      }

      // Cambia el dinosaurio según la era activa
      const wantedSrc = DINO_BY_ERA[eraId];
      const currentSrc = dino.getAttribute("src") || "";
      if (!currentSrc.includes(wantedSrc)) {
        dino.setAttribute("src", wantedSrc);
      }

      // Movimiento horizontal dentro del rango de scroll de la sección
      const progress =
        (window.innerHeight - rect.top) /
        (window.innerHeight + rect.height);

      const clamped = clamp(progress, 0, 1);
      const x = clamped * (window.innerWidth + 500);

      dino.style.opacity = "1";
      dino.style.transform = `translateX(${x}px) scaleX(-1)`;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ----------------------------
  // Init
  // ----------------------------
  function init() {
    initNav();
    initEraSelector();
    initEraAutoScroll();
    initDinoParallax();
    initCalculator();
    initImagePlaceholders();
    setActiveEra("default");
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("resize", () => {
    // redraw chart on resize if results exist
    const tri = $("#resTriTime")?.textContent ?? "—";
    if (tri !== "—") {
      // Parse current durations not trivial; instead recompute from inputs if valid
      const age = Number($("#age")?.value);
      const height = Number($("#height")?.value);
      const weight = Number($("#weight")?.value);
      const ok = [validateNumber("age", age).ok, validateNumber("height", height).ok, validateNumber("weight", weight).ok].every(Boolean);
      if (ok) {
        const hoursByEra = {};
        ERAS.forEach(({ id }) => {
          hoursByEra[id] = survivalHoursForEra(id, age, height, weight).hours;
        });
        drawChart(hoursByEra);
      }
    } else {
      drawChart({ triasico: 0, jurasico: 0, cretacico: 0 });
    }
  });
})();
