---
title: Track gommoni (parallelo)
type: preferenza
updated: 2026-08-05
status: active
tags: [gommone, dual-track, pesca]
sources:
  - raw/mercato/argo-evo-360-al-reference-2026-08-05.md
  - presentazione/scripts/fetch-gommoni.mjs
---

# Track parallelo — Gommoni pneumatici

Dal 2026-08-05 il gruppo valuta **due rotte in parallelo**:

1. **Rigide** — gozzo/open/lancia (track storico requisiti v1)  
2. **Gommoni** — pneumatici puri, non RIB (questo track)

Non si annulla il “no gommone” del track rigidi: è una **seconda shortlist** con criteri propri.

## Tipo di mezzo (must track gommone)

| Voce | Valore |
|------|--------|
| Forma | Gommone **smontabile** / **pneumatico** |
| Uso | **Adatto alla pesca** |
| Trasporto | **Trasportabile in automobile** |
| Escluso | **RIB** e scafo rigido in vetroresina |

## Specifiche tecniche

| Voce | Valore |
|------|--------|
| Lunghezza min | **3,30 m** |
| Lunghezza ideale | **3,50 – 3,80 m** |
| Portata min | **~400 kg** |
| Capacità min | **4 persone** |
| Chiglia | **Gonfiabile preferibile** |
| Poppa | **Specchio per fuoribordo** |
| Pavimento prio 1 | **Paiolato rigido alluminio** |
| Pavimento prio 2 | **AirDeck** alta pressione |

## Reference prodotto

**[[modelli/argo-evo-360]]** — nuovo a **970 €** (scafo solo).

Regola usato “quasi uguale”: almeno **−20%** senza motore (~776 €), altrimenti score basso.  
Bundle con motore buono può giustificare totali più alti.

## Feed automatico

- UI: https://tizianocarpentieri.github.io/Barca/annunci.html?cat=gommoni  
- Script: `presentazione/scripts/fetch-gommoni.mjs`  
- Dati: `public/data/gommoni.json`  
- Scoring: [[concetti/feed-annunci-scoring]]

## Motore tipico

Vedi [[preferenze/track-motori]] — non i motorini 2.5/4 CV.
