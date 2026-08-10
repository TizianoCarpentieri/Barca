---
title: Track gommoni (PRIMARIO)
type: preferenza
updated: 2026-08-10
status: active
tags: [gommone, dual-track, pesca]
sources:
  - raw/mercato/argo-evo-360-al-reference-2026-08-05.md
  - presentazione/scripts/fetch-gommoni.mjs
---

# Track primario — Gommoni pneumatici

Dal 2026-08-10 il gommone è il **track primario**. Lo scafo rigido resta come scenario futuro condizionato a ≥5 soci (vedi [[sintesi/scenario-rigido-5-soci]]).

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

## Logistica e trasporto — open questions

- Chi ha un'auto adatta? (gommone piegato + motore + attrezzatura)
- Dove si tiene durante la settimana?
- Ciclo completo di un'uscita: vedi [[concetti/montaggio-gommone]]
- Dettaglio trasporto e custodia: [[concetti/logistica-trasporto]]

## Costi da verificare

Vedi [[concetti/costi-nascosti-gommone]] per il dettaglio di:
- Passaggio proprietà e documenti
- Dotazioni sicurezza obbligatorie
- Manutenzione ordinaria gommone e motore

## Reference prodotto

**[[modelli/argo-evo-360]]** — nuovo a **970 €** (scafo solo).

Regola usato "quasi uguale": almeno **−20%** senza motore (~776 €), altrimenti score basso.  
Bundle con motore buono può giustificare totali più alti.

## Feed automatico

- UI: https://tizianocarpentieri.github.io/Barca/annunci.html?cat=gommoni  
- Script: `presentazione/scripts/fetch-gommoni.mjs`  
- Dati: `public/data/gommoni.json`  
- Scoring: [[concetti/feed-annunci-scoring]]

## Motore tipico

Vedi [[preferenze/track-motori]] — non i motorini 2.5/4 CV.
