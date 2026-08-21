import assert from "node:assert/strict"
import test from "node:test"
import { KNOTS, getKnot, stepHit3, stepPaths } from "../src/js/nodi-data.js"
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

test("ogni passo ha geometria 3D valida", () => {
  for (const knot of KNOTS) {
    for (const [i, step] of knot.steps.entries()) {
      const paths = stepPaths(step)
      assert.ok(paths.length >= 1, `${knot.id}#${i} senza path 3D`)
      for (const path of paths) {
        assert.ok(path.pts.length >= 2, `${knot.id}#${i} pts corti`)
        for (const pt of path.pts) {
          assert.equal(pt.length, 3)
          assert.ok(pt.every(Number.isFinite), `${knot.id}#${i} pt non finito`)
        }
      }
      const hit = stepHit3(step)
      assert.equal(hit.length, 3)
      assert.ok(hit.every(Number.isFinite))
    }
  }
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

test("gate e cross: formati validi su tutti i passi", () => {
  for (const knot of KNOTS) {
    for (const step of knot.steps) {
      if (step.gate) {
        assert.equal(step.gate.pos.length, 3)
        assert.ok(step.gate.pos.every(Number.isFinite), `${knot.id} gate.pos`)
        assert.ok(step.gate.r > 0.5 && step.gate.r < 4, `${knot.id} gate.r`)
        assert.ok(step.hit, `${knot.id} gate senza hit 2D`)
      }
      if (step.cross) {
        assert.ok(step.cross.at >= 0.05 && step.cross.at <= 0.95, `${knot.id} cross.at`)
        assert.ok(
          typeof step.cross.label === "string" && step.cross.label.length >= 3 && step.cross.label.length <= 28,
          `${knot.id} cross.label`,
        )
        assert.equal(step.cross.pos.length, 3)
        assert.ok(step.cross.pos.every(Number.isFinite), `${knot.id} cross.pos`)
      }
    }
  }
})

test("copertura didattica: ogni nodo almeno un incrocio; varco dove esiste un occhiello", () => {
  const noGate = new Set(["nodo-piano"])
  for (const knot of KNOTS) {
    assert.ok(knot.steps.some((s) => s.cross), `${knot.id} senza cross`)
    if (!noGate.has(knot.id)) {
      assert.ok(knot.steps.some((s) => s.gate), `${knot.id} senza gate`)
    }
  }
})
