---
title: Overview
type: sintesi
updated: 2026-08-11
status: active
tags: [stato]
---

# Overview — ricerca barca

## In una frase

Le bestie (tu + Antonio + Peppe) cercano un **gommone pneumatico smontabile no-patente**, usato low-budget (≤2.000 € bundle), per **pesca e costa laziale** (base Ardea/Pomezia). Scafo rigido = scenario futuro con 5 soci.

## Direzione attuale (2026-08-11)

| Asse | Direzione |
|------|-----------|
| Mezzo primario | **Gommone pneumatico smontabile** (no RIB), trasportabile in auto |
| Scafo rigido | Desiderio, ma realistico solo con ≥5 soci e preventivi reali |
| Budget acquisto | **≤2.000 €** bundle gommone+motore usato |
| Costi fissi gommone | **Non hard-cap 30 €/testa/mese**; attesi soprattutto RC + tagliando (pochi €/testa/mese se i preventivi reggono) |
| Uso | Preferenza **uscite di gruppo**; split 1/N |
| Motore | **9–40 CV**, purché senza patente; 4T preferito; gambo compatibile con lo scafo |
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
| Budget gestione gommone | 🟢 modello chiaro: no hard-cap 30 €; fissi RC+tagliando; variabili a uscita — preventivi reali ancora open |
| Costi reali (manutenzione, passaggio, doc) | 🟡 RC legge ok; tagliando/dotazioni in corso — [[concetti/costi-nascosti-gommone]] |
| Logistica trasporto (auto, custodia) | ⬜ [[concetti/logistica-trasporto]] — da verificare |
| Accordo scritto bestie | 🟡 bozza in cantiere (fuori wiki); da revisionare insieme e firmare — **non** ancora ingerita |
| Scenario rigido 5 soci | ⬜ [[sintesi/scenario-rigido-5-soci]] |
| Feed Subito automatico | ✅ 3 feed + geo-score + cron |
| Sbarco deep research | 🟢 produzione `2.2.2`; richiesta PDF deterministica con `save_doc` obbligatorio e fallback, verificata online |
| Lint wiki automatico | ✅ `node scripts/lint-wiki.mjs` |
| Shortlist candidati | ⬜ da popolare dai feed |
| Visite/prove | ⬜ non iniziato |

## Prossimi passi consigliati

1. Preventivi reali RC e tagliando; chiudere dotazioni/documenti sul bundle scelto.
2. Logistica: auto, custode, prova ciclo carico/montaggio, accesso mare lecito.
3. Shortlist bundle ≤2.000 € dai feed live.
4. Revisionare insieme e firmare il patto (bozza già in cantiere; ingest wiki solo dopo).
5. Scenario rigido: solo con ≥5 soci e preventivi ≤30 €/testa/mese.
6. Metriche `/debug` Sbarco dopo uso reale.

## Come usare questo repo

- Drop fonti in `raw/`, poi ingest
- `preferenza: …` → `wiki/preferenze/`
- `node scripts/lint-wiki.mjs` → controlla link, indice e frontmatter
- Annunci: tab su Pages / `annunci.html?cat=…`
- Dettaglio: `AGENTS.md` · [[mercato/feed-subito-live]]
