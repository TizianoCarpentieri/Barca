# Log — Progetto Barca

Append-only. Prefisso voci: `## [YYYY-MM-DD] <tipo> | <titolo>`

Tipi: `setup` · `ingest` · `query` · `preferenze` · `lint` · `ricerca` · `decisione`

---

## [2026-08-05] lint | Wiki allineata a dual track + scoring

- Aggiornati: overview, must-have, nice-to-have, open-questions, requisiti-v1, index.
- Nuove pagine: `modelli/argo-evo-360`, `preferenze/track-gommoni`, `preferenze/track-motori`, `concetti/feed-annunci-scoring`, `mercato/feed-subito-live`.
- Contenuti: ref Argo 970€ e regola −20%; geo-score distanza da Ardea/Pomezia; motori min 6 CV / sweet 9.9–15; UI tab unificata Annunci.
- Nota storica: “no gommone” resta sul **track rigidi**; gommoni = **track parallelo**, non cancellazione.

## [2026-08-05] setup | Feed annunci Subito live

- Pagina `presentazione/annunci.html` + JSON `public/data/annunci.json`.
- Script `presentazione/scripts/fetch-annunci.mjs` (hades.subito.it, cat. Nautica).
- Filtri: no gommone/RIB, prezzo ~800–4500 (stretch 5500), preferenza gozzo/open/Lazio, CV≤40,8 se dichiarato.
- Aggiornamento: ogni deploy + cron GitHub Actions 06:15/18:15 UTC.
- URL: https://tizianocarpentieri.github.io/Barca/annunci.html

## [2026-08-05] setup | Feed parallelo Gommoni

- Nuova sezione parallela per gommoni pneumatici (no RIB scafo rigido).
- Script dedicato `presentazione/scripts/fetch-gommoni.mjs` + `public/data/gommoni.json`.
- Criteri: ≥3.30 m (ideale 3.5–3.8), ≥4 pax, portata ~400kg, paiolato alluminio (prio1) o airdeck (prio2), chiglia gonfiabile pref., trasportabile auto, specchio poppa fuoribordo, pesca.
- Pagina `presentazione/gommoni.html`, link da index + dock nav.
- Stesso aggiornamento automatico via GitHub Actions (doppio fetch).
- Snapshot raw: `subito-gommoni-YYYY-MM-DD.json`.
- Vedi `gommoni.html` per elenco completo requisiti.

## [2026-08-05] ricerca | Reference Argo-Evo 360 AL

- Prodotto benchmark nuovo: 3.60 m, paiolato alluminio, chiglia gonfiabile, 5 pax, 475 kg, 68 kg barca, max 20 HP (raccom. 9.9-15), 970 €.
- Salvato in `raw/mercato/argo-evo-360-al-reference-2026-08-05.md`.
- Regola applicata: usato identico deve costare almeno 20% in meno (~776€) senza motore. Bundle con motore buono può valere di più.
- Scoring proporzionale anche su lunghezze vicine (non solo esatta 3.6 m).

## [2026-08-05] setup | Feed parallelo Motori

- Terza pagina parallela: `presentazione/motori.html` + `public/data/motori.json`.
- Script `scripts/fetch-motori.mjs`.
- Filtro: fuoribordo ≤40.8 CV (ideale 5-20), 4 tempi preferiti, gambo corto, marche buone, adatti gommoni 3.3-4 m.
- Navigazione: tile + dock + sheet.
- Aggiornato automaticamente insieme agli altri due feed.
- "Motori che non serve patente" per combo con i nostri gommoni.

## [2026-08-04] setup | Presentazione web manifesto

- Sito multipagina in `presentazione/` (Vite + vanilla, mobile-first, GitHub Pages).
- Pagine: home, equipaggio, regole, priorità, base, mercato, status, mosse.
- Vibe: manifesto da bar; contenuti da requisiti v1 + overview.
- Dev: `cd presentazione && npm i && npm run dev` · build: `npm run build` → `dist/`.
- Workflow Pages: `.github/workflows/pages.yml`.

## [2026-08-04] sintesi | Requisiti v1

- Intervista base chiusa. Profilo in `wiki/sintesi/requisiti-v1.md`.
- Intestazione lasciata aperta tra bestie.
- Next: preventivi rimessaggio A/C + caccia annunci con filtri.

## [2026-08-04] preferenze | Timeline affare-driven

- Acquisto quando esce l’affare giusto (orizzonte anche 6–12 mesi).

## [2026-08-04] preferenze | Cap gestione 1200€/testa/anno

- Tutte le spese ≤3600€/anno totali. TCO in budget.md: posto barca solo se canone contenuto.

## [2026-08-04] preferenze | No traino/carrello

- B rimessaggio esclusa. Restano posto barca (A) e cantiere terra (C).
- Trasporti/alaggi eccezionali a pagamento. Hub fisso obbligato.

## [2026-08-04] preferenze | No gommone; scafo rigido + tendalino

- Esclusi gommone/RIB. Target gozzo/open/lancia comoda e robusta.
- Copertura sole alzabile = requisito comfort (anche aftermarket).
- Sample Subito scafi rigidi ≤5,5k in raw/mercato.

## [2026-08-04] preferenze | Priorità: pesca > giri > bagno > facilità

- Canne surfcasting da adattare; bolentino = tecnica naturale su barca piccola.
- Wiki: nice-to-have, concetti/pesca-da-barca-piccola.

## [2026-08-04] preferenze | Frequenza moderata

- Tra 1–2/mese e quasi ogni weekend. Rimessaggio: B/C avvantaggiati vs posto caro.

## [2026-08-04] preferenze | Budget ≤4500€ solo usato

- Max mezzo 4500€; stretch minimo se sogno; solo usato.
- Sample Subito API → `raw/mercato/subito-pacchetti-under-5500-*`, wiki `mercato/usato-under-4500.md`.
- Reality: tanti gommoni 3–4,5 m e gozzi; 6 pax comodi rari; Lazio ha alcuni lead (Anzio/Fiumicino/Roma).

## [2026-08-04] preferenze | No patente (ideale)

- Nessuno ha patente; ideale non prenderla; consapevolezza no-performance a 6 pax.
- Must-have riformulato; `wiki/concetti/no-patente-6-pax-realta.md`.
- Shortlist concettuale: RIB/gommone leggero, open leggero, gozzo; no cabinati pesanti.

## [2026-08-04] preferenze | Rimessaggio A/B/C aperti

- Esclusi D ibrido e E. Aperti: posto barca, carrello, cantiere terra.
- Confronto dettagliato: `wiki/confronti/rimessaggio-abc.md`
- Lead cantieri Anzio/Nettuno in raw/mercato.

## [2026-08-04] preferenze | Zona = litorale laziale

- Base: Ardea/Pomezia. Hub: Anzio, Circeo, Fiumicino. Mare (non lago).
- Open: rimessaggio. Wiki: gruppo, mercato/litorale-laziale, intervista.

## [2026-08-04] ricerca | Rimessaggio litorale laziale

- Anzio: gestione comunale post Capo d’Anzio; bandi posti; PDF tariffe 2026 scaricati ma **€ non stampati** nelle celle.
- Framework opzioni A–E (posto / boe / terra / carrello / ibrido) in `raw/mercato/litorale-laziale-rimessaggio-2026-08-04.md`.
- Da fare: telefonate listini Anzio/Nettuno/Fiumicino/Circeo + scivoli carrello.

## [2026-08-04] ricerca | Limiti senza patente IT

- Fonti: MIT https://www.mit.gov.it/node/2658 → `raw/normativa/mit-conseguimento-patente-nautica-2026-08-04.md`
- Secondarie: farevela, passionemare, in3giorni → `raw/normativa/note-secondarie-patente-2026-08-04.md`
- Wiki: `wiki/normativa/limiti-senza-patente.md`
- Takeaway: no-patente ≈ ≤30 kW (40,8 CV) + cilindrate + entro 6 miglia; vincolo forte vs 6 pax/performante.

## [2026-08-04] preferenze | Avvio intervista requisiti

- Iniziata raccolta requisiti one-question-at-a-time con ricerca web per punto.
- Pagina tracking: `wiki/preferenze/intervista-requisiti.md`

## [2026-08-04] setup | Bootstrap progetto

- Installati graphify (skill OpenCode project-scoped), superpowers (plugin), pattern LLM Wiki (skill + schema AGENTS.md).
- Creata struttura `raw/` + `wiki/` seed.
- Obiettivo: barca a motore piccola, usabile anche senza patente, pesca e divertimento per le bestie (tu, Antonio, Peppe), ideale fino a 6 persone.
- Preferenze dettagliate ancora da raccogliere in chat successive.
- Fonte pattern salvata in `raw/manuali/karpathy-llm-wiki.md`.
- Grafo iniziale `graphify-out/` (bootstrap AST; si arricchirà con `/graphify .` quando la wiki cresce).

## [2026-08-07] build | Sezione Accessori (Subito + eBay)

- Nuovo tab **Accessori** in annunci.html, doppia fonte: Subito (hades) + eBay (Browse API).
- `scoring-accessori.mjs`: formula score = 20 + peso tipologia + bonus prezzo (ratio vs ref_new) + condizione + marca + trasporto + compatibilità; fit alto ≥65 / medio ≥45 / stretch >cap / basso.
- Tabella 22 tipologie con ref_new e cap da ricerca mercato: `wiki/concetti/feed-accessori-scoring.md`.
- `fetch-accessori.mjs`: scrive `presentazione/public/data/accessori.json` (fuso, tag source). eBay in try/catch: senza chiavi o errore esce solo Subito.
- Workflow pages.yml: step fetch-accessori con secrets EBAY_CLIENT_ID/SECRET (continue-on-error).
- Test locale: feed Subito ok (60 item, barche intere escluse). eBay: **404 Browse API** — app nel portale eBay senza scope buy (invalid_scope). Da abilitare Browse API sull'app (vedi open question).
- Deploy: push → GitHub Pages.

## [2026-08-07] debug | eBay Browse 404 — causa confermata

- Riprodotto in locale con le chiavi reali: token scope generico → 200; supporto `buy.browse.readonly` → 400 invalid_scope; Browse search → 404 errorId 2002.
- Causa: app keyset creata come Sell/Commerce, senza Buy API (nessuno scope `buy.*` concesso).
- Fix ipotizzato: portale → abilitare Buy APIs. **Errato**: il portale non permette di modificare la lista degli scope (è fissa).
- Verità (fonti: Cleo support, mfalkus/ebay-bargains, hendt/ebay-api #99): la pagina OAuth scopes di `developer.ebay.com/my/keys` è **read-only**; gli scope sono assegnati al keyset quando viene creato. Per avere Buy/Browse: creare nuova app/keyset con Buy APIs, oppure contattare eBay developer support.
- Nessuna modifica al codice: `EBAY_SCOPE` resta `api_scope` (lo scope generico basta per `item_summary/search` quando il keyset ha la Buy API).

## [2026-08-08] feat(access) | Revamp v2 completato

- Rinazione completa eBay (fetch+UI+workflow+.env.ebay)
- Automatismo ref_new: mediana prezzi Subito condizione "nuovo" 2x/giorno (update-accessori-ref.mjs → ref-prezzi.json)
- Scoring addolcito: 27 tipologie, 5 destinazioni, cap=ref×2, Lazio+5, niente penalità distanza
- UI: icona Accessori stessa riga (fix grid 3+1), accessori.html dedicato con filtri destinazione/tipologia
- Fix collaterali: gommoni hardMax 1500, regex rimorchio, scanned_unique da null a numero
- Commits: cd76edf 9c2d7ae 640a5f9 fc3c398 c995b64
