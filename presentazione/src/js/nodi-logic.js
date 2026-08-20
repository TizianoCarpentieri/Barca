export const STORAGE_KEY = "barca_sim_nodi_v1"

export function emptyState() {
  return { knots: {}, quizBest: 0, quizLast: null }
}

export function loadState(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const data = JSON.parse(raw)
    return {
      ...emptyState(),
      ...data,
      knots: data.knots && typeof data.knots === "object" ? data.knots : {},
    }
  } catch {
    return emptyState()
  }
}

export function saveState(storage, state) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function patchKnot(state, id, fields) {
  const prev = state.knots[id] || { learned: false, practiced: false }
  return {
    ...state,
    knots: { ...state.knots, [id]: { ...prev, ...fields } },
  }
}

export function markLearned(state, id) {
  return patchKnot(state, id, { learned: true })
}

export function markPracticed(state, id) {
  return patchKnot(state, id, { practiced: true, learned: true })
}

export function recordQuiz(state, ok, total) {
  return {
    ...state,
    quizLast: { ok, total, at: Date.now() },
    quizBest: Math.max(state.quizBest || 0, ok),
  }
}

export function knotStars(entry) {
  if (!entry) return 0
  return (entry.learned ? 1 : 0) + (entry.practiced ? 1 : 0)
}

function shuffle(list, random) {
  const copy = [...list]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function optionsFor(names, answer, random, size = 4) {
  const others = names.filter((n) => n !== answer)
  const picked = shuffle(others, random).slice(0, Math.max(0, size - 1))
  return shuffle([answer, ...picked], random)
}

export function buildQuiz(knots, random = Math.random, count = 8) {
  const names = knots.map((k) => k.name)
  const pool = []
  for (const knot of knots) {
    pool.push({
      type: "name",
      knotId: knot.id,
      prompt: "Come si chiama questo nodo?",
      answer: knot.name,
    })
    pool.push({
      type: "use",
      knotId: knot.id,
      prompt: knot.quizUse,
      answer: knot.name,
    })
  }
  const chosen = shuffle(pool, random).slice(0, Math.min(count, pool.length))
  return chosen.map((q) => ({ ...q, options: optionsFor(names, q.answer, random) }))
}

export function gradeQuiz(questions, picks) {
  let ok = 0
  const detail = questions.map((q, i) => {
    const pick = picks[i]
    const good = pick === q.answer
    if (good) ok += 1
    return { prompt: q.prompt, answer: q.answer, pick, ok: good, knotId: q.knotId }
  })
  return { ok, total: questions.length, detail }
}
