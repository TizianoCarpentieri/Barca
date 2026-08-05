---
title: Overview
type: sintesi
updated: 2026-08-05
status: active
tags: [stato]
---

# Overview — ricerca barca

## In una frase

Le bestie (tu + Antonio + Peppe) cercano un mezzo **no-patente**, **usato low-budget**, per **pesca e costa laziale** (base Ardea/Pomezia) — su **due track paralleli**: scafi **rigidi** e **gommoni** pneumatici (+ feed **motori**).

## Dual track (2026-08-05)

| Track | Cosa | Reference / note |
|-------|------|------------------|
| **Rigide** | Gozzo / open / lancia VTR | Requisiti v1; no gommone su questo track |
| **Gommoni** | Pneumatico smontabile, no RIB | Benchmark [[modelli/argo-evo-360]] a **970 €** nuovo |
| **Motori** | Fuoribordo 6–40,8 CV | Sweet **9.9–15**; niente 2.5/4 CV |

UI unica: [Annunci live](https://tizianocarpentieri.github.io/Barca/annunci.html) (tab Rigide · Gommoni · Motori).  
Logica score: [[concetti/feed-annunci-scoring]].

## Stato

| Area | Stato |
|------|--------|
| Setup tool (wiki, presentazione, Pages) | ✅ |
| Preferenze gruppo / requisiti v1 | ✅ + **track gommone/motori** |
| Zona operativa | ✅ mare laziale — Ardea/Pomezia → Anzio/Circeo/Fiumicino |
| Rimessaggio | 🟡 A posto barca o C terra (**carrello escluso** sul track rigidi; gommone = auto) |
| Patente | ✅ nessuno; ideale no-patente ≤40,8 CV |
| Normativa no-patente IT | 🟡 pagina wiki presente; tenere fonti aggiornate |
| Budget acquisto | ✅ ≤4.500 € usato (track rigidi); gommone ref nuovo 970 € scafo |
| Budget gestione | ✅ ≤1.200 €/testa/anno all-in |
| Priorità uso | ✅ pesca canne → giri → bagno → facilità |
| Feed Subito automatico | ✅ 3 feed + geo-score + cron |
| Reference Argo-Evo 360 | ✅ raw + [[modelli/argo-evo-360]] |
| Shortlist candidati | ⬜ ancora da popolare a mano da feed |
| Visite/prove | ⬜ non iniziato |

## Prossimi passi consigliati

1. Usare i feed live e marcare 3–5 candidati per track in [[sintesi/shortlist]].
2. Preventivi rimessaggio A/C nel cap 3.600 €/anno (track rigidi).
3. Per gommoni: confrontare usati vs **nuovo Argo 970 €** (−20% regola) + motore da feed.
4. Chiudere intestazione quando c’è un candidato serio.

## Come usare questo repo

- Drop fonti in `raw/`, poi ingest  
- `preferenza: …` → `wiki/preferenze/`  
- Annunci: tab su Pages / `annunci.html?cat=…`  
- Dettaglio: `AGENTS.md` · [[mercato/feed-subito-live]]
