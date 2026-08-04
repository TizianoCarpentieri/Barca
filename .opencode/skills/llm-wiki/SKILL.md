---
name: llm-wiki
description: "Use when ingesting sources, updating preferences, querying the boat knowledge base, linting the wiki, or maintaining wiki/ and raw/ for the Barca research project. Implements Karpathy LLM Wiki pattern: persistent compounding markdown knowledge base."
---

# LLM Wiki — Progetto Barca

Pattern: fonti immutabili in `raw/` + wiki compilata in `wiki/` + schema in `AGENTS.md`.

L'agente **scrive e mantiene** la wiki. L'umano cura le fonti e fa le domande giuste.

## Quando attivare

- Ingest di annunci, articoli, PDF, note
- Aggiornamento preferenze del gruppo
- Domande su modelli, normativa, budget, confronti
- `lint`, `status`, `shortlist`
- Qualsiasi lavoro che debba restare nel tempo oltre la chat

## Prima di tutto

1. Leggi `wiki/index.md` e `wiki/overview.md`
2. Ultime righe di `wiki/log.md`
3. Preferenze in `wiki/preferenze/`

## Ingest

```
1. Salva fonte in raw/<sottocartella>/ (non modificare l'originale)
2. Estrai fatti utili all'acquisto barca
3. Aggiorna/crea pagine wiki collegate (modelli, normativa, mercato, concetti)
4. Aggiorna wiki/index.md
5. Append log: ## [YYYY-MM-DD] ingest | Titolo
6. Se tocca gusti/vincoli del gruppo → wiki/preferenze/
```

Una fonte può toccare molte pagine: fallo in un passaggio solo.

## Query

```
1. index.md → seleziona pagine
2. (opzionale) graphify query "..."
3. Rispondi con citazioni path
4. Se l'output è riusabile → file in wiki/confronti/ o wiki/sintesi/ + index + log
```

## Preferenze

```
1. Scrivi subito in wiki/preferenze/ (must-have, nice-to-have, budget, gruppo, open-questions)
2. Riallinea shortlist/sintesi se necessario
3. Log: ## [YYYY-MM-DD] preferenze | cambiamento
```

## Lint

Cerca: contraddizioni, claim senza fonte, orphan, concetti senza pagina, open-questions vecchie, shortlist disallineata.
Fix + log `## [YYYY-MM-DD] lint | ...` + suggerimenti di ricerca.

## Formato pagine

- `kebab-case.md`, frontmatter `title/type/updated/status/tags/sources`
- Link `[[pagina]]` tra concetti correlati
- Provenance obbligatoria su fatti normativi e prezzi

## Non fare

- Non modificare `raw/` dopo il salvataggio
- Non lasciare decisioni solo in chat
- Non inventare limiti di legge o prezzi
- Non creare pagine duplicate: aggiorna quelle esistenti
