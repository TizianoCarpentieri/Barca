# AGENTS.md — Progetto Barca (Le Bestie)

Schema operativo per l'agente: ricerca, raccolta info e aggiornamento preferenze
per l'acquisto di una barca a motore tra amici (le bestie).

## Obiettivo

Trovare e scegliere una **barca a motore piccola**, usabile anche **senza patente**
(nei limiti di legge italiani), abbastanza performante e grande per:

- divertimento e **battute di pesca** insieme: **tu, Antonio, Peppe** (core team = 3)
- uscite con amici fino a **~6 persone** (ideale)
- costi e manutenzione sostenibili per un gruppo di amici

Questo repo è una **knowledge base persistente** (pattern LLM Wiki + knowledge graph).
La conoscenza si accumula e si aggiorna; non si riscopre da zero a ogni chat.

---

## Stack strumenti (obbligatorio)

| Tool | Ruolo | Quando |
|------|--------|--------|
| **Superpowers** | Metodologia: brainstorming, piani, verifica, skill workflow | Prima di decisioni strutturali, piani di ricerca, confronti finali |
| **LLM Wiki** (`wiki/`) | Knowledge base compilata e mantenuta dall'agente | Sempre: ingest, query, lint, preferenze |
| **Graphify** | Grafo navigabile su tutto il corpus (wiki + raw + docs) | Domande di navigazione, connessioni, `/graphify` |

### Superpowers

- All'inizio di task non banali: carica la skill rilevante (`brainstorming`, `writing-plans`, `systematic-debugging`, ecc.).
- Non saltare direttamente a conclusioni: raffina requisiti, esplora alternative, verifica con evidenze dalla wiki.
- Per confronti decisionali: brainstorming → piano di ricerca → esecuzione → sintesi in wiki.

### Graphify

Quando l'utente digita `/graphify`, usa la skill installata in `.opencode/skills/graphify/`.

Regole:
- Per domande sul corpus/progetto, se esiste `graphify-out/graph.json`, prima:
  `graphify query "<domanda>"`, oppure `graphify path "A" "B"`, oppure `graphify explain "<concetto>"`.
- Se esiste `graphify-out/wiki/index.md` o `wiki/index.md`, usali per navigazione ampia.
- `graphify-out/GRAPH_REPORT.md` solo per overview architetturale o se query/path/explain non bastano.
- Dopo modifiche sostanziali a file del progetto: `graphify update .` (AST-only, no API cost).
- File dirty in `graphify-out/` dopo hook/update sono normali: non sono motivo per saltare graphify.

### LLM Wiki (pattern Karpathy)

Tre layer:

1. **`raw/`** — fonti immutabili (annunci, PDF, articoli, screenshot, note). L'agente **legge**, non modifica.
2. **`wiki/`** — markdown generato e mantenuto dall'agente. L'umano legge; l'agente scrive.
3. **Questo file (`AGENTS.md`)** — schema, convenzioni, workflow. Co-evolve con il progetto.

Operazioni: **ingest** · **query** · **lint** · **preferenze** (vedi skill `llm-wiki` e sezioni sotto).

---

## Struttura directory

```
Barca/
├── AGENTS.md                 # questo schema
├── raw/                      # FONTI IMMUTABILI
│   ├── assets/               # immagini, allegati
│   ├── annunci/              # salvataggi annunci (md/html/pdf/png)
│   ├── normativa/            # testi legge, guide ufficiali
│   └── manuali/              # brochure, schede tecniche
├── wiki/                     # KNOWLEDGE BASE (agente scrive)
│   ├── index.md              # catalogo di tutte le pagine
│   ├── log.md                # diario append-only
│   ├── overview.md           # stato attuale della ricerca
│   ├── preferenze/
│   │   ├── gruppo.md         # chi siamo, vincoli condivisi
│   │   ├── must-have.md      # requisiti non negoziabili
│   │   ├── nice-to-have.md   # desiderata
│   │   ├── budget.md         # range e split costi
│   │   └── open-questions.md # cose da chiarire ancora
│   ├── normativa/            # patente, limiti potenza/lunghezza, immatricolazione…
│   ├── concetti/             # scafo, motore, pesca, rimessaggio…
│   ├── modelli/              # una pagina per modello/marca valutato
│   ├── confronti/            # tabelle e analisi side-by-side
│   ├── mercato/              # zone, dealer, usati, prezzi osservati
│   └── sintesi/              # decisioni, shortlist, next steps
├── graphify-out/             # output grafo (generato)
└── .opencode/                # skill, plugin, config
```

### Convenzioni file wiki

- Markdown con wikilink Obsidian-style dove utile: `[[nome-pagina]]`.
- Frontmatter YAML opzionale ma consigliato:

```yaml
---
title: Nome
type: modello | normativa | preferenza | confronto | concetto | sintesi | fonte
updated: YYYY-MM-DD
status: draft | active | deprecated | decided
tags: [pesca, no-patente, ...]
sources: [raw/...]
---
```

- Nomi file: `kebab-case.md` in italiano o misto chiaro (`ranieri-shadow-22.md`, `limiti-senza-patente.md`).
- Citare sempre la provenienza: path in `raw/` o URL + data di accesso.
- Se un fatto nuovo **contraddice** uno vecchio: aggiorna la pagina, marca il claim superato, logga in `log.md`.

---

## Preferenze note (seed — aggiornare appena emergono dettagli)

Verità di dettaglio: `wiki/preferenze/*`, `wiki/overview.md`, `wiki/sintesi/requisiti-v1.md`.

### Gruppo
- **Core:** tu + Antonio + Peppe ("le bestie")
- **Base:** Ardea/Pomezia — mare laziale (Anzio/Circeo/Fiumicino)
- **Capacità target:** 3 comodi per pesca; ideale fino a **6** per uscite sociali
- **Patente:** nessuno; ideale restare no-patente (≤40,8 CV)
- **Budget:** acquisto ≤4.500 € (rigidi); gestione ≤1.200 €/testa/anno

### Dual track (2026-08-05)
1. **Rigide** — gozzo/open/lancia; no gommone su questo track; no carrello; tendalino
2. **Gommoni** — pneumatici no RIB; 3,3–3,9 m; Al floor / airdeck; ref **Argo-Evo 360** 970 € (−20% usato senza motore)
3. **Motori** — ≥6 CV (no 2.5/4); sweet 9.9–15; max 40,8; 4T gambo corto

Feed live: `presentazione/annunci.html` tab Rigide|Gommoni|Motori. Scoring: distanza da Lazio + regole track (`wiki/concetti/feed-annunci-scoring.md`).

### Ancora da definire (`wiki/preferenze/open-questions.md`)
- Split costi; rimessaggio A vs C con numeri; scelta track vincente; tetto bundle gommone+motore; intestazione

**Regola d'oro:** ogni preferenza espressa in chat va scritta in `wiki/preferenze/` nella stessa sessione. Niente "me lo ricordo dopo".

---

## Workflow

### 1. Ingest (nuova fonte)

Trigger: "ingerisci …", file droppato in `raw/`, link da salvare, annuncio trovato.

1. Copia/salva la fonte in `raw/` (sotto-cartella appropriata). Non alterare il contenuto originale.
2. Leggi la fonte; estrai fatti rilevanti per l'obiettivo barca.
3. Scrivi o aggiorna:
   - pagina sintesi fonte se utile (`wiki/` o nota in pagina modello)
   - pagine `modelli/`, `normativa/`, `mercato/`, `concetti/` toccate
   - `wiki/index.md`
   - append in `wiki/log.md`: `## [YYYY-MM-DD] ingest | <titolo>`
4. Se emerge una preferenza del gruppo → aggiorna `wiki/preferenze/`.
5. Opzionale: `graphify update .` o `/graphify add <url>` se la fonte è esterna e va nel grafo.

### 2. Query (domanda)

1. Leggi `wiki/index.md` (e se c'è grafo: `graphify query "…"`).
2. Apri solo le pagine rilevanti; rispondi con **citazioni** (path wiki/raw).
3. Se la risposta è un confronto o una decisione utile → **archiviala** in `wiki/confronti/` o `wiki/sintesi/` e aggiorna index + log.
4. Non basarti solo sulla memoria di chat: la wiki è la verità di progetto.

### 3. Preferenze (update)

Trigger: "preferiamo…", "budget max…", "no cabina…", feedback di Antonio/Peppe.

1. Aggiorna il file giusto in `wiki/preferenze/`.
2. Propaga l'impatto: shortlist, must-have, open-questions.
3. Log: `## [YYYY-MM-DD] preferenze | <cosa è cambiato>`
4. Se qualcosa diventa deciso → sposta/riassumi in `wiki/sintesi/`.

### 4. Lint (salute wiki)

Trigger: "lint", "fai un check", periodico ogni ~5–10 ingest, o prima di una decisione d'acquisto.

Controlla:
- contraddizioni tra pagine
- claim normativi senza fonte in `raw/` o URL ufficiale
- orphan pages (nessun link in entrata)
- concetti citati senza pagina
- open-questions stantie
- shortlist non allineata alle preferenze aggiornate

Poi: fix, log `## [YYYY-MM-DD] lint | …`, suggerisci prossime ricerche.

### 5. Ricerca attiva (web)

Quando servono dati freschi (prezzi, normativa, modelli):
1. Cerca e verifica; preferisci fonti ufficiali per la legge.
2. Salva estratti/link in `raw/`.
3. Integra via workflow **ingest**.
4. Non lasciare conclusioni solo in chat.

### 6. Decisione / shortlist

1. Skill superpowers `brainstorming` se i criteri non sono stabili.
2. Aggiorna `wiki/sintesi/shortlist.md` e `wiki/confronti/`.
3. Ogni candidato: pro/contro vs must-have, fit pesca, fit 6 pax, no-patente, costo totale di possesso.
4. Esplicita cosa manca per decidere.

---

## Comandi utente (scorciatoie conversazionali)

| Frase | Azione agente |
|-------|----------------|
| `ingest <path\|url>` | Workflow ingest |
| `preferenza: …` / `update preferenze` | Scrivi in wiki/preferenze |
| `query: …` / domanda libera sul progetto | Query su wiki (+ graphify se utile) |
| `lint` | Health-check wiki |
| `shortlist` | Mostra/aggiorna sintesi shortlist |
| `status` | Riassunto da overview + preferenze + open questions |
| `/graphify …` | Skill graphify |
| `ricerca: …` | Web research → raw → ingest |

---

## Principi

1. **Compounding knowledge** — ogni sessione lascia la wiki più ricca.
2. **Fonti prima delle opinioni** — normativa e prezzi con provenance.
3. **Preferenze sempre scritte** — chat volatile; `wiki/preferenze/` no.
4. **No invenzioni legali** — limiti senza patente e regole di navigazione da fonti verificabili; se incerto, marca `status: unverified` e apri open-question.
5. **Gruppo al centro** — decisioni pensate per 3 bestie + fino a 6.
6. **Costo totale** — non solo prezzo scafo: motore, carrello, rimessaggio, assicurazione, manutenzione, carburante.
7. **Italiano** — wiki e risposte in italiano, salvo nomi tecnici/modelli.

---

## Bootstrap nuova sessione

All'avvio di un task sul progetto:
1. Leggi `wiki/overview.md` e `wiki/index.md` (se esistono).
2. Scorri le ultime voci di `wiki/log.md`.
3. Tieni a mente `wiki/preferenze/*` e open-questions.
4. Poi opera (ingest/query/ricerca/decisione).

Se la wiki è vuota o incompleta: crea/ripara le pagine seed, non chiedere all'utente di farlo a mano.
