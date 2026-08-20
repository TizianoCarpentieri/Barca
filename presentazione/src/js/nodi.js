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

const app = document.getElementById("nodi-app")
if (app) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  let state = loadState(localStorage)
  let quiz = null
  let quizPicks = []

  function persist() {
    saveState(localStorage, state)
  }

  function params() {
    const q = new URLSearchParams(location.search)
    return { id: q.get("id"), mode: q.get("mode") || "impara", quiz: q.get("quiz") === "1" }
  }

  function go(search) {
    history.replaceState(null, "", search ? `?${search}` : location.pathname)
    draw()
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
    let step = tryMode ? 0 : 0
    const wrap = document.createElement("div")

    const paint = (fresh = step - 1) => {
      const current = knot.steps[Math.min(step, stepMax - 1)]
      const done = tryMode && step >= stepMax
      wrap.innerHTML = `
        <div class="ads-cats" role="tablist" aria-label="Modo">
          <a class="ads-cat${tryMode ? "" : " is-on"}" href="?id=${knot.id}&mode=impara">Impara</a>
          <a class="ads-cat${tryMode ? " is-on" : ""}" href="?id=${knot.id}&mode=prova">Fai tu</a>
        </div>
        <p class="knot-legend"><span class="knot-swatch knot-swatch--stand"></span> Dormiente
          <span class="knot-swatch knot-swatch--work"></span> Corrente</p>
        <div class="knot-stage" id="knot-stage">${stageSvg(knot, Math.max(step, tryMode ? step : step + 1), {
          hits: tryMode && !done,
          current: step,
          fresh,
        })}</div>
        <div class="knot-coach">
          <span class="eyebrow">${done ? "Nodo chiuso" : `Passo ${Math.min(step + 1, stepMax)} / ${stepMax}`}</span>
          <h2>${done ? knot.name : current.title}</h2>
          <p>${done ? "Tira i capi e controlla. Poi il quiz sui nomi." : `${tryMode ? "Tocca il pallino acceso. " : ""}${current.text}`}</p>
        </div>
        ${knot.warn && (done || !tryMode) ? `<p class="knot-warn">${knot.warn}</p>` : ""}
        <div class="hero__cta-row">
          ${
            tryMode
              ? done
                ? `<a class="btn btn-primary" href="?quiz=1">Quiz</a><button type="button" class="btn btn-ghost" data-reset>Rifai</button>`
                : `<button type="button" class="btn btn-ghost" data-reset>Ricomincia</button>`
              : `<button type="button" class="btn btn-ghost" data-prev ${step <= 0 ? "disabled" : ""}>Indietro</button>
                 <button type="button" class="btn btn-primary" data-next>${step >= stepMax - 1 ? "Ho capito" : "Avanti"}</button>`
          }
        </div>`
      const svg = wrap.querySelector(".knot-svg")
      playFresh(svg)
      wrap.querySelector("[data-next]")?.addEventListener("click", () => {
        if (step >= stepMax - 1) {
          state = markLearned(state, knot.id)
          persist()
          go("")
          return
        }
        step += 1
        paint(step)
      })
      wrap.querySelector("[data-prev]")?.addEventListener("click", () => {
        step = Math.max(0, step - 1)
        paint(-1)
      })
      wrap.querySelector("[data-reset]")?.addEventListener("click", () => {
        step = 0
        paint(-1)
      })
      wrap.querySelectorAll("[data-hit]").forEach((el) => {
        el.addEventListener("click", () => {
          const i = Number(el.getAttribute("data-hit"))
          const stage = wrap.querySelector(".knot-stage")
          if (i === step) {
            step += 1
            if (step >= stepMax) {
              state = markPracticed(state, knot.id)
              persist()
            }
            paint(step - 1)
          } else if (i > step) {
            stage?.classList.remove("is-shake")
            void stage?.offsetWidth
            stage?.classList.add("is-shake")
          }
        })
      })
    }

    app.innerHTML = `
      <a class="ph__back" href="./nodi.html">← Catalogo</a>
      <span class="eyebrow">${knot.english}</span>
      <h2 class="display display-md" style="margin:.35rem 0 .4rem">${knot.name}</h2>
      <p class="lede">${knot.why}</p>
      <p class="knot-use">${knot.onBoat}</p>
      <div id="knot-trainer"></div>`
    app.querySelector("#knot-trainer").appendChild(wrap)
    paint(tryMode ? -1 : 0)
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
      ${q.type === "name" ? `<div class="knot-stage">${stageSvg(knot, knot.steps.length)}</div>` : ""}
      <div class="knot-options">
        ${q.options.map((opt) => `<button type="button" class="btn btn-ghost" data-opt="${opt}">${opt}</button>`).join("")}
      </div>`
    app.querySelectorAll("[data-opt]").forEach((btn) => {
      btn.addEventListener("click", () => {
        quizPicks = [...quizPicks, btn.getAttribute("data-opt")]
        draw()
      })
    })
  }

  function draw() {
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
