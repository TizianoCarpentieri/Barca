# Accessori Revamp v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere la sezione Accessori utile: sola fonte Subito, score con ref automatico dal prezzo "nuovo" (2×/giorno), UI senza accapo (icona Accessori sulla stessa riga dei 3 tab) e pagina dedicata con filtri destinazione/tipologia.

**Architecture:** (1) rimozione completa di eBay da fetch/scoring/JS/workflow; (2) nuovo script `update-accessori-ref.mjs` che calcola la mediana dei prezzi "nuovo" da Subito e la scrive in `ref-prezzi.json` (override di ref_new/cap in classify); (3) scoring addolcito (penalità −15/−10, Lazio +5, niente distanza per accessori, cap = ref×2, 27 tipologie + 5 destinazioni); (4) UI: annunci.html con 3 tab + icona accessori stessa riga, nuova accessori.html con filtri dest+tip.

**Tech Stack:** Node.js 22 (ESM), Vite 6, vanilla JS/CSS, hades.subito.it API (fetch), GitHub Actions.

## Global Constraints

- Node ⩾22, ESM (`"type": "module"`), package scripts usano `node scripts/*.mjs`.
- Linux/macOS paths; solo ESM imports (es. `import fs from 'fs'`).
- JSON payload fed: chiavi `updated_at, source, filters, stats, errors, items`.
- Fit: alto ≥65 · medio ≥45 · basso <45 · stretch se price > cap.
- Riga per la tabella non deve aver references to `ebay` (search `curl` per evitare bug).
- UI grid tab: `grid-template-columns: repeat(3, 1fr) auto` (4 elementi stesi).
- Cron feed attuale: `'15 6,18 * * *'` (06:15/18:15 UTC).
- Non intridurre nuove API e non aggiungere dipendenze runtime.
- Lavorare solo dentro `presentazione/` + `.github/workflows/pages.yml` + `docs/superpowers/`.
- Non commitare `.env.ebay`; se presente locale non toccarlo (rimozione non è obbligatoria per test locale, ma va rimossa dal git e dagli step).

---

### Task 1: Rimuovere il blocco eBay da `fetch-accessori.mjs`

**Files:**
- Modify: `presentazione/scripts/fetch-accessori.mjs`

**Interfaces:**
- Consumes: nessuno (scorre in avanti)
- Produces: fetch solo-Subito, payload `source: 'subito.it (hades)'`, senza `errors` eBay.

- [ ] **Step 1: Rimuovi codice eBay**

Rimuovi le sezioni/function/const:
- riga commento `EBAY_TOKEN_URL`, `EBAY_SEARCH_URL`, `EBAY_SCOPE` (riga 132-134)
- `loadEnv()` (54-65) e la chiamata in `main()`
- `ebayToken()`, `ebaySearch()`, `normalizeEbay()`, `fetchEbay()` (136-260)
- in `main()`: `const [subito, ebay] = ...` → `const subito = await fetchSubito()`
- cambia:
```js
const items = []
for (const raw of [...subito.items, ...ebay.items]) { ... }
```
con
```js
for (const raw of subito.items) { ... }
```
- rimuovere il campo `source` args dall'oggetto payload: `source: 'subito.it (hades)'`
- rimuovere `stats.ebay` (tenere solo `scanned_unique: subito.scanned`)
- rimuovere merge `[...subito.errors, ...ebay.errors]` → `subito.errors`
- riga in `normalizeSubito`: rimuovere riferimenti a eBay (nessuno presente)

- [ ] **Step 2: Verifica sintassi e assenza residui**

```bash
grep -in "ebay\|loadenv\|ebayToken\|fetchEbay" presentazione/scripts/fetch-accessori.mjs || echo "OK: nessun residuo eBay"
```
Verifica anche che gli import di `detectCategory`/`TIPOLOGIE` non siano rotti (restano usati).

- [ ] **Step 3: Rimuovi env dal workflow**

In `.github/workflows/pages.yml` rimuovi dal blocco `Fetch accessori`:
```yaml
        env:
          EBAY_CLIENT_ID: ${{ secrets.EBAY_CLIENT_ID }}
          EBAY_CLIENT_SECRET: ${{ secrets.EBAY_CLIENT_SECRET }}
```

- [ ] **Step 4: Commit**

```bash
git add presentazione/scripts/fetch-accessori.mjs
git add .github/workflows/pages.yml
git rm presentazione/.env.ebay 2>/dev/null || true
git commit -m "refactor(accessori): rimuove fonte eBay da fetch e workflow"
```

---

### Task 2: Nuovo `update-accessori-ref.mjs` (ref automatico mediana Subito "nuovo")

**Files:**
- Create: `presentazione/scripts/update-accessori-ref.mjs`
- Modify: `presentazione/package.json` (aggiungi script `update-accessori-ref`)

**Interfaces:**
- Consumes: `TIPOLOGIE` da `./scoring-accessori.mjs`, `extractCondition` da stessa.
- Produces: file `presentazione/scripts/ref-prezzi.json` con `{updated_at, source, modelli:[{id, ref_new, cap, sample, data}]}`.
  Le chiavi usate dal Task 4.

- [ ] **Step 1: Crea script**

```js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { TIPOLOGIE, extractCondition } from './scoring-accessori.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'ref-prezzi.json')
const SUBITO_CAT = 22 // Nautica

const SUBITO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  Origin: 'https://www.subito.it',
  Referer: 'https://www.subito.it/annunci-italia/vendita/nautica/',
}

/** Keyword di ricerca per ogni tipologia (riadatta QUERIES di fetch-accessori). */
const QUERY_BY_TIP = {
  fishfinder: 'ecoscandaglio',
  'fishfinder-deeper': 'deeper',
  plotter: 'plotter gps nautico',
  supporto: 'supporto tablet barca',
  'portacanne-kit': 'portacanne kit',
  'portacanne-poppa': 'portacanne poppa',
  ancora: 'ancora sagola',
  killbag: 'kill bag secchio vivo',
  bimini: 'bimini tendalino',
  ombrellone: 'ombrellone barca',
  telone: 'telone barca',
  giubbotto: 'giubbotto salvagente',
  estintore: 'estintore nautico',
  fanali: 'fanali navigazione',
  'pompa-sentina': 'pompa sentina',
  elica: 'elica fuoribordo',
  batteria: 'batteria nautica',
  tanica: 'tanica carburante',
  parabordi: 'parabordi',
  cime: 'cime ormeggio',
  sedile: 'sedile pesca',
  'kit-riparazione': 'kit riparazione gommone',
  galleggianti: 'galleggianti boe',
  'canne-mulinelli': 'canna mulinello pesca',
  'radio-vhf': 'radio vhf',
  'cassetta-attrezzi': 'cassetta attrezzi',
  binocolo: 'binocolo nautico',
}

function feat(ad, uri) {
  const f = (ad.features || []).find((x) => x.uri === uri)
  return f?.values?.[0] || null
}
function subitoPrice(ad) {
  const p = feat(ad, '/price')
  const n = parseInt(String(p?.key || p?.value || '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}
async function subitoSearch(q) {
  const u = new URL('https://hades.subito.it/v1/search/items')
  u.searchParams.set('q', q)
  u.searchParams.set('c', String(SUBITO_CAT))
  u.searchParams.set('t', 's')
  u.searchParams.set('lim', '30')
  u.searchParams.set('prs', '1-1200')
  const res = await fetch(u, { headers: SUBITO_HEADERS })
  if (!res.ok) throw new Error(`Subito ${res.status} q=${q}`)
  return res.json()
}

const mediana = (arr) => {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const n = s.length
  return n % 2 === 1 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2
}

async function main() {
  const modelli = []
  for (const t of TIPOLOGIE) {
    const q = QUERY_BY_TIP[t.id]
    const prices = []
    if (q) {
      try {
        const data = await subitoSearch(`${q} nuovo`)
        for (const ad of data.ads || []) {
          const price = subitoPrice(ad)
          if (price == null) continue
          const cond = extractCondition({ subject: ad.subject || '', body: ad.body || '' })
          if (cond === 'nuovo' || cond === 'come nuovo') prices.push(price)
        }
      } catch (e) {
        console.warn(`ref ${t.id}: ${e.message}`)
      }
    }
    const ref = mediana(prices)
    modelli.push({
      id: t.id,
      ref_new: ref ?? t.ref_new,
      cap: Math.round((ref ?? t.ref_new) * 2),
      sample: prices.length,
      data: new Date().toISOString(),
    })
    await new Promise((r) => setTimeout(r, 250))
  }
  const out = {
    updated_at: new Date().toISOString(),
    source: 'subito.it (hades) condizione nuovo — mediana',
    modelli,
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
  console.log(`Wrote ${OUT} (${modelli.length} modelli)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
```
> Nota per l'implementatore: `extractCondition` è già importata da `scoring-accessori.mjs` ai fini di riuso; controlla il suo comportamento su un ad "nuovo" via il test manuale sotto.

- [ ] **Step 2: Verifica struttura**

```bash
python3 - <<'PY'
import re
src = open('presentazione/scripts/update-accessori-ref.mjs').read()
assert 'TIPOLOGIE' in src and 'extractCondition' in src
assert 'mediana' in src and 'ref-prezzi.json' in src
print('struttura ok: import + mediana + scritta ref-prezzi.json')
PY
```

- [ ] **Step 3: Aggiungi script npm**

`package.json` scripts:
```json
"update-accessori-ref": "node scripts/update-accessori-ref.mjs"
```

- [ ] **Step 4: Workflow step**

Aggiungi prima dello step fetch accessori (o al suo interno, sub-step separato) nel `.github/workflows/pages.yml`:
```yaml
      - name: Update ref prezzi (Subito nuovo mediana)
        working-directory: presentazione
        run: node scripts/update-accessori-ref.mjs
        continue-on-error: true
```

- [ ] **Step 5: Baseline iniziale (autogennata)**

Non serve creare il JSON a mano: lo script `update-accessori-ref.mjs` genera `ref-prezzi.json` dal primo run. Se nessuna tipologia ha annunci "nuovo" (sample 0), `ref_new`/`cap` restano quelli di `TIPOLOGIE`. Commitarlo al primo push:

```bash
# in CI o con Node → primo run crea il file; committare il risultato
git add presentazione/scripts/ref-prezzi.json presentazione/scripts 2>/dev/null || true
```

Se Node non è disponibile in locale, push su `main` → la CI genera e il file resta la baseline committata al commit successivo.

- [ ] **Step 6: Commit**

```bash
git add presentazione/scripts/update-accessori-ref.mjs presentazione/package.json .github/workflows/pages.yml presentazione/scripts/ref-prezzi.json
git commit -m "feat(access): update ref automatico mediana prezzi Subito nuovo"
```

---

### Task 3: Aggiornare `scoring-accessori.mjs` (27 tipologie + destinazioni + scoring addolcito)

**Files:**
- Modify: `presentazione/scripts/scoring-accessori.mjs`

**Interfaces:**
- Produces: TIPOLOGIE con `dest`/`dest_label`, `DESTINAZIONI` export; `classifyAccessorio` restituisce anche `dest`, `dest_label`; cap = ref×2 default; nuovo branch auto-ref.

- [ ] **Step 1: Aggiungi 5 tipologie e campi dest/dest_label**

In `TIPOLOGIE`, per ciascuna entry aggiungi `{ id, label, peso, ref_new, cap, re, dest, dest_label }`.
Fissare cap = Math.round(ref_new*2) dove oggi è diverso. Liste dest:
- elettronica: fishfinder, fishfinder-deeper, plotter, supporto, radio-vhf, binocolo
- pesca: portacanne-kit, portacanne-poppa, killbag, sedile, galleggianti, canne-mulinelli
- sicurezza (Sicurezza & dotazione): ancora, giubbotto, estintore, fanali, cime
- scafo (Scafo & comfort): bimini, ombrellone, telone, parabordi
- motore (Motore & manutenzione): pompa-sentina, elica, batteria, tanica, kit-riparazione, cassetta-attrezzi

Nuove regex:
```js
{ id: 'galleggianti', label: 'Galleggianti / boe', peso: 10, ref_new: 10, cap: 25, re: /galleggiant|boe|segnalet\|i/i, dest: 'pesca', dest_label: 'Pesca' },
{ id: 'canne-mulinelli', label: 'Canne & mulinelli', peso: 18, ref_new: 50, cap: 100, re: /\bcanne?\b.*mulinell|mulinello|canne\s+da\s+pesca|spinning\s+rod/i, dest: 'pesca', dest_label: 'Pesca' },
{ id: 'radio-vhf', label: 'Radio VHF', peso: 22, ref_new: 90, cap: 180, re: /\bvhf\b|radio\s+vhf|marina\s+vhf/i, dest: 'elettronica', dest_label: 'Elettronica' },
{ id: 'cassetta-attrezzi', label: 'Cassetta attrezzi', peso: 8, ref_new: 25, cap: 50, re: /cassett[ae]\s+attrezz|attrezz\s+cassett|tool\s*box/i, dest: 'motore', dest_label: 'Motore & manutenzione' },
{ id: 'binocolo', label: 'Binocolo / vista', peso: 12, ref_new: 45, cap: 90, re: /binocolo|binocular/i, dest: 'elettronica', dest_label: 'Elettronica' },
```

## Hook | Tutte le 22 esistenti: cap = ref_new × 2

Aggiornare `cap` di ciascuna tipologia esistente a `Math.round(ref_new * 2)` (es. fishfinder 400→360, fishfinder-deeper 350→440, plotter 700, supporto 80, ancora 70, bimini 260, giubbotto 90, fanali 100, ecc.). Regola: **cap = ref_new × 2** ovunque.

- [ ] **Step 2: Export destinazioni**

Aggiungi dopo TIPOLOGIE:
```js
export const DESTINAZIONI = {
  elettronica: 'Elettronica',
  pesca: 'Pesca',
  sicurezza: 'Sicurezza & dotazione',
  scafo: 'Scafo & comfort',
  motore: 'Motore & manutenzione',
}
export const DEST_TIPS = {
  elettronica: ['fishfinder','fishfinder-deeper','plotter','supporto','radio-vhf','binocolo'],
  pesca: ['portacanne-kit','portacanne-poppa','killbag','sedile','galleggianti','canne-mulinelli'],
  sicurezza: ['ancora','giubbotto','estintore','fanali','cime'],
  scafo: ['bimini','ombrellone','telone','parabordi'],
  motore: ['pompa-sentina','elica','batteria','tanica','kit-riparazione','cassetta-attrezzi'],
}
```

- [ ] **Step 3: Classify restituisce dest**

In `classifyAccessorio` return object aggiungi:
```js
dest: cat.dest,
dest_label: cat.dest_label || cat.dest
```

- [ ] **Step 4: Software scoring addolcito**

Modifica:
- riga `else { score -= 25; reasons.push('usato carissimo') }` → `-15`
- riga `else { score -= 15; reasons.push('sopra prezzo nuovo') }` → `-10`
- cap: non più da solo cat.cap; in classify usa `const cap = Math.max(cat.cap, Math.round(refNew*2))`? Ma cat.cap già = ref*2. Mantieni semplice: usa `cat.cap`.
- branch Subito: `.region === 'Lazio'` bonus `score += 5` (dal 15); **rimuovi** `applyDistanceScore` per accesso (niente penalità distanza): sostituire:
```js
} else {
      if (item.region === 'Lazio' || /lazio/i.test(item.place||'')) { score += 5; reasons.push('Lazio') }
      // niente applyDistanceScore: accessori spedibili
}
```
- btw: per motori/barche tenere come sono (solo sezione accessori).

- [ ] **Step 5: Commit**

```bash
git add presentazione/scripts/scoring-accessori.mjs
git commit -m "feat(access): 27 tipologie+5 dest e scoring addolcito (ref×2 cap, Lazio+5, no distanza)"
```

---

### Task 4: Fetch legge `ref-prezzi.json` e item con `dest`

**Files:**
- Modify: `presentazione/scripts/fetch-accessori.mjs`
- Modify: `presentazione/scripts/scoring-accessori.mjs` (firma di `classifyAccessorio`)

**Interfaces:**
- Consumes: `ref-prezzi.json` (Task 2), `classifyAccessorio` (Task 3)
- Produces: item con `ref_new`/`cap` dal ref file; payload item con `dest`/`dest_label`.

- [ ] **Step 1: Leggi ref nel fetch**

In `fetch-accessori.mjs`, all'inizio di `main()`:
```js
const refPath = path.join(__dirname, 'ref-prezzi.json')
let refs = {}
try {
  refs = JSON.parse(fs.readFileSync(refPath, 'utf8')).modelli.reduce((m, x) => { m[x.id] = x; return m }, {})
} catch {
  /* ref-prezzi.json assente → fallback baseline */
}
```

- [ ] **Step 2: Classify usa i refs (firma opzionale)**

In `scoring-accessori.mjs`, `classifyAccessorio(item, refs = {})`:
```js
const fromRef = refs[cat.id]
const refNew = item.ref_new ?? fromRef?.ref_new ?? cat.ref_new
const cap = item.cap ?? fromRef?.cap ?? cat.cap
```
(sostituisce le righe `const refNew = item.ref_new ?? cat.ref_new` e `const cap = cat.cap`)

- [ ] **Step 3: Passa i refs nel fetch**

In `fetch-accessori.mjs` main loop:
```js
const c = classifyAccessorio({ ...raw, category: detectCategory(raw) }, refs)
```

- [ ] **Step 4: commit**

```bash
git add presentazione/scripts/fetch-accessori.mjs presentazione/scripts/scoring-accessori.mjs
git commit -m "feat(access): feed usa ref-prezzi.json per ref_new/cap"
```

---

### Task 5: UI — tab row con icona + tweak main.css

**Files:**
- Modify: `presentazione/annunci.html`, `presentazione/src/styles/main.css`

**Interfaces:**
- Produces: `.ads-cats` con 4 elementi su stessa riga; bottone accessori cliccabile verso accessori.html.

- [ ] **Step 1: HTML tab row**

In annunci.html, cambiare container:
```html
<div class="ads-cats" id="ads-cats" role="tablist">
  <button ... data-cat="rigide"...
  <button ... gommoni...
  <button ... motori...
  <button type="button" class="ads-cat ads-cat--icon" data-cat="accessori" role="tab">
    <svg ...>...</svg>Accessori
  </button>
</div>
```
La griglia la cambia CSS. Icona: usa svg inline piccola: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 12c0-4 3-7 5-7s5 3 5 7c0 2-1 4-2 5h-1c1-1 2-2 2-4 0-2-2-3-3-3s-3 1-3 3c0 2 1 3 2 4h-1c-1-1-2-3-2-5z"/></svg>`

- [ ] **Step 2: CSS grid + icona**

In main.css `.ads-cats` (riga 1315):
```css
.ads-cats { grid-template-columns: repeat(3, 1fr) auto; }
.ads-cat--icon { display:flex; align-items:center; gap:.35rem; padding:.3rem .7rem; font-size:.85rem; color:var(--foam); border-color: rgba(243,235,224,.25); }
.ads-cat--icon svg { width:1.05rem; height:1.05rem; flex:none; }
```
E nel container creare un elemento `a` per accessori:
```html
<a class="ads-cat ads-cat--icon" href="./accessori.html" role="tab" aria-selected="false"><svg ...>...</svg>Accessori</a>
```
Usa `<a>` direttamente (link) non bottone, così non serve JS.

- [ ] **Step 3: Verifica no-wrap**

```bash
grep -n "ads-cats\|ads-cat--icon" presentazione/src/styles/main.css presentazione/annunci.html
```

- [ ] **Step 4: Commit**

```bash
git add presentazione/annunci.html presentazione/src/styles/main.css
git commit -m "feat(access): riga tab 3+1 con icona Accessori (no wrap)"
```

---

### Task 6: Pagina accessori.html + filtri destinazione/tipologia

**Files:**
- Create: `presentazione/accessori.html`
- Modify: `presentazione/src/js/annunci.js`

**Interfaces:**
- Produces: nuova pagina; `annunci.js` gestisce `pathname.includes('accessori')`, filtri dest + tip; `DEST_TIPS` per chips.

- [ ] **Step 1: Crea accessori.html**

Copia `annunci.html` e:
- cambia header: `<h1>Accessori</h1>`, sub text dedicato
- aggiungi dopo `ads-filters`:
```html
<div class="ads-dests" id="ads-dests" hidden>
  <button type="button" class="ads-chip is-on" data-dest="all">Tutte</button>
  <button type="button" class="ads-chip" data-dest="elettronica">Elettronica</button>
  <button type="button" class="ads-chip" data-dest="pesca">Pesca</button>
  <button type="button" class="ads-chip" data-dest="sicurezza">Sicurezza & dotazione</button>
  <button type="button" class="ads-chip" data-dest="scafo">Scafo & comfort</button>
  <button type="button" class="ads-chip" data-dest="motore">Motore & manutenzione</button>
</div>
<div class="ads-tips" id="ads-tips" hidden></div>
```
- tab row: nella griglia, il 4° link Accessori è attivo (`is-on`); gli altri 3 rimandano a `annunci.html?cat=rigide|gommoni|motori`
- script annunci.js (già presente)

- [ ] **Step 2: annunci.js — pathname + stato filtri**

Aggiungi:
```js
function isAccess() { return location.pathname.includes('accessori') }
```
In `detectCat()`: `if (isAccess()) return 'accessori'`.

Stato (dopo `let cat = detectCat()`):
```js
let destFilter = 'all'
let tipFilter = 'all'
const DEST_TIPS = {
  elettronica: ['fishfinder', 'fishfinder-deeper', 'plotter', 'supporto', 'radio-vhf', 'binocolo'],
  pesca: ['portacanne-kit', 'portacanne-poppa', 'killbag', 'sedile', 'galleggianti', 'canna-mulinelli'],
  sicurezza: ['ancora', 'giubbotto', 'estintore', 'fanali', 'cime'],
  scafo: ['bimini', 'ombrellone', 'telone', 'paraborti'],
  motore: ['pompa-sentina', 'elica', 'batteria', 'tanica', 'kit-riparazione', 'cassetta-attrezzi'],
}
```

- [ ] **Step 3: applyFilter accessori**

```js
function applyFilter(items) {
  const max = hardMax()
  return items.filter((it) => {
    if (isAccess() && destFilter !== 'all' && it.dest !== destFilter) return false
    if (isAccess() && tipFilter !== 'all' && it.category !== tipFilter) return false
    if (filter === 'lazio') return it.region === 'Lazio' || /lazio/i.test(it.place || '')
    if (filter === 'alto') return it.fit === 'alto'
    if (filter === 'hard') return max != null && it.price != null && it.price <= max
    return true
  })
}
```

- [ ] **Step 4: rebuild tip chips**

```js
const TIP_LABEL = {}
function indexTipLabels(items) {
  for (const it of items) if (it.category) TIP_LABEL[it.category] = it.category_label || it.category
}

function renderTips() {
  const el = document.getElementById('ads-tips')
  if (!el) return
  const ids = destFilter === 'all' ? Object.values(DEST_TIPS).flat() : (DEST_TIPS[destFilter] || [])
  const chips = [`<button type="button" class="ads-chip is-on" data-tip="all">Tutte</button>`]
  for (const id of ids) {
    chips.push(`<button type="button" class="ads-chip" data-tip="${id}">${escapeHtml(TIP_LABEL[id] || id)}</button>`)
  }
  el.innerHTML = chips.join('')
  el.hidden = false
}
```
Chiamare `indexTipLabels(all)` in `applyData` (subito dopo `all = (data.items||[]).map(withGeoScore)`), poi `renderTips()`.

- [ ] **Step 5: click handlers dest e tip**

```js
document.getElementById('ads-dests')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-dest]')
  if (!btn) return
  destFilter = btn.getAttribute('data-dest') || 'all'
  document.querySelectorAll('#ads-dests .ads-chip').forEach((b) => b.classList.toggle('is-on', b === btn))
  tipFilter = 'all'
  renderTips()
  render()
})

document.getElementById('ads-tips')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-tip]')
  if (!btn) return
  tipFilter = btn.getAttribute('data-tip') || 'all'
  document.querySelectorAll('#ads-tips .ads-chip').forEach((b) => b.classList.toggle('is-on', b === btn))
  render()
})
```
Nota: `render()` è già definita più under nel file — i listener vanno registrati **dopo** per fare riferimento senza hoisting problemi; usa funzione nomiante se serve.

- [ ] **Step 6: card badge dest**

In `card()` aggiungere, tra i tag, prima di `src`:
```js
${it.dest_label ? `<span class="ads-tag--dest">${escapeHtml(it.dest_label)}</span>` : ''}
```
(da inserire nella stringa dei `ads-card__tags`)
CSS badge in `main.css`:
```css
.ads-tag--dest { color: var(--brass); border-color: rgba(243, 235, 224, 0.3); }
```

- [ ] **Step 7: loadCat aggiornato**

In `loadCat()`:
```js
function loadCat() {
  syncUi()
  showLoading()
  syncHardChip()
  fetchFeed(FEEDS[cat].file)
    .then((data) => {
      applyData(data)
      if (isAccess()) {
        const destsEl = document.getElementById('ads-dests')
        if (destsEl) destsEl.hidden = false
        renderTips()
      }
    })
    .catch(/* come oggi */)
}
```
In `showLoading()`: se `isAccess()` tenere `#ads-dests` e `#ads-tips` visibili (oppure nasconderli solo se il feed fallisce).

- [ ] **Step 8: Commit**

```bash
git add presentazione/accessori.html presentazione/src/js/annunci.js presentazione/src/styles/main.css
git commit -m "feat(access): pagina accessori con filtri destinazione e tipologia"
```

---

### Task 7: nav.js voce Accessori

**Files:**
- Modify: `presentazione/src/js/nav.js`

- [ ] **Step 1: Aggiungi voce**

Nel sheet grid aggiungi (dopo la voce `Motori`):
```html
<a href="./accessori.html"><strong>Accessori</strong><span>Feed accessori e confronto prezzi nuovo</span></a>
```

- [ ] **Step 2: Commit**

```bash
git add presentazione/src/js/nav.js
git commit -m "feat(nav): voce Accessori nel menu"
```

---

### Task 8: Verifica e deploy

**Files:**
- (nessuno di progetto)

- [ ] **Step 1: Build locale se possibile**

Node non presente → delegare a CI. Ma possiamo validare JSON/payload:
```bash
python3 -c "import json; d=json.load(open('presentazione/public/data/accessori.json')); print(len(d['items']), d['stats'], d['source'])"
```
(nota: data corrente ancora con ebay 0 — dopo rerun CI sarà solo subito)

- [ ] **Step 2: Lint**

```bash
git add -A && git status
```
Verifica che non ci siano file eBay residui: `grep -ri "ebay" presentazione/src presentazione/scripts .github/workflows/ || true`.

- [ ] **Step 3: Esegui update + fetch real (se Node disponibile)**

```bash
cd presentazione && npm run update-accessori-ref && npm run fetch-accessori
```
Se Node assente: push su main → CI lo userà.

- [ ] **Step 4: Deploy e verifica**

Push su `main`. Dopo ~3 min: fetch pagine:
```bash
curl -s https://tizianocarpentieri.github.io/Barca/annunci.html | grep -o "Accessori"
curl -s https://tizianocarpentieri.github.io/Barca/accessori.html | grep -o -i "destinazione\|Tipologia"
```

- [ ] **Step 5: Wiki log**

In `wiki/log.md` append:
```markdown
## [2026-08-08] feat(access) | Revamp v2: sola Subito, ref automatico, 27 tipologie + 5 dest, UI icona
```

- [ ] **Step 6: commit wiki**

```bash
git add wiki && git commit -m "docs(wiki): log revamp accessori v2"
```