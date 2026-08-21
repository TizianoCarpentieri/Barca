# Nodi — «Telecamera del gesto» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere il trainer nodi didatticamente chiaro (dove passa il capo: varco evidenziato, sopra/sotto etichettati, rallento all'incrocio) e mobile-first (controlli sovrapposti allo stage, zero scroll).

**Architecture:** Annotazioni didattiche opzionali (`gate`, `cross`) nei dati di ogni passo; il motore 3D le usa se presenti (anello pulsante + camera che si avvicina al varco + slow-mo ed etichetta sprite all'incrocio); la UI riorganizza stage/controlli in un'unica viewport con barra overlay.

**Tech Stack:** vanilla JS + three.js (lazy) + SVG 2D fallback + CSS; test `node --test`; build `vite build`.

## Global Constraints

- Cartella di lavoro: `presentazione/`. Comandi: `npm test` e `npx vite build --base=/Barca/` da `presentazione/`; `node scripts/lint-wiki.mjs` da root.
- Nessuna nuova dipendenza. Nessun commento nel codice (convenzione repo).
- `gate`/`cross` opzionali: motore e 2D devono funzionare anche senza (nessun crash).
- `prefers-reduced-motion`: niente pulsazioni né riposizionamenti camera extra.
- Deploy: push su `main` con modifiche in `presentazione/**` (workflow Pages esegue test+build+publish).

---

### Task 1: Annotazioni didattiche nei dati + test di validazione

**Files:**
- Modify: `presentazione/src/js/nodi-data.js`
- Test: `presentazione/test/nodi.test.mjs`

**Interfaces:**
- Produces: `step.gate = { pos: [x,y,z], r: number }`, `step.cross = { at: number (0..1), label: string, pos: [x,y,z] }` — opzionali su ogni step di ogni knot in `KNOTS`. Il 2D usa `step.hit` (già esistente) come posizione del cerchio varco.

- [ ] **Step 1: Scrivere i test che falliscono**

In coda a `presentazione/test/nodi.test.mjs`:

```js
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
        assert.ok(typeof step.cross.label === "string" && step.cross.label.length >= 3 && step.cross.label.length <= 28, `${knot.id} cross.label`)
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
```

- [ ] **Step 2: Verificare che falliscano**

Run: `cd presentazione && node --test test/nodi.test.mjs`
Expected: FAIL («senza cross» / «senza gate»)

- [ ] **Step 3: Annotare i 6 nodi in `nodi-data.js`**

Aggiungere ai task indicati (posizioni derivate dai waypoint esistenti; `V()` per i nodi in coordinate schermo, coordinate dirette per parlato/giro morto):

```js
// nodo-otto, step "Prima volta":
cross: { at: 0.12, label: "SOPRA LA DORMIENTE", pos: V(130, 150, 0) },
// nodo-otto, step "Incrocia dietro":
cross: { at: 0.45, label: "DIETRO LA PRIMA VOLTA", pos: V(84, 130, -0.8) },
// nodo-otto, step "Dentro e stringi":
gate: { pos: V(130, 112, 0.2), r: 2 },
cross: { at: 0.35, label: "DENTRO L'OCCHIO", pos: V(112, 104, 0.5) },

// nodo-piano, step "Destra sopra":
cross: { at: 0.15, label: "DESTRO SOPRA IL SINISTRO", pos: V(112, 168, 0) },
// nodo-piano, step "Sinistra sopra":
cross: { at: 0.15, label: "SINISTRO SOPRA IL DESTRO", pos: V(112, 168, 0) },

// gassa, step "La tana":
cross: { at: 0.55, label: "OCCHIO VERSO IL CORRENTE", pos: V(108, 132, 0.6) },
// gassa, step "Il coniglio esce":
gate: { pos: V(108, 132, 0.55), r: 1.7 },
cross: { at: 0.6, label: "SU DALLA TANA", pos: V(110, 134, 0.9) },
// gassa, step "Gira l'albero":
cross: { at: 0.3, label: "DIETRO L'ALBERO", pos: V(184, 84, -0.9) },
// gassa, step "Rientra e stringi":
gate: { pos: V(108, 132, 0.55), r: 1.7 },
cross: { at: 0.25, label: "GIÙ NELLA TANA", pos: V(118, 138, 0.7) },

// parlato, step "Prima volta":
cross: { at: 0.5, label: "GIRO COMPLETO, STESSO LATO", pos: [parlatoR, -2.3, 0] },
// parlato, step "Seconda volta":
cross: { at: 0.45, label: "SOPRA LA PRIMA VOLTA", pos: [parlatoR, 0.1, 0] },
// parlato, step "Sotto l'incrocio":
gate: { pos: [-0.6, 1.2, -2.2], r: 1.1 },
cross: { at: 0.5, label: "SOTTO LA X", pos: [-0.4, 1.35, -2.4] },

// giro morto, step "Anello":
gate: { pos: [0, ringY - ringR - 0.5, 0], r: 1.6 },
// giro morto, step "Giro morto":
cross: { at: 0.5, label: "UN GIRO E MEZZO", pos: [0, ringY, 0] },
// giro morto, step "Primo mezzo collo":
cross: { at: 0.4, label: "SOPRA LA DORMIENTE", pos: [1.85, -0.9, 0] },
// giro morto, step "Secondo mezzo collo":
cross: { at: 0.4, label: "SOPRA LA DORMIENTE", pos: [1.85, -3.0, 0] },

// bandiera, step "La sottile entra":
gate: { pos: V(118, 112, 0.3), r: 2 },
cross: { at: 0.7, label: "DENTRO L'ASOLA", pos: V(118, 118, 0.5) },
// bandiera, step "Gira l'asola":
cross: { at: 0.3, label: "DIETRO ENTRAMBI I CAPI", pos: V(92, 70, -1.0) },
// bandiera, step "Sotto se stessa":
gate: { pos: V(142, 134, 0.5), r: 1.4 },
cross: { at: 0.55, label: "SOTTO SE STESSA", pos: V(148, 140, 0.7) },
```

- [ ] **Step 4: Verificare che i test passino**

Run: `cd presentazione && node --test test/nodi.test.mjs`
Expected: PASS tutti

- [ ] **Step 5: Commit**

```bash
git add presentazione/src/js/nodi-data.js presentazione/test/nodi.test.mjs
git commit -m "feat(nodi): annotazioni didattiche gate/cross sui passi"
```

---

### Task 2: Motore 3D — varco, camera, slow-mo, etichette

**Files:**
- Modify: `presentazione/src/js/nodi-3d.js`
- Modify (consuma): `presentazione/src/js/nodi.js` (wiring nel Task 3)

**Interfaces:**
- Consumes: `step.gate`, `step.cross` (Task 1); `makeLabel`, `tick`, `startAnim`, `applyReveal`, struttura `anim` esistenti.
- Produces: su `createKnotView({..., onTap})` nuovo callback opzionale `onTap()` (tap senza drag sul canvas, qualsiasi modo); nuovo metodo `setSpeed(s)` (1 = normale, 0.6 = lento); nuovo metodo `flashCross(stepIndex)` (mostra 1.5s l'etichetta cross dello step — rinforzo in «Fai tu»). Comportamenti interni: anello `gate` pulsante con pre-roll ~700ms, dolly camera verso il gate (se `!userSteering && !reduced`), progresso del gesto a velocità 0.35× nella finestra `cross.at ± 0.12`, sprite etichetta cross in fade.

- [ ] **Step 1: View state e speed**

In `createKnotView`: aggiungere `let speed = 1`, `let onTap = null` (param), `let gateRing = null`, `let crossSpr = null` (gruppo `{spr, tex, mat, until}`), `let tapPtr = null`. Esporre `setSpeed(s)` e memorizzarlo; `dur` in `startAnim` diventa `baseDur / speed`.

- [ ] **Step 2: Anello del varco**

```js
function ensureGateRing() {
  if (gateRing) return gateRing
  const geo = new THREE.TorusGeometry(1, 0.085, 10, 48)
  const m = new THREE.MeshBasicMaterial({ color: BUOY, transparent: true, opacity: 0.6, depthTest: false, depthWrite: false })
  const mesh = new THREE.Mesh(geo, m)
  mesh.visible = false
  mesh.renderOrder = 3
  scene.add(mesh)
  gateRing = { mesh, geo, mat: m }
  return gateRing
}
function showGate(gate) {
  if (!gate || tryMode || reduced) return
  const g = ensureGateRing()
  g.mesh.position.set(gate.pos[0], gate.pos[1], gate.pos[2])
  g.mesh.scale.setScalar(gate.r)
  g.mesh.visible = true
}
function hideGate() {
  if (gateRing) gateRing.mesh.visible = false
}
```

In `tick()`, se `gateRing?.mesh.visible`: `gateRing.mesh.quaternion.copy(camera.quaternion)` + pulsazione `scale.setScalar(gate.r * (1 + Math.sin(pulse) * 0.07))` e `mat.opacity = 0.42 + Math.sin(pulse) * 0.22`; `needs = true`.

- [ ] **Step 3: Pre-roll del gesto + camera verso il varco + slow-mo all'incrocio**

Riscrivere `startAnim`/`tick` così che `anim` diventi `{ g, lead, start, dur, offset, follow, gate, cross, camFrom, camTo, camT, preDelay, progress }`:

```js
function crossSpeedAt(p, cross) {
  if (!cross) return 1
  return Math.abs(p - cross.at) < 0.12 ? 0.35 : 1
}
```

In `startAnim(g)`: calcolare `baseDur` come oggi, `anim.dur = baseDur / speed`; `anim.preDelay = reduced || tryMode ? 0 : 700`; `anim.progress = 0`; `anim.gate = g.step.gate || null`; `anim.cross = g.step.cross || null`; `showGate(anim.gate)`; se `anim.gate && !userSteering && !reduced && !tryMode`: `anim.camFrom = { pos: camera.position.clone(), tgt: controls.target.clone() }`, target = gate.pos, offset = direzione camera→target attuale normalizzata × `Math.max(9, span * 0.5)`, `anim.camTo = { pos: gate.pos + offset, tgt: gate.pos }`, `anim.camT = 0`; `follow` parte dopo il pre-roll (durante pre-roll la camera fa il dolly verso `camTo` con easeInOut su 500ms).

In `tick()` sostituire il calcolo lineare di `t` con avanzamento a velocità variabile:

```js
const dt = Math.min(64, now - (anim.last || anim.start))
anim.last = now
if (anim.preDelay > 0) {
  anim.preDelay -= dt
} else {
  anim.progress = Math.min(1, anim.progress + (dt / anim.dur) * crossSpeedAt(anim.progress, anim.cross))
  if (anim.gate && anim.progress > 0.3) hideGate()
}
const t = anim.preDelay > 0 ? 0 : easeInOut(anim.progress)
```

Mantenere il resto (setDraw, placeTip, follow camera con `t`, ghost, cleanup a fine gesto + `hideGate()`).

- [ ] **Step 4: Sprite etichetta incrocio**

```js
function showCrossLabel(cross, ms = 0) {
  if (!cross) return
  if (!crossSpr || crossSpr.text !== cross.label) {
    crossSpr?.tex.dispose()
    crossSpr?.mat.dispose()
    scene.remove(crossSpr?.spr)
    const made = makeLabel(cross.label, "#ffd23e")
    made.spr.position.set(cross.pos[0], cross.pos[1], cross.pos[2])
    made.spr.scale.set(6.2, 1.55, 1)
    scene.add(made.spr)
    crossSpr = { ...made, text: cross.label }
  }
  crossSpr.spr.visible = true
  crossSpr.until = ms > 0 ? performance.now() + ms : 0
}
function hideCrossLabel() {
  if (crossSpr) crossSpr.spr.visible = false
}
```

In `tick()`: durante il gesto, se `anim.cross` e `anim.preDelay <= 0` e `Math.abs(anim.progress - anim.cross.at) < 0.2` → `showCrossLabel(anim.cross)`; a fine gesto o fuori finestra → `hideCrossLabel()` (tranne se `crossSpr.until > now`, per il flash di «Fai tu»). Opacità fade con `crossSpr.mat.opacity`.

- [ ] **Step 5: API nuove — onTap, setSpeed, flashCross**

- Param `onTap` in `createKnotView({ ..., onTap })`; nel `pointerup` esistente (dopo il check drag < 9px): se `tryMode` → logica pallini attuale; else se `anim` → completa il gesto (`anim.preDelay = 0; anim.progress = 1` al prossimo tick il cleanup); else `onTap?.()`.
- Metodi restituiti: `setSpeed(s) { speed = s }` e `flashCross(i) { const st = knot.steps[i]; if (st?.cross) { showGate(st.gate); showCrossLabel(st.cross, 1500); needs = true } }`.
- `dispose()`: aggiungere `gateRing?.geo.dispose(); gateRing?.mat.dispose(); crossSpr?.tex.dispose(); crossSpr?.mat.dispose()`.
- In `applyReveal` non-animato e in `restTip`: `hideGate()`, `hideCrossLabel()`.

- [ ] **Step 6: Test e build**

Run: `cd presentazione && node --test test/*.test.mjs && npx vite build --base=/Barca/`
Expected: PASS, build OK

- [ ] **Step 7: Commit**

```bash
git add presentazione/src/js/nodi-3d.js
git commit -m "feat(nodi): varco pulsante, camera sul gesto, slow-mo e label incrocio in 3D"
```

---

### Task 3: UI — layout mobile, overlay controlli, tap-avanza, Fai tu parlante

**Files:**
- Modify: `presentazione/src/js/nodi.js`
- Modify: `presentazione/src/styles/main.css` (classi nel Task 4)

**Interfaces:**
- Consumes: `onTap`, `setSpeed`, `flashCross` (Task 2); `step.gate`, `step.cross`, `step.hit` (Task 1).
- Produces: markup `#knot-head` (riga passo sopra lo stage), `.knot-stage__bar` (overlay controlli dentro lo stage), `.knot-chips` (toggle 2D/3D + Lento), `.knot-flash` (riga messaggi sotto lo stage), cerchio SVG `knot-gate2` nel fallback 2D.

- [ ] **Step 1: Ristrutturare `trainer()`**

HTML del trainer (sostituisce coach/cta attuali):

```js
app.innerHTML = `
  <a class="ph__back" href="./nodi.html">← Catalogo</a>
  <span class="eyebrow">${knot.english}</span>
  <h2 class="display display-md" style="margin:.35rem 0 .4rem">${knot.name}</h2>
  <p class="lede">${knot.why}</p>
  <p class="knot-use">${knot.onBoat}</p>
  <div id="knot-trainer"></div>`
// dentro wrap:
wrap.innerHTML = `
  <div class="ads-cats" role="tablist" aria-label="Modo">
    <a class="ads-cat${tryMode ? "" : " is-on"}" href="?id=${knot.id}&mode=impara">Impara</a>
    <a class="ads-cat${tryMode ? " is-on" : ""}" href="?id=${knot.id}&mode=prova">Fai tu</a>
  </div>
  <div class="knot-head" id="knot-head"></div>
  <div class="knot-stage" id="knot-stage">
    <div class="knot-chips">
      <button type="button" class="knot-chip" data-toggle-view>2D</button>
      <button type="button" class="knot-chip" data-slow>Lento</button>
    </div>
    <span class="knot-3d-hint" data-hint hidden>Segui il capo arancio</span>
    <div class="knot-stage__draw" id="knot-draw"></div>
    <div class="knot-stage__bar" id="knot-cta"></div>
  </div>
  <p class="knot-flash" id="knot-flash" hidden></p>
  <p class="knot-warn" data-warn hidden></p>`
```

`paintChrome()` scrive in `#knot-head` la versione compatta: eyebrow `Passo N/M` o «Nodo chiuso», `<strong>` titolo, testo a 1-2 righe; i bottoni in `#knot-cta` (stessi `data-prev/data-replay/data-next/data-reset` di oggi, testo compatto: `◀`, `Rivedi`, `▶`/`Ho capito`, `Ricomincia`, `Quiz`).

- [ ] **Step 2: Bottone Lento + tap-avanza**

```js
const SLOW_KEY = "barca_nodi_slow"
let slow = sessionStorage.getItem(SLOW_KEY) === "1"
function applySlow() {
  toggleSlow.classList.toggle("is-on", slow)
  active3d?.setSpeed(slow ? 0.6 : 1)
}
toggleSlow.addEventListener("click", () => {
  slow = !slow
  sessionStorage.setItem(SLOW_KEY, slow ? "1" : "0")
  applySlow()
})
```

Dopo ogni `createKnotView`: chiamare `active3d.setSpeed(...)`; passare `onTap: () => nextHandler()` dove `nextHandler` è la funzione già usata da `data-next`. In 2D (learn mode): `drawEl.addEventListener("click", () => nextHandler())` quando `!tryMode` (niente hit circle in learn).

- [ ] **Step 3: Fai tu parlante + rinforzo cross**

In `onHit(i)`:

```js
if (i === step) {
  const done = step + 1 >= stepMax
  if (knot.steps[i].cross) {
    flash(knot.steps[i].cross.label)
    active3d?.flashCross(i)
  }
  step += 1
  if (done) { state = markPracticed(state, knot.id); persist() }
  paint(step - 1)
} else if (i > step) {
  flash("No: il pallino acceso, quello del gesto da fare")
  shake()
} else {
  flash("Già fatto: ora il pallino acceso")
  shake()
}
```

`flash(msg)` scrive in `#knot-flash` e lo nasconde dopo 1.6s (timeout con clearTimeout).

- [ ] **Step 4: 2D — cerchio varco + label**

In `stageSvg(knot, revealed, opts)`: se `opts.fresh >= 0` e `knot.steps[opts.fresh].gate` e `!opts.hits` → aggiungere `<circle class="knot-gate2" cx="${step.hit.x}" cy="${step.hit.y}" r="${step.gate.r * 10}"/>` (dopo le rope, prima degli hit). `paintChrome` in 2D learn: se lo step corrente ha `cross`, accodare `<span class="knot-cross2">${label}</span>` nel testo del passo.

- [ ] **Step 5: Test UI-wiring (regex sui sorgenti, pattern nav-ui.test.mjs)**

In `presentazione/test/nodi.test.mjs`:

```js
import { readFileSync } from "node:fs"

test("UI trainer: overlay controlli e chip lento cablati", () => {
  const js = readFileSync(new URL("../src/js/nodi.js", import.meta.url), "utf8")
  const css = readFileSync(new URL("../src/styles/main.css", import.meta.url), "utf8")
  assert.match(js, /knot-stage__bar/)
  assert.match(js, /data-slow/)
  assert.match(js, /knot-flash/)
  assert.match(js, /flashCross/)
  assert.match(css, /\.knot-stage__bar/)
  assert.match(css, /\.knot-gate2/)
  assert.match(css, /\.knot-chip/)
})
```

- [ ] **Step 6: Run + build**

Run: `cd presentazione && node --test test/*.test.mjs && npx vite build --base=/Barca/`
Expected: PASS, build OK

- [ ] **Step 7: Commit**

```bash
git add presentazione/src/js/nodi.js presentazione/test/nodi.test.mjs
git commit -m "feat(nodi): layout mobile con controlli sullo stage, tap-avanza, Fai tu con feedback"
```

---

### Task 4: CSS mobile-first

**Files:**
- Modify: `presentazione/src/styles/main.css` (blocco `.knot-*`, ~linee 2278–2517)

**Interfaces:**
- Consumes: classi del Task 3 (`knot-head`, `knot-stage__bar`, `knot-chip`, `knot-flash`, `knot-gate2`, `knot-cross2`).

- [ ] **Step 1: Stili**

```css
.knot-head {
  margin: 0 0 0.6rem;
}
.knot-head .eyebrow { font-size: 0.72rem; }
.knot-head strong {
  display: block;
  font-family: var(--font-cond);
  font-size: 1.15rem;
  letter-spacing: 0.02em;
  margin: 0.1rem 0 0.15rem;
}
.knot-head p {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.knot-cross2 {
  display: inline-block;
  margin-top: 0.25rem;
  padding: 0.05rem 0.45rem;
  border-radius: 99px;
  border: 1px solid rgba(255, 210, 62, 0.45);
  color: #ffd23e;
  font-family: var(--font-cond);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.knot-stage--3d { max-height: min(34rem, 66svh); }
.knot-chips {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  z-index: 2;
  display: flex;
  gap: 0.4rem;
}
.knot-chip {
  padding: 0.28rem 0.6rem;
  border-radius: 99px;
  border: 1px solid rgba(243, 235, 224, 0.18);
  background: rgba(12, 10, 9, 0.72);
  color: var(--foam);
  font-family: var(--font-cond);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
}
.knot-chip.is-on {
  border-color: rgba(255, 59, 10, 0.55);
  color: #ff8f70;
}
.knot-stage__bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 0.6rem 0.8rem;
  background: linear-gradient(to top, rgba(7, 5, 4, 0.82), transparent);
}
.knot-stage__bar .btn {
  min-width: 44px;
  min-height: 44px;
  padding: 0 1.05rem;
}
.knot-flash {
  min-height: 1.2rem;
  margin: 0.45rem 0 0;
  font-family: var(--font-cond);
  font-size: 0.95rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #ffd23e;
}
.knot-gate2 {
  fill: none;
  stroke: #ffd23e;
  stroke-width: 2.5;
  stroke-dasharray: 7 6;
  animation: knot-gate-pulse 1.4s var(--ease-out) infinite;
  pointer-events: none;
}
@keyframes knot-gate-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.95; }
}
```

- [ ] **Step 2: Ridotto-motion e rimozioni**

Nel media query `prefers-reduced-motion` esistente (~linea 2512): aggiungere `.knot-gate2 { animation: none; opacity: 0.8; }`. Eliminare `.knot-view-toggle` (sostituito da `.knot-chip`) da CSS e usare `.knot-chip` in `nodi.js` per il toggle vista (già nel markup Task 3).

- [ ] **Step 3: Verifica build**

Run: `cd presentazione && npx vite build --base=/Barca/ && node --test test/*.test.mjs`
Expected: build OK, test PASS

- [ ] **Step 4: Commit**

```bash
git add presentazione/src/styles/main.css presentazione/src/js/nodi.js
git commit -m "feat(nodi): CSS mobile-first — head compatto, barra overlay, chip, varco 2D"
```

---

### Task 5: Verifica manuale mobile

**Files:** nessuno (verifica io con viewport simulato)

- [ ] **Step 1: Dev server + viewport iPhone**

Run: `cd presentazione && npx vite preview --port 4173` (dopo build) e aprire `http://localhost:4173/nodi.html` con viewport 390×844.
Checklist: (1) gassa in Impara: anello giallo pulsa sulla tana prima del gesto, camera si avvicina, «DIETRO L'ALBERO» appare rallentando; (2) bottoni ◀/▶ visibili insieme all'animazione senza scroll; (3) tap sullo stage avanza (primo tap completa il gesto); (4) Lento rende tutto più lento e resta dopo navigazione; (5) Fai tu: tap sbagliato → shake + messaggio; corretto → label gialla 1.5s; (6) toggle 2D: cerchio tratteggiato sul varco, label nel testo; (7) quiz e catalogo intatti.

- [ ] **Step 2: Fix eventuali e commit**

```bash
git add -A presentazione && git commit -m "fix(nodi): ritocchi da verifica mobile"
```

---

### Task 6: Wiki, lint, deploy

**Files:**
- Modify: `wiki/concetti/nodi-marinareschi.md`
- Modify: `wiki/log.md`

- [ ] **Step 1: Wiki**

In `wiki/concetti/nodi-marinareschi.md`: aggiornare `updated: 2026-08-21` e la descrizione della vista 3D: «varco evidenziato (anello giallo pulsante) prima del gesto, camera che si avvicina, rallento ed etichetta sopra/sotto all'incrocio, bottone Lento; su mobile titolo passo e controlli (◀ Rivedi ▶) sovrapposti allo stage; tap sullo stage = avanti». In `wiki/log.md` (in testa, dopo l'header):

```md
## [2026-08-21] setup | Nodi: telecamera del gesto + mobile

- Trainer più didattico: varco (gate) pulsante prima del gesto, camera sul gesto, slow-mo + etichetta SOPRA/SOTTO all'incrocio, bottone Lento.
- Mobile-first: head passo compatto, barra controlli ◀ Rivedi ▶ sullo stage, tap = avanti, Fai tu con messaggi d'errore espliciti.
- Spec: docs/superpowers/specs/2026-08-21-nodi-telecamera-gesto-design.md.
```

- [ ] **Step 2: Lint + test finali**

Run: `node scripts/lint-wiki.mjs` (da root) e `cd presentazione && npm test && npx vite build --base=/Barca/`
Expected: lint pulito (o fix), test PASS, build OK

- [ ] **Step 3: Push e deploy**

```bash
git add wiki/concetti/nodi-marinareschi.md wiki/log.md docs/superpowers/plans/2026-08-21-nodi-telecamera-gesto.md
git commit -m "docs(nodi): wiki e piano — telecamera del gesto"
git push origin main
```

- [ ] **Step 4: Smoke test post-deploy**

Run: `gh run watch` poi `curl -s https://tizianocarpentieri.github.io/Barca/nodi.html | head -5` (verificare 200 e contenuto) e apertura pagina su browser reale.
Expected: workflow Pages verde, pagina online aggiornata.

---

## Self-Review

- **Spec coverage**: gate/cross dati (T1), anello+camera+slow-mo+label 3D (T2), overlay+tap+lento+Fai tu+2D (T3), mobile CSS (T4), verifica manuale (T5), wiki+deploy (T6). Coperto tutto; mani 3D e micro-passi esplicitamente out of scope.
- **Placeholder scan**: nessun TBD; codice concreto per ogni step.
- **Type consistency**: `setSpeed(s)`, `flashCross(i)`, `onTap()` usati identici in T2/T3; `gate.pos/r`, `cross.at/label/pos` identici in T1/T2/T3; classi CSS coerenti tra T3 e T4.
