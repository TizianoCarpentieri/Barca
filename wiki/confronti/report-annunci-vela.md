---
title: Report annunci Vele — cosa è stato tenuto
type: confronto
updated: 2026-08-22
status: active
tags: [feed, vele, audit]
sources:
  - raw/annunci/report-annunci-vela-2026-08-22.md
---

# Report annunci Vele — integrazione

Fonte immutabile: `raw/annunci/report-annunci-vela-2026-08-22.md` (audit 22 ago, solo lettura). Il tab **Vele** era già varato come osservazione; da quel report si è tenuto ciò che rende il feed di prima classe **senza** far deragliare il piano A.

Criteri del track: [[preferenze/track-vele]]. Scoring: [[concetti/feed-annunci-scoring]]. Live: [[mercato/feed-subito-live]].

## Tenuto

| Voce report | Cosa c’è ora |
|-------------|--------------|
| A1–A4 tipo/budget/patente/fonte | Chiusi in [[preferenze/track-vele]] (cabinato 7–9 m, ≤9/10k, MIT, Subito + geo Lazio) |
| C1 `fetch-vele.mjs` + snapshot | `presentazione/scripts/fetch-vele.mjs` · `raw/mercato/subito-vele-*.json` |
| C3 normalizzatori vela + test | `isSailboat`, `sailTypeOf`, `extractSailInventory`, lunghezze 2–24 m in `feed-normalizers.mjs` |
| C2 esclusioni incrociate | Rigide e motori respingono la vela; accessori respinge Optimist/barca intera |
| D1–D2 gate a gradini | `vele` è **soft**: warning, non blocca gommoni/motori/rigide. Fetch vele `continue-on-error` in CI |
| D5 duplicati cross-feed | Stesso URL in due tab → warning se tocca vele/accessori, errore fra feed core |
| B3/B4 geo e distanza | Client importa `geo-score.mjs`; accessori usa `noDistancePenalty` |
| B6/G1 card e badge | Tag randa/genoa/spinnaker; tab **sogno** (ottone, non arancio piano A) |
| E/F allineamento | Wiki feed, shortlist non toccata, RC vela nel prospetto |

## Rimandato (voluto)

Non è un backlog da fare “per completezza”: sono rifattori che non cambiano i candidati.

- Unificare Accessori nella stessa pagina dei tab (resta pagina propria: filtri e score diversi)
- Generare i bottoni HTML da `FEEDS` (c’è solo un check runtime tab ↔ config)
- Parallelizzare i fetch CI (Subito rate-limit; timeout 20 min resta)
- Promuovere Vele a feed bloccante — solo dopo settimane di fetch stabile
- Estrarre l’anno barca dal testo (randa 2023 ≠ anno scafo)

## Cosa non cambia

- Must-have piano A = mezzo a motore
- Shortlist = solo gommone/motore; il tab Vele **non** genera candidati
- Budget ≤2.000 € bundle gommone
- Gate core (rigide, gommoni, motori, accessori) resta bloccante
