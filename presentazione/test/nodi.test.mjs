import assert from "node:assert/strict"
import test from "node:test"
import { KNOTS, getKnot } from "../src/js/nodi-data.js"
import {
  buildQuiz,
  gradeQuiz,
  loadState,
  markLearned,
  markPracticed,
  recordQuiz,
  knotStars,
} from "../src/js/nodi-logic.js"

test("catalogo nodi: id unici, passi e bersagli allineati", () => {
  const ids = KNOTS.map((k) => k.id)
  assert.equal(new Set(ids).size, ids.length)
  assert.ok(KNOTS.length >= 6)
  for (const knot of KNOTS) {
    assert.ok(knot.name)
    assert.ok(knot.english)
    assert.ok(knot.steps.length >= 4)
    knot.steps.forEach((step, i) => {
      assert.ok(step.d, `${knot.id} step ${i} senza path`)
      assert.ok(step.hit && typeof step.hit.x === "number")
      assert.ok(step.title && step.text)
    })
  }
  assert.equal(getKnot("gassa-amante").name, "Gassa d'amante")
  assert.equal(getKnot("nodo-inesistente"), null)
})

test("quiz: ogni domanda ha la risposta tra le opzioni", () => {
  let i = 0
  const random = () => {
    i += 1
    return (i % 10) / 10
  }
  const quiz = buildQuiz(KNOTS, random, 8)
  assert.equal(quiz.length, 8)
  for (const q of quiz) {
    assert.equal(q.options.length, 4)
    assert.ok(q.options.includes(q.answer))
    assert.equal(new Set(q.options).size, 4)
  }
})

test("voto quiz e progressi in storage finto", () => {
  const questions = [
    { prompt: "A", answer: "Gassa d'amante", knotId: "gassa-amante" },
    { prompt: "B", answer: "Nodo parlato", knotId: "nodo-parlato" },
  ]
  const graded = gradeQuiz(questions, ["Gassa d'amante", "Nodo piano"])
  assert.equal(graded.ok, 1)
  assert.equal(graded.total, 2)

  const mem = new Map()
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, String(v)),
  }
  let state = loadState(storage)
  state = markLearned(state, "gassa-amante")
  state = markPracticed(state, "gassa-amante")
  state = recordQuiz(state, 7, 8)
  assert.equal(knotStars(state.knots["gassa-amante"]), 2)
  assert.equal(state.quizBest, 7)
})
