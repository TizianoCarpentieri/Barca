---
title: Accessori revamp v2 — spec
type: spec
updated: 2026-08-08
status: active
tags: [accessori, spec, subito, scoring, ui]
---

# Spec — Revamp sezione Accessori (v2)

Progetto: presentazione (Vite + GitHub Pages), repo Barca.
Decisioni concordate in chat il 2026-08-08 (vedi `wiki/concetti/feed-accessori-scoring.md`).

## 1. Obiettivo

Rendere la sezione Accessori utile: feed affidabile (sola Subito), score con confronto
reale col prezzo nuovo (automatizzato 2×/giorno), UI senza accapo con icona Accessori
sulla stessa riga dei 3 tab, pagina dedicata con filtri destinazione e tipologia.

## 2. Cambi vs v1

### 2.1 Rimozione eBay (completa)

- `presentazione/scripts/fetch-accessori.mjs`: eliminare intero blocco eBay
  (EBAY_TOKEN_URL, EBAY_SEARCH_URL, EBAY_SCOPE, ebayToken, ebaySearch, normalizeEbay,
  fetchEbay, loadEnv) e il branch di fusione ebay in main(); `source` payload diventa
  `subito.it (hades)`.
- Eliminare `presentazione/.env.ebay` (da gitignore se presente).
- `.github/workflows/pages.yml`: rimuovere env `EBAY_CLIENT_ID/SECRET` dallo step
  fetch accessori.
- `presentazione/src/js/annunci.js`: rimuovere branch `source === 'ebay'` in
  `withGeoScore` e il tag sorgente eBay in `card()`.
- Wiki: `wiki/concetti/feed-accessori-scoring.md` già aggiornato.

### 2.2 ref automatico (mediana prezzi Subito "nuovo")

Nuovo script `presentazione/scripts/update-accessori-ref.mjs`:

- Importa `TIPOLOGIE` da scoring-accessori.mjs.
- Per ogni tipologia: query hades `q=<label parole chiave>` (riusa QUERIES di
  fetch-accessori), filtra gli annunci la cui condizione (estrazione testo) è
  `nuovo` o `come nuovo`, raccoglie i prezzi; calcola **mediana**.
- Scrive `presentazione/scripts/ref-prezzi.json`:

```json
{
  "updated_at": "ISO",
  "source": "subito.it (hades) condizione nuovo",
  "modelli": [
    { "id": "fishfinder", "ref_new": 180, "cap": 360, "sample": 5, "data": "ISO" }
  ]
}
```

- Regole: se `sample < 3` o mediana ≤ 0 → il modello NON viene aggiornato (resta
  il valore precedente/baseline). Il file è **committato** con baseline manuale
  iniziale; il workflow lo aggiorna a ogni run (stesso cron feed: 06:15/18:15 UTC).
- `scoring-accessori.mjs`: `classifyAccessorio` legge `ref_new`/`cap` da
  `ref-prezzi.json` per la categoria dell'item quando presente (override della
  baseline in TIPOLOGIE). Cap per tipologia = `round(ref_new * 2)`.

Nota: mediana vs baseline — la baseline resta fallback se il file manca o non ha
la categoria.

### 2.3 Scoring addolcito

- "usato carissimo" (ratio > 0.9) −25 → **−15**
- "sopra prezzo nuovo" (nuovo ratio > 1) −15 → **−10**
- cap per tipologia ≈ **ref_new × 2** (prima fino a 3-4×)
- bonus Lazio: **+15 → +5**
- distanza: per accessori (oggetti spedibili) **nessuna penalità di distanza**;
  solo la nota "Lazio" (+5) se locale; niente penalità `lontano`.
- fit: alto ≥65 · medio ≥45 · basso <45 · stretch se prezzo > cap (invariato)

### 2.4 Tipologie e destinazioni

- **27 tipologie** = 22 attuali + 5 nuove:
  - `galleggianti` (Galleggianti / boe) — destinazione Pesca
  - `canne-mulinelli` (Canne & mulinelli) — destinazione Pesca
  - `radio-vhf` (Radio VHF) — destinazione Elettronica
  - `cassetta-attrezzi` (Cassetta attrezzi) — destinazione Motore & manutenzione
  - `binocolo` (Binocolo / vista) — destinazione Elettronica
- **5 destinazioni** (campo item `dest`, `dest_label`):
  - `elettronica` (Elettronica): fishfinder, fishfinder-deeper, plotter, supporto, radio-vhf, binocolo
  - `pesca` (Pesca): portacanne-kit, portacanne-poppa, killbag, sedile, galleggianti, canne-mulinelli
  - `sicurezza` (Sicurezza & dotazione): ancora, giubbotto, estintore, fanali, cime
  - `scafo` (Scafo & comfort): bimini, ombrellone, telone, parabordi
  - `motore` (Motore & manutenzione): pompa-sentina, elica, batteria, tanica, kit-riparazione, cassetta-attrezzi
- ref_new/cap baseline per le 5 nuove (stima mercato, da affinare via automatismo):
  - galleggianti: ref 10, cap 25
  - canne-mulinelli: ref 50, cap 100
  - radio-vhf: ref 90, cap 180
  - cassetta-attrezzi: ref 25, cap 50
  - binocolo: ref 45, cap 90
- `classifyAccessorio` restituisce anche `dest` e `dest_label`.

### 2.5 UI

**annunci.html** (tab row, fix accapo):

- `.ads-cats` passa da grid `repeat(3, 1fr)` a layout con 3 tab flessibili + 1
  **elemento compatto Accessori** sulla stessa riga: flex `grid-template-columns:
  repeat(3, 1fr) auto` (main.css:1315-1318). Il 4° è un bottone `ads-cat ads-cat--icon`
  con piccola icona SVG inline (nuotatore/ancora/ingranaggio) + label "Accessori",
  `data-cat="accessori"` → **naviga a `accessori.html`** invece di caricare il feed
  in place (in `catsEl` click handler: se `next === 'accessori'` → `location.href =
  './accessori.html'`).
- Stile icona: `ads-cat--icon` più compatto (padding ridotto, icona inline, font
  più piccolo), stesso linguaggio visivo (bordo brass/arancio).

**accessori.html** (NUOVO file):

- Copia struttura di annunci.html ma:
  - tab row identica (stessa grid 3+1, con Accessori attivo)
  - extra riga filtri **destinazione**: chips `Tutti` + 5 destinazioni
    (id `ads-dests`)
  - extra riga filtri **tipologia**: chips dinamiche dalla categoria (id `ads-tips`),
    mostrate quando la destinazione selezionata ≠ Tutti (o sempre, scelta UI: chips
    tipologie della destinazione attiva)
  - riusa `annunci.js` via pathname: in `detectCat()` aggiungere
    `if (location.pathname.includes('accessori')) return 'accessori'`
  - `FEEDS.accessori` aggiornato (nota: solo Subito, niente eBay)
- Card riusate con badge destinazione: in `card()` aggiungere tag dest quando
  presente (`ads-tag--dest`).

**annunci.js** — logica filtri accessori:

- Stato: `destFilter = 'all'`, `tipFilter = 'all'`.
- `applyFilter`: se `cat === 'accessori'` → filtra per dest e tip oltre agli
  attuali (lazio/alto/hard).
- chips destinazione: `data-dest`, click → set + rerender + rebuild chips tipologia
  (liste `DEST_TIPS[dest]`).
- `syncUi` adatta stamp/note.
- nav.js: aggiungere voce "Accessori" al sheet menu (`./accessori.html`).

### 2.6 Workflow CI

`.github/workflows/pages.yml`:

- step accessori: prima `node scripts/update-accessori-ref.mjs` (continue-on-error),
  poi `node scripts/fetch-accessori.mjs` (continue-on-error, senza env eBay).
- build invariato.

## 3. Non-goals

- Niente nuova API esterna (no key).
- Niente cambi a feed rigide/gommoni/motori (tranne rimozione eBay in annunci.js che
  non li tocca).
- Niente test framework nuovo: il progetto non ha suite; verifica = run degli
  script (python/node), build vite e ispezione JSON.

## 4. Criteri di accettazione

1. `update-accessori-ref.mjs` produce `ref-prezzi.json` con sample>0 per almeno le
   tipologie con offerte "nuove" su Subito; le altre restano baseline.
2. `fetch-accessori.mjs` non contiene più alcun riferimento eBay; JSON `source` è
   solo subito; item hanno `dest`/`dest_label`.
3. Score: nessun item con `reasons` contenente "lontano" per distanza; bonus Lazio
   max +5; stretch ridotto (item con price > cap) rispetto al 29/60 attuale.
4. `annunci.html`: 4 elementi sulla stessa riga (nessun wrap); clic Accessori →
   `accessori.html`.
5. `accessori.html`: filtri destinazione + tipologia funzionanti; card identiche.
6. CI green (build vite) e deploy su Pages.
