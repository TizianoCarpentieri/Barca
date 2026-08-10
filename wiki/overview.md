---
title: Overview
type: sintesi
updated: 2026-08-10
status: active
tags: [stato]
---

# Overview — ricerca barca

## In una frase

Le bestie (tu + Antonio + Peppe) cercano un **gommone pneumatico smontabile no-patente**, usato low-budget (≤2.000 € bundle), per **pesca e costa laziale** (base Ardea/Pomezia). Scafo rigido = scenario futuro con 5 soci.

## Direzione attuale (2026-08-10)

| Asse | Direzione |
|------|-----------|
| Mezzo primario | **Gommone pneumatico smontabile** (no RIB), trasportabile in auto |
| Scafo rigido | Desiderio, ma realistico solo con ≥5 soci e preventivi reali |
| Budget acquisto | **≤2.000 €** bundle gommone+motore usato |
| Costi fissi | **≤30 €/testa/mese** (90 €/mese totali) |
| Motore | ≥6 CV, sweet 9.9–15, max 40,8, 4T gambo corto |
| Reference | [[modelli/argo-evo-360]] a 970 € nuovo (benchmark scafo) |

UI unica: [Annunci live](https://tizianocarpentieri.github.io/Barca/annunci.html) (tab Rigide · Gommoni · Motori · Accessori).
Logica score: [[concetti/feed-annunci-scoring]] + [[concetti/feed-accessori-scoring]].

## Stato

| Area | Stato |
|------|--------|
| Setup tool (wiki, presentazione, Pages) | ✅ |
| Preferenze gruppo | ✅ |
| Nuova direzione gommone primario | ✅ (2026-08-10) |
| Zona operativa | ✅ mare laziale — Ardea/Pomezia → Anzio/Circeo/Fiumicino |
| Patente | ✅ nessuno; no-patente ≤40,8 CV |
| Normativa no-patente IT | 🟡 presente; tenere fonti aggiornate |
| Budget acquisto | ✅ ≤2.000 € bundle gommone+motore |
| Budget gestione | ✅ ≤30 €/testa/mese |
| Costi reali (manutenzione, passaggio, doc) | ⬜ [[concetti/costi-nascosti-gommone]] — da verificare |
| Logistica trasporto (auto, custodia) | ⬜ [[concetti/logistica-trasporto]] — da verificare |
| Accordo scritto bestie | ⬜ da redigere |
| Scenario rigido 5 soci | ⬜ [[sintesi/scenario-rigido-5-soci]] |
| Feed Subito automatico | ✅ 3 feed + geo-score + cron |
| Sbarco deep research v2 | ✅ produzione `2.0.1`; smoke rapido, deep e identità superati (2026-08-10) |
| Lint wiki automatico | ✅ `node scripts/lint-wiki.mjs` |
| Shortlist candidati | ⬜ da popolare dai feed |
| Visite/prove | ⬜ non iniziato |

## Prossimi passi consigliati

1. Verificare costi reali: passaggio proprietà, tagliando, assicurazione RC, dotazioni obbligatorie.
2. Chiarire logistica: chi ha auto adatta, chi tiene il gommone, quante uscite/anno realistiche.
3. Popolare shortlist gommoni+motori bundle ≤2.000 € dai feed live.
4. Redigere accordo scritto tra bestie (split costi, danni, uscita socio).
5. Scenario rigido: calcolare con 5 soci se i numeri tornano.
6. Osservare le metriche `/debug` dopo l'uso reale e ampliare i test solo sui difetti ricorrenti.

## Come usare questo repo

- Drop fonti in `raw/`, poi ingest
- `preferenza: …` → `wiki/preferenze/`
- `node scripts/lint-wiki.mjs` → controlla link, indice e frontmatter
- Annunci: tab su Pages / `annunci.html?cat=…`
- Dettaglio: `AGENTS.md` · [[mercato/feed-subito-live]]
