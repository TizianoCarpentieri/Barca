# Report — Sezione Annunci: punti rinforzabili per l'ingresso del sogno Vela

**Data:** 2026-08-22
**Scopo:** analisi della sezione annunci (UI, feed, scoring, quality gate, CI, wiki) e mappa di tutti i punti rinforzabili in vista della quinta categoria **Vele** (sogno parallelo, non piano A).
**Modalità:** solo lettura e report. Nessun file di codice o wiki modificato.

---

## 1. Stato attuale della sezione annunci

Pipeline attuale (4 categorie):

| Categoria | JSON | Fetch | Tab/UI |
|-----------|------|-------|--------|
| Rigide | `public/data/annunci.json` | `scripts/fetch-annunci.mjs` | tab in `annunci.html` |
| Gommoni | `public/data/gommoni.json` | `scripts/fetch-gommoni.mjs` | tab in `annunci.html` |
| Motori | `public/data/motori.json` | `scripts/fetch-motori.mjs` | tab in `annunci.html` |
| Accessori | `public/data/accessori.json` | `scripts/fetch-accessori.mjs` | **pagina separata** `accessori.html` (link-tab) |

Componenti condivisi:

- **Scoring geo** condiviso lato server: `presentazione/scripts/geo-score.mjs` (tabelle `REGION_PRICE_FACTOR` + `LAZIO_TOWNS`, `applyDistanceScore`).
- **Normalizzatori** condivisi: `presentazione/scripts/feed-normalizers.mjs` (lunghezze, RIB, motore incluso, marca/potenza/gambo) con test `presentazione/test/feed-normalizers.test.mjs`.
- **Quality gate**: `presentazione/scripts/validate-feeds.mjs` — file per feed obbligatori, freschezza ≤2h, ≥10 item, id/titolo/URL/prezzo, duplicati interni, controlli per-track (gommoni: lunghezza/hard-hull/has_engine; motori: CV 6–40,8).
- **Client unico**: `presentazione/src/js/annunci.js` caricato sia da `annunci.html` sia da `accessori.html`; `detectCat()` sceglie la categoria; filtri gerarchici e card render lato client.
- **CI**: `.github/workflows/pages.yml` — cron 3×/giorno + push, 4 fetch sequenziali, gate, build Vite, deploy Pages. Timeout job: 20 min.

Punti di attenzione strutturali già visibili (pre-esistenti all'ingresso Vela):

1. **Due modelli UI coesistono**: `annunci.html` ha 3 tab-bottoni interni + 1 link a pagina esterna (`accessori.html:62-65`); `accessori.html:61-66` replica la barra con 3 link + 1 "attivo". Ogni nuova categoria va aggiunta **a mano in due file HTML** + `FEEDS` in `annunci.js:102-148`.
2. **Tabelle geo duplicate**: `REGION_PRICE_FACTOR` e `LAZIO_TOWNS` esistono due volte (server `geo-score.mjs:7-32` e client `annunci.js:18-41`), e regex analoghe anche in `fetch-annunci.mjs:58-59` e `fetch-gommoni.mjs:73-74`. Rischio drift.
3. **Special-case hardcoded nel client**: accessori salta la penalità distanza con `if (cat === 'accessori')` (`annunci.js:63-66`) e filtri dedicati `dest/tip` (`annunci.js:205-212, 318-319`). Un track Vela con regole proprie dovrebbe seguire lo stesso pattern → va reso configurazione, non if.
4. **Sangue incrociato tra feed**: nel feed Motori compare oggi una "Pilotina Vela/Motore" (`public/data/motori.json:982-994`), nel feed Accessori un Optimist (`accessori.json:1313`). Il gate controlla i duplicati **solo dentro** ciascun feed, non tra feed.
5. **Documentazione datata**: `wiki/concetti/feed-annunci-scoring.md` parla ancora di "tre feed" e non menziona Accessori (agg. 2026-08-10); `wiki/mercato/feed-subito-live.md` non ha ancora una quinta voce.

---

## 2. Cosa esiste già sulla Vela nel repo

- **Decisione presa** (log 2026-08-20, `wiki/log.md:45-49`): Vele = **sogno parallelo**, quinta categoria del feed Annunci, **non** sostituisce il must-have "mezzo a motore" (`wiki/preferenze/must-have.md:15-18`).
- **Criteri ancora aperti** (`wiki/preferenze/open-questions.md:47-50`): deriva/cabina, budget, no-patente sì/no, fonte e scoring.
- **Segnaposto in nice-to-have** (`wiki/preferenze/nice-to-have.md:66-69`).
- **Impianto patto riusabile** per vela (`wiki/documenti.md:29`, `wiki/sintesi/patto-bestie.md:19`, `wiki/documenti/patto.md:12`).
- **Fatti normativi già ingeriti e riutilizzabili**:
  - RC **esclusa** per unità solo a remi/vela senza motore ausiliario (`wiki/normativa/rc-obbligatoria-natanti.md:24`; fonte art. 41 D.Lgs. 171/2005 in `raw/normativa/rc-obbligatoria-natanti-2026-08-11.md`). Con motore ausiliario amovibile, invece, RC **obbligatoria a qualunque potenza**.
  - Limiti patente per vela: 14 anni natanti senza motore / vela >4 m² / remi entro 1 miglio; 16 anni con motore <30 kW (`raw/normativa/mit-conseguimento-patente-nautica-2026-08-04.md:26-27`). Soglie diverse da quelle del track motori (CV≤40,8).
  - **Punto di varo dedicato**: Pomezia approdo n. 3 Fosso della Crocetta = **solo vela deriva mobile / senza motore** (`wiki/normativa/varo-litorale-lazio.md:85`; `contratto/dati/punti-varo-lazio.json`). È il punto vietato al gommone Bestie ma perfetto per un track deriva.
  - Corridoi di lancio: valgono per unità "a motore o vela" (`wiki/documenti/varo.md:28`).
- **Dati di mercato già in raw**: es. "Barca a vela deriva mobile" cabinata ~6,70 m a 4.350 € (`raw/mercato/subito-pacchetti-under-5500-2026-08-04.json:1336-1346`); Comet 770 citata nelle trascrizioni (`scripts/transcribe-whatsapp-20260820.py:18`).

---

## 3. Punti rinforzabili (mappa completa)

Legenda priorità: **P0** = blocca il varo del tab · **P1** = necessario per qualità/robustezza · **P2** = igiene/coerenza.

### A. Decisioni e criteri del track Vele (prima del codice)

| # | Punto rinforzabile | Priorità | Dettaglio |
|---|--------------------|----------|-----------|
| A1 | **Definire il tipo**: deriva (dinghy) vs cabinato | P0 | Deriva: varo dedicato Pomezia n.3, costi bassi, ma poca aderenza a 3–6 adulti pesca/social. Cabinato ~6–7 m: realistica per gruppo ma richiede ormeggio/costi. Serve decisione di gruppo prima di ogni regex/score. |
| A2 | **Budget del track Vele** | P0 | Oggi non esiste. Riferimenti utili già in raw: cabinata 6,70 m a ~4.350 €; budget piano A 2.000 € e piano B 4.500 € come ancoraggi. Serve valore esplicito (anche "solo osservazione, nessun budget" = decisione valida). |
| A3 | **Patente per Vele** | P0 | La logica CV≤40,8 del track motori non si copia 1:1: vela pura (senza motore) = niente patente/14 anni entro 1 miglio; con ausiliario ≤30 kW = ok entro 6 miglia; sopra = patente. Il filtro "no-patente" del tab Vele deve usare soglie vela. |
| A4 | **Scoring e fonte** | P0 | Stessa fonte Subito (hades) o doppia come Accessori (eBay)? Distanza Lazio conta per i cabinati (ormeggio vicino) e quasi tutto per le derive. Decisione da scrivere. |
| A5 | **Priorità del sogno** | P1 | Ribadire in must-have/nice-to-have che Vele è osservazione, non piano A/B: evita di far deragliare shortlist e budget gommone. |

### B. UI / client (`presentazione/`)

| # | Punto rinforzabile | Priorità | Dettaglio |
|---|--------------------|----------|-----------|
| B1 | **Unico modello tab**: 5 bottoni in `annunci.html` o 5 pagine separate | P1 | Oggi coesistono due modelli (tab interni + pagina accessori). Per Vele scegliere un modello e uniformare. Il CSS già regge 5 voci: strip `flex-nowrap` scrollabile (`main.css:1457-1476`), coerente con "striscia unica 4–5 voci" (log 2026-08-20). |
| B2 | **Barra tab data-driven** | P2 | I bottoni HTML (`annunci.html:62-65`, `accessori.html:62-65`) e `FEEDS` in `annunci.js:102-148` devono restare sincronizzati a mano. Rinforzo: check runtime che ogni key di `FEEDS` abbia il suo bottone (e viceversa), errore visibile in console. |
| B3 | **Regole per-categoria configurabili** | P1 | L'if `cat === 'accessori'` per distanza (`annunci.js:63-66`) e i filtri `dest/tip` (`annunci.js:205-212`) vanno generalizzati (es. `FEEDS[cat].noDistancePenalty`, `filterGroups` per cat). Vele avrà quasi certamente un'altra eccezione (es. deriva = solo Lazio). |
| B4 | **Tabelle geo client ↔ server** | P1 | `annunci.js:18-41` duplica `geo-score.mjs:7-32`. Con il track Vele il rischio drift cresce. Rinforzo: una sola fonte (JS condiviso o generazione) o test che confronti le due tabelle. |
| B5 | **Filtri Vele** | P0 | Nuovi rami: tipo (deriva/cabinato), budget, Lazio/recenza, patente (ausiliario ≤30 kW / nessun motore). `matchesFilter` (`annunci.js:215-230`) va esteso con chiavi nuove e test. |
| B6 | **Card con campi vela** | P1 | `card()` (`annunci.js:332-392`) è hardcoded su cv/lunghezza/pavimento/bundle. Vela serve: n. vele (randa/fiocco/genoa), tipo deriva/cabinato, eventuale anno. Rinforzo: rendering tag generico da campi presenti. |
| B7 | **Meta/copy pagina** | P2 | `annunci.html:46` dice "rigide, gommoni e motori"; `annunci.html:97` "Tre feed paralleli". Aggiornare a 5 categorie e citare che Vele è sogno parallelo. |
| B8 | **Placeholder/etichette per cat** | P2 | `FEEDS[cat].ph`, `stamp`, `hardLabel` esistono già; aggiungere voce Vele (es. `ph: 'VELA'`, hardLabel coerente col budget deciso in A2). |
| B9 | **Redirect legacy** | P2 | `detectCat()` gestisce `gommoni.html`/`motori.html` e `?cat=` (`annunci.js:150-159`). Se si crea `vele.html` (modello pagina separata) prevedere `?cat=vele` e redirect; se modello tab unico, niente file nuovo. |

### C. Fetch e scoring (`presentazione/scripts/`)

| # | Punto rinforzabile | Priorità | Dettaglio |
|---|--------------------|----------|-----------|
| C1 | **Nuovo `fetch-vele.mjs`** | P0 | Template: `fetch-gommoni.mjs` (struttura query→normalize→classify→payload→snapshot). Query candidate: "barca a vela", "deriva", "cabinato", "Comet", "vela lazio/anzio", "dinghy", "420", "Optimist"… da calibrare sul tipo scelto (A1). |
| C2 | **Esclusioni incrociate** | P1 | I feed devono respingersi a vicenda: Motori esclude già "barca a vela" (`fetch-motori.mjs:65`); Rigide non esclude esplicitamente vela (`fetch-annunci.mjs:47-48`); Vele dovrà escludere gommone/RIB/motore puro. Oggi una pilotina vela/motore finisce nei Motori (vedi §1.4) → aggiungere regole cross-feed. |
| C3 | **Normalizzatori vela condivisi** | P1 | Estendere `feed-normalizers.mjs` con funzioni pure + test in `feed-normalizers.test.mjs`: `isSailboat`, `sailType` (deriva/cabinato), `extractSailCount`/velatura, riconoscimento "vela/motore" misto. |
| C4 | **Scoring vela dedicato** | P0 | Riutilizzare `applyDistanceScore` (`geo-score.mjs:52-79`) ma con parametri decisi in A4 (es. deriva: penalità forte oltre Lazio; cabinato: fattori standard). Definire fasce fit (default `fitHigh 55`, accessori 65 → per Vele decidere). |
| C5 | **Budget/reference vela** | P1 | Il pattern "ref nuovo −20%" (Argo 970 €) funziona per i gommoni. Per Vele serve un riferimento equivalente (o esplicitamente nessuno, se il track è solo osservazione). |
| C6 | **Snapshot raw** | P2 | Aggiungere `subito-vele-YYYY-MM-DD.json` in `raw/mercato/` come gli altri. |

### D. Quality gate e CI

| # | Punto rinforzabile | Priorità | Dettaglio |
|---|--------------------|----------|-----------|
| D1 | **Aggiungere `vele` alle RULES del gate** | P0 | `validate-feeds.mjs:10-15`: nuova entry con `minItems`, poi controlli per-track vela (es. no motore puro, no gommone, lunghezza scala, tipo valido). |
| D2 | **Rollout a gradini del gate** | P1 | Il gate blocca il deploy se un feed obbligatorio manca/è vecchio (`validate-feeds.mjs:21-42`). Un feed Vele flaky fermerebbe rigide/gommoni/motori. Rinforzo: attivare Vele in modalità provvisoria (es. warning per N giorni, poi obbligatorio) — coerente con "non distribuisce tab mancanti", ma senza bloccare il piano A per un sogno. |
| D3 | **Workflow: step fetch-vele** | P0 | `pages.yml:40-58`: aggiungere step dopo fetch-motori, prima del gate. Attenzione timeout 20 min (5 fetch sequenziali + build): monitorare o parallelizzare. |
| D4 | **Script npm** | P2 | `package.json:10-16`: aggiungere `fetch-vele`. |
| D5 | **Duplicati cross-feed** | P1 | Il gate controlla duplicati solo intra-feed (`validate-feeds.mjs:44-52`). Con 5 categorie serve controllo cross-feed (stesso URL in due tab = errore). |
| D6 | **Test normalizzatori** | P1 | Ogni nuova funzione C3 va coperta in `test/feed-normalizers.test.mjs` (il workflow esegue `npm test` prima dei fetch). |

### E. Wiki e knowledge base

| # | Punto rinforzabile | Priorità | Dettaglio |
|---|--------------------|----------|-----------|
| E1 | **Aggiornare `feed-annunci-scoring.md`** | P1 | Dice "tre feed" e non elenca Accessori (`wiki/concetti/feed-annunci-scoring.md:18-24`). Portarlo a 5 con la logica Vele. |
| E2 | **Aggiornare `feed-subito-live.md`** | P1 | URL (`?cat=vele` o `vele.html`), comandi locali, snapshot (`wiki/mercato/feed-subito-live.md:13-46`). |
| E3 | **Nuova pagina `preferenze/track-vele.md`** | P0 | Stesso pattern di `track-gommoni`/`track-motori`: criteri, budget, patente, esclusioni, fonti. Da scrivere dopo A1–A4. |
| E4 | **Chiudere le open questions Vele** | P1 | `wiki/preferenze/open-questions.md:47-50` una volta deciso A1–A4; loggare in `wiki/log.md`. |
| E5 | **Must-have: marcare Vele come sogno** | P2 | `wiki/preferenze/must-have.md:15-18` ("Non vela") va chiarito: vincolo sul piano A, non divieto di osservare il sogno nel feed. Evita contraddizioni. |
| E6 | **Overview e index** | P2 | `wiki/overview.md` (tab UI e stato) e `wiki/index.md` (catalogo nuove pagine) quando il tab è live. |
| E7 | **Contesto Sbarco** | P1 | `wiki/sintesi/contesto-sbarco.md` deve menzionare il track Vele (sogno parallelo + criteri) perché il bot risponda in modo coerente; se servono risposte normativa vela, valutare le pagine da leggere. |
| E8 | **Lint + graphify** | P2 | Dopo le modifiche: `node scripts/lint-wiki.mjs` e `graphify update .` (regole AGENTS.md). |

### F. Normativa e costi a norma (`contratto/`)

| # | Punto rinforzabile | Priorità | Dettaglio |
|---|--------------------|----------|-----------|
| F1 | **Sezione Vela nel prospetto** | P1 | Regola AGENTS.md: obblighi/costi emersi vanno in `contratto/prospetto-costi-a-norma.md` nella stessa sessione. Per Vele: RC esclusa solo senza motore ausiliario (con ausiliario = obbligatoria), documenti/registrazione vela, eventuale ormeggio se cabinato. |
| F2 | **Limiti patente vela in wiki normativa** | P2 | `wiki/normativa/limiti-senza-patente.md` è incentrata sul motore; aggiungere sotto-sezione vela (14 anni/1 miglio senza motore; 16 anni con <30 kW) con fonti già in raw. |
| F3 | **Varo: il punto n.3 Pomezia** | P2 | `wiki/normativa/varo-litorale-lazio.md:85` già lo cita (solo vela deriva). Il track Vele dovrebbe collegarlo esplicitamente: è un vantaggio unico delle derive. |

### G. Coerenza prodotto (sogno vs piano A)

| # | Punto rinforzabile | Priorità | Dettaglio |
|---|--------------------|----------|-----------|
| G1 | **Etichetta "sogno" in UI** | P2 | Distinguere visivamente il tab Vele (badge/nota nel `fallbackNote`): evita che il gruppo tratti i candidati vela come piano A. |
| G2 | **Niente impatto su shortlist gommone** | P1 | La shortlist (`wiki/sintesi/shortlist.md`) e il budget ≤2.000 € restano invariati; il tab Vele non deve generare "candidati" ufficiali finché il gruppo non decide di promuoverli. |
| G3 | **Fit 3–6 adulti** | P1 | Verificare che il tipo scelto in A1 sia coerente con 3 bestie (+6): un Optimist/420 non lo è; una cabinata 6–7 m sì ma cambia tutto il TCO. Serve esplicitarlo nella decisione. |

---

## 4. Sequenza consigliata

1. **Chiudere A1–A4** (tipo, budget, patente, fonte/scoring) con il gruppo → scrivere `wiki/preferenze/track-vele.md` (E3) + aggiornare open-questions/log.
2. **C3–C4 + D6**: normalizzatori vela + scoring + test, in `feed-normalizers.mjs` (nessun impatto sui feed esistenti).
3. **C1 + C6 + D4**: `fetch-vele.mjs` + script npm + snapshot raw; validazione manuale dell'output prima di toccare la CI.
4. **D1–D3**: gate + workflow (con rollout a gradini D2).
5. **B1–B9**: tab UI, FEEDS, filtri, card, copy.
6. **E1–E8 + F1–F3 + G**: allineamento wiki, prospetto, contesto Sbarco, lint, graphify.

---

## 5. Cosa NON toccare

- **Must-have "mezzo a motore"**: resta il vincolo del piano A; Vele è osservazione parallela (G2).
- **Budget ≤2.000 € gommone e shortlist**: invariati.
- **Logica gate esistente per i 4 feed attivi**: qualsiasi rafforzamento (D2, D5) non deve indebolire la protezione attuale "niente deploy con tab mancanti".
- **`raw/`**: fonti immutabili; nuovi snapshot solo in aggiunta (C6).

---

## Appendice — Mappa impatto file (solo per pianificazione, nessuna modifica fatta)

| File | Cosa cambierebbe |
|------|------------------|
| `presentazione/annunci.html` | 5° tab, meta/copy (B1, B7) |
| `presentazione/accessori.html` | barra tab allineata (B1) |
| `presentazione/src/js/annunci.js` | FEEDS + filtro/card/geo config (B3–B6, B8, B9) |
| `presentazione/scripts/fetch-vele.mjs` | **nuovo** (C1) |
| `presentazione/scripts/feed-normalizers.mjs` | helper vela (C3) |
| `presentazione/scripts/geo-score.mjs` | eventuale parametrizzazione (C4, B4) |
| `presentazione/scripts/validate-feeds.mjs` | RULES + check vela + cross-feed (D1, D5) |
| `presentazione/test/feed-normalizers.test.mjs` | test vela (D6) |
| `.github/workflows/pages.yml` | step fetch-vele (D3) |
| `presentazione/package.json` | script fetch-vele (D4) |
| `wiki/preferenze/track-vele.md` | **nuova pagina** (E3) |
| `wiki/concetti/feed-annunci-scoring.md`, `wiki/mercato/feed-subito-live.md` | aggiornamento a 5 categorie (E1, E2) |
| `wiki/preferenze/{must-have,nice-to-have,open-questions}.md` | allineamento (E4, E5) |
| `wiki/{overview,index,log}.md`, `wiki/sintesi/contesto-sbarco.md` | aggiornamento (E6–E8) |
| `contratto/prospetto-costi-a-norma.md` | sezione Vela (F1) |
| `wiki/normativa/{limiti-senza-patente,varo-litorale-lazio}.md` | sotto-sezione vela (F2, F3) |
