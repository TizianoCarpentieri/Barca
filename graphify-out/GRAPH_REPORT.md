# Graph Report - barca  (2026-08-09)

## Corpus Check
- 81 files · ~134,494 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 870 nodes · 990 edges · 104 communities (79 shown, 25 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1b115cb4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- fetch-motori.mjs
- annunci.js
- B — Carrello a casa / box (trailer) — **ESCLUSA**
- fetch-accessori.mjs
- What You Must Do When Invoked
- Log — Progetto Barca
- AGENTS.md — Progetto Barca (Le Bestie)
- fetch-gommoni.mjs
- app.js
- index.js
- Risposte grezze
- scripts
- Track A - Rigide
- Ricerca mercato — litorale laziale (base Ardea/Pomezia)
- Split costi e danni
- Montaggio e logistica gommone
- Motore fuoribordo 9.9-15 CV
- Indice wiki
- Budget
- Progetto Barca
- Hook | Tutte le 22 esistenti: cap = ref_new × 2
- 2. Cambi vs v1
- Requisiti v1 — Le Bestie
- Setup
- Conversazioni audio 2026-08-09
- Argo-Evo 360 AL
- Priorità d'uso e nice-to-have
- Temi principali
- worker/package.json
- Feed Subito live
- Requisiti v1 (intervista)
- opencode.json
- LLM Wiki — Progetto Barca
- LLM Wiki
- Feed accessori — design approvato (2026-08-07)
- Feed annunci Subito — logica di scoring
- Indice wiki — Progetto Barca
- No-patente + 6 pax — cosa è realistico
- graphify reference: extra exports and benchmark
- No-patente + fino a 6 persone — inviluppo realistico
- Mercato usato — tetto ~4.500 € (sample Subito 2026-08-04)
- Open questions
- Gruppo — Le Bestie
- Feed accessori — design e scoring
- Frontend Design
- Progetto Barca — Presentazione
- Pesca da barca piccola — contesto Bestie
- Tendalino e copertura sole (barca piccola)
- Litorale laziale — base Bestie
- Argo-Evo 360 AL — riferimento gommone
- Track parallelo — Gommoni pneumatici
- Litorale laziale (base operativa)
- TCO 3600€/anno totale
- Pesca da barca piccola (no-patente)
- Track B - Gommoni
- Lunghezza min 3.30 m
- graphify reference: query, path, explain
- Argo-Evo 360 AL — Reference product (new)
- Fonte: MIT — Conseguimento patente nautica
- Feed Subito live (presentazione)
- Must-have (non negoziabili)
- Track parallelo — Motori fuoribordo
- Mare Tirreno Laziale
- Feed annunci e scoring
- Note traino rimorchio — patente B (IT)
- Note secondarie — patente nautica (non ufficiali)
- Limiti navigazione senza patente (IT)
- Shortlist candidati
- Tendalino / copertura sole
- Nice-to-have e priorità d'uso
- Track motori (parallelo)
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Intervista — patente nautica (risposta grezza)
- index.md
- graphify.js
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- Sample Subito — pacchetti scafo+motore
- extraction-spec.md
- patch-head.mjs
- cantieri-anzio-nettuno-paginegialle-2026-08-04.md
- raw/README.md
- Bagno relax
- Capienza min 4 persone
- Carrello escluso
- Fit label alto/medio/basso/stretch
- Giri costa
- Honda Marine
- Limiti cilindrata per tipo motore
- Lunghezza ideale 3.50-3.80 m
- Mercury
- Range 6-40.8 CV
- Riserva lavori post-acquisto 500-1500€
- Surfcasting
- Suzuki
- Tohatsu
- Traina leggera
- Yamaha

## God Nodes (most connected - your core abstractions)
1. `Log — Progetto Barca` - 26 edges
2. `Argo-Evo 360 AL` - 25 edges
3. `Indice wiki` - 17 edges
4. `Requisiti v1 (intervista)` - 17 edges
5. `fetch()` - 13 edges
6. `What You Must Do When Invoked` - 12 edges
7. `Risposte grezze` - 12 edges
8. `Open questions` - 12 edges
9. `Split costi e danni` - 12 edges
10. `/graphify` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Progetto Barca` --aspires_to--> `Fino a 6 persone picco sociale`  [EXTRACTED]
  wiki/index.md → wiki/preferenze/must-have.md
- `Progetto Barca` --activity--> `Pesca invernale`  [EXTRACTED]
  wiki/index.md → wiki/sintesi/conversazioni-audio-20260809.md
- `Argo-Evo 360 AL` --compatible_with--> `Sweet spot 9.9-15 CV`  [EXTRACTED]
  wiki/modelli/argo-evo-360.md → wiki/preferenze/track-motori.md
- `classify()` --calls--> `applyDistanceScore()`  [EXTRACTED]
  presentazione/scripts/fetch-gommoni.mjs → presentazione/scripts/geo-score.mjs
- `Indice wiki` --references--> `Montaggio e logistica gommone`  [EXTRACTED]
  wiki/index.md → wiki/concetti/montaggio-gommone.md

## Import Cycles
- None detected.

## Communities (104 total, 25 thin omitted)

### Community 0 - "fetch-motori.mjs"
Cohesion: 0.09
Nodes (35): classify(), __dirname, extractCv(), extractLength(), feat(), HEADERS, imgUrl(), main() (+27 more)

### Community 1 - "annunci.js"
Cohesion: 0.11
Nodes (27): applyData(), applyFilter(), candidatesFor(), card(), catsEl, distanceFactor(), emptyEl, errEl (+19 more)

### Community 2 - "B — Carrello a casa / box (trailer) — **ESCLUSA**"
Cohesion: 0.07
Nodes (29): A — Posto barca fisso in porto (acqua), B — Carrello a casa / box (trailer) — **ESCLUSA**, B — dettaglio archiviato, C — Rimessaggio a terra in cantiere, Cantieri segnalati (Pagine Gialle, non preventivi), Come funziona da voi, Come funziona da voi, Come funziona da voi (+21 more)

### Community 3 - "fetch-accessori.mjs"
Cohesion: 0.12
Nodes (26): __dirname, feat(), fetchSubito(), main(), normalizeSubito(), OUT, QUERIES, RAW_OUT (+18 more)

### Community 4 - "What You Must Do When Invoked"
Cohesion: 0.07
Nodes (26): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+18 more)

### Community 5 - "Log — Progetto Barca"
Cohesion: 0.08
Nodes (26): [2026-08-04] preferenze | Avvio intervista requisiti, [2026-08-04] preferenze | Budget ≤4500€ solo usato, [2026-08-04] preferenze | Cap gestione 1200€/testa/anno, [2026-08-04] preferenze | Frequenza moderata, [2026-08-04] preferenze | No gommone; scafo rigido + tendalino, [2026-08-04] preferenze | No patente (ideale), [2026-08-04] preferenze | No traino/carrello, [2026-08-04] preferenze | Priorità: pesca > giri > bagno > facilità (+18 more)

### Community 6 - "AGENTS.md — Progetto Barca (Le Bestie)"
Cohesion: 0.09
Nodes (22): 1. Ingest (nuova fonte), 2. Query (domanda), 3. Preferenze (update), 4. Lint (salute wiki), 5. Ricerca attiva (web), 6. Decisione / shortlist, AGENTS.md — Progetto Barca (Le Bestie), Ancora da definire (`wiki/preferenze/open-questions.md`) (+14 more)

### Community 7 - "fetch-gommoni.mjs"
Cohesion: 0.17
Nodes (20): classify(), __dirname, extractCv(), extractFloor(), extractKeel(), extractLength(), extractPersons(), feat() (+12 more)

### Community 8 - "app.js"
Cohesion: 0.12
Nodes (15): barIo, countIo, path, revealEls, sheet, splash, icons, mountNav() (+7 more)

### Community 9 - "index.js"
Cohesion: 0.23
Nodes (19): addMemory(), bfsFrom(), buildMessages(), callDeepSeek(), DEBUG_BUFFER, extractMemoryIfNeeded(), fetch(), findNodes() (+11 more)

### Community 10 - "Risposte grezze"
Cohesion: 0.11
Nodes (18): #intervista, #requisiti, Intervista requisiti, 2026-08-04 — Budget, 2026-08-04 — Frequenza, 2026-08-04 — Gestione annua, 2026-08-04 — Intestazione, 2026-08-04 — Patente (+10 more)

### Community 11 - "scripts"
Cohesion: 0.12
Nodes (16): devDependencies, vite, name, private, scripts, build, dev, fetch-accessori (+8 more)

### Community 12 - "Track A - Rigide"
Cohesion: 0.13
Nodes (16): Anzio, #anzio, Canone ormeggio 800-2000€/anno, #cantiere, Cantiere a terra (Opzione C), #carrello, Confronto rimessaggio A/B/C, Lancia VTR (+8 more)

### Community 13 - "Ricerca mercato — litorale laziale (base Ardea/Pomezia)"
Cohesion: 0.12
Nodes (15): Altri hub (ricerca parziale — da approfondire), Caratteristiche operative (schede secondarie), Contesto geografico (dichiarato utente), Costa “aperta” Torvaianica / Lavinio / Lido dei Pini, Fiumicino, Fonti, Gestione, Modelli di “dove tenere la barca” (framework) (+7 more)

### Community 14 - "Split costi e danni"
Cohesion: 0.14
Nodes (14): #accordo, #budget, #danni, #regole, #split, Accordo scritto, Acquisto — split 1/3, Casi specifici (+6 more)

### Community 15 - "Montaggio e logistica gommone"
Cohesion: 0.14
Nodes (13): #fatica, #gommone, #logistica, #montaggio, Arrivo in spiaggia/scivolo, Ciclo completo di un'uscita, Confronto con scafo rigido, Criticità (+5 more)

### Community 16 - "Motore fuoribordo 9.9-15 CV"
Cohesion: 0.15
Nodes (13): #argo, #benchmark, #dual-track, Gambo corto, #gommone, #gommone, Motore fuoribordo 9.9-15 CV, #pesca (+5 more)

### Community 17 - "Indice wiki"
Cohesion: 0.18
Nodes (13): Bimini aftermarket 150-600€, Bolentino, Entro 6 miglia dalla costa, Fino a 6 persone picco sociale, Indice wiki, Limite 40.8 CV (30 kW), MIT - Ministero Infrastrutture e Trasporti, No patente nautica (+5 more)

### Community 18 - "Budget"
Cohesion: 0.15
Nodes (13): #tco, #usato, Acquisto (intervista 2026-08-04), Budget, Cosa **non** è nel tetto mezzo ma **sì** nel tetto annuo, Gestione annua (intervista 2026-08-04), Modello TCO grezzo (da validare con preventivi), Open (+5 more)

### Community 19 - "Progetto Barca"
Cohesion: 0.20
Nodes (12): 3 persone comode pesca, Accordo scritto danni/split, Antonio, Le Bestie, #mit, #no-patente, #patente, Peppe (+4 more)

### Community 20 - "Hook | Tutte le 22 esistenti: cap = ref_new × 2"
Cohesion: 0.17
Nodes (11): Accessori Revamp v2 Implementation Plan, Global Constraints, Hook | Tutte le 22 esistenti: cap = ref_new × 2, Task 1: Rimuovere il blocco eBay da `fetch-accessori.mjs`, Task 2: Nuovo `update-accessori-ref.mjs` (ref automatico mediana Subito "nuovo"), Task 3: Aggiornare `scoring-accessori.mjs` (27 tipologie + destinazioni + scoring addolcito), Task 4: Fetch legge `ref-prezzi.json` e item con `dest`, Task 5: UI — tab row con icona + tweak main.css (+3 more)

### Community 21 - "2. Cambi vs v1"
Cohesion: 0.17
Nodes (11): 1. Obiettivo, 2.1 Rimozione eBay (completa), 2.2 ref automatico (mediana prezzi Subito "nuovo"), 2.3 Scoring addolcito, 2.4 Tipologie e destinazioni, 2.5 UI, 2.6 Workflow CI, 2. Cambi vs v1 (+3 more)

### Community 22 - "Requisiti v1 — Le Bestie"
Cohesion: 0.17
Nodes (11): Chi e dove, Filtri shortlist — track gommoni (parallelo), Filtri shortlist — track motori, Filtri shortlist — track rigidi (go / no-go), Mezzo, Pagine collegate, Plus forti in annuncio, Possesso e costi (+3 more)

### Community 23 - "Setup"
Cohesion: 0.17
Nodes (11): 1. Crea KV namespace, 2. Imposta il secret DeepSeek, 3. Configura ALLOWED_ORIGIN, 4. Aggiorna l'URL nel frontend, 5. Deploy, 6. Test, Aggiornare il grafo, Comandi speciali in chat (+3 more)

### Community 24 - "Conversazioni audio 2026-08-09"
Cohesion: 0.20
Nodes (11): #audio, #bestie, #conversazioni, Conversazioni audio 2026-08-09, Danno da errore conducente → paga conducente, Danno imprevedibile → tutti insieme, Scafo rigido preferito per praticità, Uscita socio → rimborso quota (+3 more)

### Community 25 - "Argo-Evo 360 AL"
Cohesion: 0.18
Nodes (11): Capienza 5 persone, Chiglia gonfiabile, Garanzia 3 anni, Gommone pneumatico non RIB, Lunghezza 3.60 m, Motore max 20 HP, Pavimento alluminio, Peso 68 kg (+3 more)

### Community 26 - "Priorità d'uso e nice-to-have"
Cohesion: 0.18
Nodes (10): Core vs sociale, Da bagno/relax (3°), Da priorità giri costa, Da priorità pesca a canna, Dual track (2026-08-05), Facilità (4° — esplicitamente bassa), Impatto sulla barca (fascia ≤4.500 €), Nice-to-have tecnici (non bloccanti) (+2 more)

### Community 27 - "Temi principali"
Cohesion: 0.18
Nodes (10): 1. Costi fissi e split (Tiziano ~12:09), 2. Dibattito gommone vs scafo rigido (12:43–12:47), 3. Costi assicurazione (12:50), 4. Ormeggio (12:50–12:52), 5. Uso invernale (12:47), 6. Barche valutate (18:40–18:54), 7. Regole danni e split (19:44–20:00), Conversazioni WhatsApp — 9 Agosto 2026 (+2 more)

### Community 28 - "worker/package.json"
Cohesion: 0.18
Nodes (10): devDependencies, wrangler, name, private, scripts, deploy, dev, type (+2 more)

### Community 29 - "Feed Subito live"
Cohesion: 0.22
Nodes (10): #automazione, Fattore Puglia x1.20, Fattore Sicilia x1.30, Feed annunci Subito, Geo-score distanza Lazio, #pages, #stato, #subito (+2 more)

### Community 30 - "Requisiti v1 (intervista)"
Cohesion: 0.20
Nodes (10): #budget, Budget motore ≤1200€, Mercato usato ≤4500€, #requisiti, #shortlist-filtri, Solo usato, #subito, #usato (+2 more)

### Community 31 - "opencode.json"
Cohesion: 0.20
Nodes (9): instructions, plugin, $schema, skills, paths, AGENTS.md, .opencode/plugins/graphify.js, .opencode/skills (+1 more)

### Community 32 - "LLM Wiki — Progetto Barca"
Cohesion: 0.20
Nodes (9): Formato pagine, Ingest, Lint, LLM Wiki — Progetto Barca, Non fare, Preferenze, Prima di tutto, Quando attivare (+1 more)

### Community 33 - "LLM Wiki"
Cohesion: 0.20
Nodes (9): Architecture, Indexing and logging, LLM Wiki, Note, Operations, Optional: CLI tools, The core idea, Tips and tricks (+1 more)

### Community 34 - "Feed accessori — design approvato (2026-08-07)"
Cohesion: 0.20
Nodes (9): Architettura, Architettura v2, Cambi vs v1, eBay — note tecniche, Feed accessori — design approvato (2026-08-07), Formula score, REVAMP v2 (2026-08-08, in implementazione), Status (+1 more)

### Community 35 - "Feed annunci Subito — logica di scoring"
Cohesion: 0.20
Nodes (9): Base operativa (punto X), Fattore distanza (`geo-score.mjs`), Feed annunci Subito — logica di scoring, Fit labels, Nota, Regola −20% vs nuovo, Track gommoni, Track motori (+1 more)

### Community 36 - "Indice wiki — Progetto Barca"
Cohesion: 0.20
Nodes (10): Concetti, Confronti, Core, Indice wiki — Progetto Barca, Mercato, Modelli / reference, Normativa, Preferenze (+2 more)

### Community 37 - "No-patente + 6 pax — cosa è realistico"
Cohesion: 0.22
Nodes (9): #6-pax, #bestie, #fisica, #lazio, #no-patente, No-patente + 6 pax — cosa è realistico, #prestazioni, Gruppo (+1 more)

### Community 38 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 39 - "No-patente + fino a 6 persone — inviluppo realistico"
Cohesion: 0.22
Nodes (8): Aperto ricerca, Fisica grezza (ragionamento tecnico, non prova in mare), No-patente + fino a 6 persone — inviluppo realistico, Omologazione vs comfort, Preferenza gruppo (2026-08-04), Tipologie che restano in gioco (shortlist concettuale), Trade-off esplicito accettato, Vincolo legale (verificato MIT)

### Community 40 - "Mercato usato — tetto ~4.500 € (sample Subito 2026-08-04)"
Cohesion: 0.22
Nodes (8): Cosa si trova davvero a ≤4.500 €, Mercato usato — tetto ~4.500 € (sample Subito 2026-08-04), Metodo, Numeri campione, Prossimi passi mercato, Reality check vs obiettivo Bestie, Regole d’acquisto in questa fascia, Segnali Lazio (stesso snapshot — verificare online)

### Community 41 - "Open questions"
Cohesion: 0.29
Nodes (8): #todo, [2026-08-07] Accessori — decisioni revamp (chiuse), [2026-08-07] eBay API — Browse non abilitata (diagnosi CONFERMATA in locale), Barca / gommone, Gruppo e uso, Logistica, Normativa / sicurezza, Open questions

### Community 42 - "Gruppo — Le Bestie"
Cohesion: 0.25
Nodes (8): Base operativa (intervista 2026-08-04), Core team, Frequenza uscite (intervista 2026-08-04), Gruppo — Le Bestie, Note, Patente nautica (2026-08-04), Timeline (intervista 2026-08-04), Uso tipico dichiarato

### Community 43 - "Feed accessori — design e scoring"
Cohesion: 0.29
Nodes (7): #accessori, #design, #ebay, #feed, Feed accessori — design e scoring, #scoring, #subito

### Community 44 - "Frontend Design"
Cohesion: 0.29
Nodes (6): Design principles, Frontend Design, Ground it in the subject, More on writing in design, Process: brainstorm, explore, plan, critique, build, critique again, Restraint and self-critique

### Community 45 - "Progetto Barca — Presentazione"
Cohesion: 0.29
Nodes (6): Action minima (opzionale), Build, Dev, GitHub Pages, Progetto Barca — Presentazione, Stack

### Community 46 - "Pesca da barca piccola — contesto Bestie"
Cohesion: 0.29
Nodes (6): Adattare le surfcasting a bordo, Cosa fate voi, Layout barca che aiuta (usato low budget), Link, Pesca da barca piccola — contesto Bestie, Tecniche tipiche su barca 4–5 m / ≤40 CV

### Community 47 - "Tendalino e copertura sole (barca piccola)"
Cohesion: 0.29
Nodes (6): Check in acquisto, Esigenza gruppo, Implicazione scelta scafo (no gommone), Opzioni pratiche in fascia usata low-cost, Tendalino e copertura sole (barca piccola), Vincoli pesca a canna

### Community 48 - "Litorale laziale — base Bestie"
Cohesion: 0.29
Nodes (6): Anzio (punto più vicino “vero porto”), Base dichiarata, Implicazioni scelta barca, Litorale laziale — base Bestie, Opzioni rimessaggio (aggiornato), To-do mercato

### Community 49 - "Argo-Evo 360 AL — riferimento gommone"
Cohesion: 0.29
Nodes (6): Argo-Evo 360 AL — riferimento gommone, Fonti, Motore abbinato (track parallelo), Perché è il reference, Regola di confronto usato, Scheda

### Community 50 - "Track parallelo — Gommoni pneumatici"
Cohesion: 0.29
Nodes (6): Feed automatico, Motore tipico, Reference prodotto, Specifiche tecniche, Tipo di mezzo (must track gommone), Track parallelo — Gommoni pneumatici

### Community 51 - "Litorale laziale (base operativa)"
Cohesion: 0.33
Nodes (6): #anzio, #circeo, #fiumicino, #lazio, #rimessaggio, Litorale laziale (base operativa)

### Community 52 - "TCO 3600€/anno totale"
Cohesion: 0.33
Nodes (6): Assicurazione RC 150-400€/anno, Carburante 200-500€/anno, Costi fissi 1800€/anno, Manutenzione 150-600€/anno, RC assicurazione 100-150€/anno, TCO 3600€/anno totale

### Community 53 - "Pesca da barca piccola (no-patente)"
Cohesion: 0.33
Nodes (6): #bolentino, #canne, Ecoscandaglio, #pesca, #surfcasting, Pesca da barca piccola (no-patente)

### Community 54 - "Track B - Gommoni"
Cohesion: 0.33
Nodes (6): Dual Track, Portata min 400 kg, Regola -20% usato vs nuovo, Smontabile trasportabile auto, Track B - Gommoni, USato gommone benchmark 776€

### Community 55 - "Lunghezza min 3.30 m"
Cohesion: 0.40
Nodes (6): Gozzo, Lunghezza min 3.30 m, #requisiti, Must-have, Shortlist, #shortlist

### Community 56 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 57 - "Argo-Evo 360 AL — Reference product (new)"
Cohesion: 0.33
Nodes (5): Argo-Evo 360 AL — Reference product (new), Logica di scoring suggerita (da utente), Note, Perché è il riferimento perfetto, Specifiche chiave (perfetto match con i nostri criteri gommoni)

### Community 58 - "Fonte: MIT — Conseguimento patente nautica"
Cohesion: 0.33
Nodes (5): Da verificare ancora (fonti primarie), Estratto rilevante (testo pagina, sintesi fedele), Età minime (senza patente, unità conducibili nei limiti), Fonte: MIT — Conseguimento patente nautica, Implicazioni per progetto Barca (note agente)

### Community 59 - "Feed Subito live (presentazione)"
Cohesion: 0.33
Nodes (6): Comandi locali, Documentazione logica, Feed Subito live (presentazione), Repo, Snapshot raw, URL

### Community 60 - "Must-have (non negoziabili)"
Cohesion: 0.33
Nodes (6): Must-have (non negoziabili), Nota patente, Track A — Scafi rigidi (requisiti v1), Track B — Gommoni pneumatici (parallelo, 2026-08-05), Track C — Motori (parallelo), Trasversali

### Community 61 - "Track parallelo — Motori fuoribordo"
Cohesion: 0.33
Nodes (5): Fascia potenza, Feed, Preferenze tecniche, Prezzo (filtri feed), Track parallelo — Motori fuoribordo

### Community 62 - "Mare Tirreno Laziale"
Cohesion: 0.40
Nodes (5): Ardea-Pomezia, Circeo, Fiumicino, Mare Tirreno Laziale, Nettuno

### Community 63 - "Feed annunci e scoring"
Cohesion: 0.40
Nodes (5): #distanza, Feed annunci e scoring, #feed, #scoring, #subito

### Community 64 - "Note traino rimorchio — patente B (IT)"
Cohesion: 0.40
Nodes (4): Da fare, Note traino rimorchio — patente B (IT), Sintesi (da validare su libretto del veicolo trainante), Status

### Community 65 - "Note secondarie — patente nautica (non ufficiali)"
Cohesion: 0.40
Nodes (4): farevela.net, in3giorni.com (aggregatore FAQ), Note secondarie — patente nautica (non ufficiali), passionemare.com

### Community 66 - "Limiti navigazione senza patente (IT)"
Cohesion: 0.40
Nodes (4): Aperto, Impatto sul progetto Bestie, Limiti navigazione senza patente (IT), Sintesi operativa (fonte primaria: MIT)

### Community 67 - "Shortlist candidati"
Cohesion: 0.40
Nodes (5): Criteri di ingresso shortlist “seria”, Shortlist candidati, Track A — Rigide, Track B — Gommoni, Track C — Motori (abbinamento)

### Community 68 - "Tendalino / copertura sole"
Cohesion: 0.50
Nodes (4): #bimini, #comfort, #tendalino, Tendalino / copertura sole

### Community 69 - "Nice-to-have e priorità d'uso"
Cohesion: 0.50
Nodes (4): #desiderata, #pesca, #priorita, Nice-to-have e priorità d'uso

### Community 70 - "Track motori (parallelo)"
Cohesion: 0.50
Nodes (4): #dual-track, #fuoribordo, #motore, Track motori (parallelo)

### Community 71 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 72 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 73 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 74 - "Intervista — patente nautica (risposta grezza)"
Cohesion: 0.50
Nodes (3): Dichiarazione, Interpretazione agente (da confermare se serve), Intervista — patente nautica (risposta grezza)

## Knowledge Gaps
- **559 isolated node(s):** `$schema`, `.opencode/plugins/graphify.js`, `superpowers@git+https://github.com/obra/superpowers.git`, `AGENTS.md`, `.opencode/skills` (+554 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **25 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Feed Subito live` connect `Feed Subito live` to `index.md`, `Motore fuoribordo 9.9-15 CV`, `Lunghezza min 3.30 m`, `Argo-Evo 360 AL`, `Feed Subito live (presentazione)`, `Requisiti v1 (intervista)`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Why does `Argo-Evo 360 AL` connect `Argo-Evo 360 AL` to `Nice-to-have e priorità d'uso`, `Track motori (parallelo)`, `Open questions`, `Motore fuoribordo 9.9-15 CV`, `Indice wiki`, `Track B - Gommoni`, `Lunghezza min 3.30 m`, `Feed Subito live`, `Requisiti v1 (intervista)`, `Feed annunci e scoring`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `Requisiti v1 (intervista)` connect `Requisiti v1 (intervista)` to `No-patente + 6 pax — cosa è realistico`, `Track A - Rigide`, `Motore fuoribordo 9.9-15 CV`, `Indice wiki`, `Progetto Barca`, `Pesca da barca piccola (no-patente)`, `Lunghezza min 3.30 m`, `Argo-Evo 360 AL`, `Feed Subito live`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **What connects `$schema`, `.opencode/plugins/graphify.js`, `superpowers@git+https://github.com/obra/superpowers.git` to the rest of the system?**
  _559 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `fetch-motori.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.09103840682788052 - nodes in this community are weakly interconnected._
- **Should `annunci.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11494252873563218 - nodes in this community are weakly interconnected._
- **Should `B — Carrello a casa / box (trailer) — **ESCLUSA**` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._