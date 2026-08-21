import { KNOTS, KNOT_TERMS, getKnot } from "./nodi-data.js"
import {
  buildQuiz,
  gradeQuiz,
  knotStars,
  loadState,
  markLearned,
  markPracticed,
  recordQuiz,
  saveState,
} from "./nodi-logic.js"

const VIEW_KEY = "barca_nodi_view"

const app = document.getElementById("nodi-app")
if (app) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  let state = loadState(localStorage)
  let quiz = null
  let quizPicks = []
  let active3d = null
  let knot3dMod = null

  function persist() {
    saveState(localStorage, state)
  }

  function params() {
    const q = new URLSearchParams(location.search)
    return { id: q.get("id"), mode: q.get("mode") || "impara", quiz: q.get("quiz") === "1", flat: q.get("flat") === "1" }
  }

  function go(search) {
    history.replaceState(null, "", search ? `?${search}` : location.pathname)
    draw()
  }

  function drop3d() {
    active3d?.dispose()
    active3d = null
  }

  function prefer3d() {
    if (params().flat) return false
    if (sessionStorage.getItem(VIEW_KEY) === "2d") return false
    return true
  }

  async function load3d() {
    if (knot3dMod) return knot3dMod
    knot3dMod = await import("./nodi-3d.js")
    return knot3dMod
  }

  function objectSvg(kind) {
    if (kind === "pole") {
      return `<rect class="knot-pole" x="118" y="28" width="24" height="264" rx="12"/>`
    }
    if (kind === "ring") {
      return `<circle class="knot-ring" cx="130" cy="70" r="28"/>`
    }
    if (kind === "bight") {
      return `<path class="knot-bight" d="M 48 300 L 48 96 C 48 44 172 44 172 96 C 172 138 84 140 84 96"/>`
    }
    return ""
  }

  function ropeSvg(knot, revealed, freshIndex = -1) {
    return knot.steps
      .map((step, i) => {
        if (i >= revealed) return ""
        const fresh = i === freshIndex ? " is-fresh" : ""
        return `<path class="knot-rope-shadow knot-rope--${step.kind}" d="${step.d}" /><path class="knot-rope knot-rope--${step.kind}${fresh}" d="${step.d}" />`
      })
      .join("")
  }

  function hitsSvg(knot, current, done) {
    return knot.steps
      .map((step, i) => {
        const cls = i < done ? "is-done" : i === current ? "is-now" : "is-wait"
        return `<circle class="knot-hit ${cls}" data-hit="${i}" cx="${step.hit.x}" cy="${step.hit.y}" r="22"/>`
      })
      .join("")
  }

  function stageSvg(knot, revealed, { hits = false, current = 0, fresh = -1 } = {}) {
    return `<svg class="knot-svg" viewBox="0 0 260 320" role="img" aria-label="${knot.name}">
      ${objectSvg(knot.object)}
      ${ropeSvg(knot, revealed, fresh)}
      ${hits ? hitsSvg(knot, current, revealed) : ""}
    </svg>`
  }

  function playFresh(svg) {
    if (reduced || !svg) return
    svg.querySelectorAll(".knot-rope.is-fresh").forEach((p) => {
      let len = 0
      try {
        len = p.getTotalLength()
      } catch {
        len = 0
      }
      if (!len) return
      p.style.strokeDasharray = `${len}`
      p.style.strokeDashoffset = `${len}`
      requestAnimationFrame(() => {
        p.style.transition = "stroke-dashoffset .8s cubic-bezier(0.16, 1, 0.3, 1)"
        p.style.strokeDashoffset = "0"
      })
    })
  }

  function stars(id) {
    return knotStars(state.knots[id])
  }

  function catalog() {
    const cards = KNOTS.map((knot) => {
      const n = stars(knot.id)
      return `<a class="knot-card" href="?id=${knot.id}&mode=impara">
        <div class="knot-card__stage">${stageSvg(knot, knot.steps.length)}</div>
        <div>
          <strong>${knot.name}</strong>
          <span>${knot.english} · ${"★".repeat(n)}${"☆".repeat(2 - n)}</span>
        </div>
      </a>`
    }).join("")
    const terms = KNOT_TERMS.map((t) => `<li><strong>${t.term}</strong> ${t.def}</li>`).join("")
    app.innerHTML = `
      <div class="hero__cta-row" style="margin-top:0">
        <a class="btn btn-primary" href="?quiz=1">Quiz sui nomi</a>
      </div>
      <div class="knot-grid">${cards}</div>
      <section class="sec" style="padding-left:0;padding-right:0">
        <div class="sec-label"><span class="eyebrow">Vocabolario</span></div>
        <ul class="knot-terms">${terms}</ul>
      </section>`
  }

  function trainer(knot, mode) {
    const tryMode = mode === "prova"
    const stepMax = knot.steps.length
    let step = 0
    let use3d = prefer3d()
    let boot3d = null
    const wrap = document.createElement("div")

    app.innerHTML = `
      <a class="ph__back" href="./nodi.html">← Catalogo</a>
      <span class="eyebrow">${knot.english}</span>
      <h2 class="display display-md" style="margin:.35rem 0 .4rem">${knot.name}</h2>
      <p class="lede">${knot.why}</p>
      <p class="knot-use">${knot.onBoat}</p>
      <div id="knot-trainer"></div>`
    app.querySelector("#knot-trainer").appendChild(wrap)

    wrap.innerHTML = `
      <div class="ads-cats" role="tablist" aria-label="Modo">
        <a class="ads-cat${tryMode ? "" : " is-on"}" href="?id=${knot.id}&mode=impara">Impara</a>
        <a class="ads-cat${tryMode ? " is-on" : ""}" href="?id=${knot.id}&mode=prova">Fai tu</a>
      </div>
      <p class="knot-legend"><span class="knot-swatch knot-swatch--stand"></span> Dormiente
        <span class="knot-swatch knot-swatch--work"></span> Corrente — il capo che muovi</p>
      <div class="knot-stage" id="knot-stage">
        <button type="button" class="knot-view-toggle" data-toggle-view>2D</button>
        <span class="knot-3d-hint" data-hint hidden>Segui il capo arancio</span>
        <div class="knot-stage__draw" id="knot-draw"></div>
      </div>
      <div class="knot-coach" id="knot-coach"></div>
      <p class="knot-warn" data-warn hidden></p>
      <div class="hero__cta-row" id="knot-cta"></div>`

    const stage = wrap.querySelector("#knot-stage")
    const drawEl = wrap.querySelector("#knot-draw")
    const coach = wrap.querySelector("#knot-coach")
    const cta = wrap.querySelector("#knot-cta")
    const warnEl = wrap.querySelector("[data-warn]")
    const toggle = wrap.querySelector("[data-toggle-view]")
    const hint = wrap.querySelector("[data-hint]")

    function revealedCount() {
      return Math.max(step, tryMode ? step : step + 1)
    }

    function stageOpts(fresh) {
      const done = tryMode && step >= stepMax
      return {
        hits: tryMode && !done,
        current: step,
        fresh,
        revealed: revealedCount(),
        animate: true,
      }
    }

    function paint2d(fresh) {
      drop3d()
      stage.classList.remove("knot-stage--3d")
      hint.hidden = true
      toggle.textContent = "3D"
      const opts = stageOpts(fresh)
      drawEl.innerHTML = stageSvg(knot, opts.revealed, opts)
      playFresh(drawEl.querySelector(".knot-svg"))
      drawEl.querySelectorAll("[data-hit]").forEach((el) => {
        el.addEventListener("click", () => onHit(Number(el.getAttribute("data-hit"))))
      })
    }

    function onHit(i) {
      const done = tryMode && step >= stepMax
      if (!tryMode || done) return
      if (i === step) {
        step += 1
        if (step >= stepMax) {
          state = markPracticed(state, knot.id)
          persist()
        }
        paint(step - 1)
      } else if (i > step) {
        stage.classList.remove("is-shake")
        void stage.offsetWidth
        stage.classList.add("is-shake")
      }
    }

    async function paint3d(fresh) {
      stage.classList.add("knot-stage--3d")
      toggle.textContent = "2D"
      hint.hidden = false
      try {
        if (!active3d) {
          boot3d =
            boot3d ||
            (async () => {
              const mod = await load3d()
              if (!mod.supportsKnot3D()) throw new Error("no-webgl")
              drawEl.innerHTML = ""
              active3d = mod.createKnotView({
                container: drawEl,
                knot,
                reduced,
                onHit,
                onOrbit: () => hint.classList.add("is-gone"),
                onError: () => {
                  use3d = false
                  sessionStorage.setItem(VIEW_KEY, "2d")
                  paint2d(-1)
                },
              })
            })()
          await boot3d
        }
        const opts = stageOpts(fresh)
        active3d.setStage({
          revealed: opts.revealed,
          current: opts.current,
          fresh,
          hits: opts.hits,
          animate: fresh >= 0,
        })
      } catch {
        boot3d = null
        use3d = false
        paint2d(fresh)
      }
    }

    function paintChrome() {
      const current = knot.steps[Math.min(step, stepMax - 1)]
      const done = tryMode && step >= stepMax
      coach.innerHTML = `
        <span class="eyebrow">${done ? "Nodo chiuso" : `Passo ${Math.min(step + 1, stepMax)} / ${stepMax}`}</span>
        <h2>${done ? knot.name : current.title}</h2>
        <p>${done ? "Tira i capi e controlla. Poi il quiz sui nomi." : `${tryMode ? "Tocca il pallino acceso. " : "Guarda dove va il capo arancio. "}${current.text}`}</p>`
      if (knot.warn && (done || !tryMode)) {
        warnEl.hidden = false
        warnEl.textContent = knot.warn
      } else {
        warnEl.hidden = true
        warnEl.textContent = ""
      }
      if (tryMode) {
        cta.innerHTML = done
          ? `<a class="btn btn-primary" href="?quiz=1">Quiz</a><button type="button" class="btn btn-ghost" data-reset>Rifai</button>`
          : `<button type="button" class="btn btn-ghost" data-reset>Ricomincia</button>`
      } else {
        cta.innerHTML = `<button type="button" class="btn btn-ghost" data-prev ${step <= 0 ? "disabled" : ""}>Indietro</button>
           <button type="button" class="btn btn-ghost" data-replay>Rivedi</button>
           <button type="button" class="btn btn-primary" data-next>${step >= stepMax - 1 ? "Ho capito" : "Avanti"}</button>`
      }
      cta.querySelector("[data-next]")?.addEventListener("click", () => {
        if (step >= stepMax - 1) {
          state = markLearned(state, knot.id)
          persist()
          go("")
          return
        }
        step += 1
        paint(step)
      })
      cta.querySelector("[data-prev]")?.addEventListener("click", () => {
        step = Math.max(0, step - 1)
        paint(-1)
      })
      cta.querySelector("[data-reset]")?.addEventListener("click", () => {
        step = 0
        paint(-1)
      })
      cta.querySelector("[data-replay]")?.addEventListener("click", () => {
        if (use3d && active3d?.replay) active3d.replay()
        else paint(tryMode ? -1 : step)
      })
    }

    function paint(fresh = step - 1) {
      paintChrome()
      if (use3d) paint3d(fresh)
      else paint2d(fresh)
    }

    toggle.addEventListener("click", () => {
      use3d = !use3d
      sessionStorage.setItem(VIEW_KEY, use3d ? "3d" : "2d")
      drop3d()
      boot3d = null
      hint.classList.remove("is-gone")
      paint(-1)
    })

    paint(tryMode ? -1 : 0)
  }

  async function mountQuizKnot(el, knot) {
    if (!prefer3d()) {
      el.innerHTML = stageSvg(knot, knot.steps.length)
      return
    }
    el.classList.add("knot-stage--3d")
    try {
      const mod = await load3d()
      if (!mod.supportsKnot3D()) throw new Error("no-webgl")
      drop3d()
      el.querySelector(".knot-stage__draw") || el
      const drawEl = document.createElement("div")
      drawEl.className = "knot-stage__draw"
      el.innerHTML = ""
      el.appendChild(drawEl)
      active3d = mod.createKnotView({
        container: drawEl,
        knot,
        reduced,
        onError: () => {
          drop3d()
          el.classList.remove("knot-stage--3d")
          el.innerHTML = stageSvg(knot, knot.steps.length)
        },
      })
      active3d.setStage({
        revealed: knot.steps.length,
        current: 0,
        fresh: -1,
        hits: false,
        animate: false,
      })
    } catch {
      el.classList.remove("knot-stage--3d")
      el.innerHTML = stageSvg(knot, knot.steps.length)
    }
  }

  function quizView() {
    if (!quiz) {
      quiz = buildQuiz(KNOTS)
      quizPicks = []
    }
    const i = quizPicks.length
    if (i >= quiz.length) {
      const result = gradeQuiz(quiz, quizPicks)
      state = recordQuiz(state, result.ok, result.total)
      persist()
      app.innerHTML = `
        <div class="stat-wall" style="margin-bottom:1rem">
          <div class="stat"><div class="stat__val">${result.ok}<em>/${result.total}</em></div><div class="stat__lbl">Risposte giuste</div></div>
          <div class="stat"><div class="stat__val">${state.quizBest}</div><div class="stat__lbl">Record</div></div>
        </div>
        <ul class="knot-terms">${result.detail
          .map(
            (d) =>
              `<li>${d.ok ? "OK" : "No"} · ${d.prompt}<br><strong>${d.answer}</strong>${d.ok ? "" : ` — tu: ${d.pick}`}</li>`,
          )
          .join("")}</ul>
        <div class="hero__cta-row">
          <button type="button" class="btn btn-primary" id="quiz-again">Riprova</button>
          <a class="btn btn-ghost" href="./nodi.html">Catalogo</a>
        </div>`
      app.querySelector("#quiz-again")?.addEventListener("click", () => {
        quiz = null
        quizPicks = []
        go("quiz=1")
      })
      return
    }
    const q = quiz[i]
    const knot = getKnot(q.knotId)
    app.innerHTML = `
      <p class="eyebrow">Domanda ${i + 1} / ${quiz.length}</p>
      <h2 class="display display-md" style="margin:.4rem 0 .8rem">${q.prompt}</h2>
      ${q.type === "name" ? `<div class="knot-stage" id="quiz-stage"></div>` : ""}
      <div class="knot-options">
        ${q.options.map((opt) => `<button type="button" class="btn btn-ghost" data-opt="${opt}">${opt}</button>`).join("")}
      </div>`
    const stage = app.querySelector("#quiz-stage")
    if (stage && knot) mountQuizKnot(stage, knot)
    app.querySelectorAll("[data-opt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        quizPicks = [...quizPicks, btn.getAttribute("data-opt")]
        draw()
      })
    })
  }

  function draw() {
    drop3d()
    const { id, mode, quiz: quizOn } = params()
    if (quizOn) {
      quizView()
      return
    }
    quiz = null
    quizPicks = []
    const knot = id ? getKnot(id) : null
    if (knot) trainer(knot, mode)
    else catalog()
  }

  draw()
}
