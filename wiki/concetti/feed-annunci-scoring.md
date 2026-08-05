---
title: Feed annunci e scoring
type: concetto
updated: 2026-08-05
status: active
tags: [subito, scoring, feed, distanza]
sources:
  - presentazione/scripts/fetch-annunci.mjs
  - presentazione/scripts/fetch-gommoni.mjs
  - presentazione/scripts/fetch-motori.mjs
  - presentazione/scripts/geo-score.mjs
---

# Feed annunci Subito — logica di scoring

Tre feed paralleli, **una sola UI** con tab:

| Tab | JSON | Script |
|-----|------|--------|
| **Rigide** | `annunci.json` | `fetch-annunci.mjs` |
| **Gommoni** | `gommoni.json` | `fetch-gommoni.mjs` |
| **Motori** | `motori.json` | `fetch-motori.mjs` |

- Live: https://tizianocarpentieri.github.io/Barca/annunci.html  
- Deploy + cron 2×/giorno: `.github/workflows/pages.yml`  
- API: `hades.subito.it` cat. Nautica (non ufficiale)

## Base operativa (punto X)

**Ardea / Pomezia** e litorale laziale (Anzio, Nettuno, Fiumicino, Circeo…).  
Lo score è **inversamente legato alla distanza** da questa zona.

### Fattore distanza (`geo-score.mjs`)

Esempio concordato: **1000 € in Puglia ≈ 1200 € a casa** → fattore **1,2**.

| Zona | Fattore tipico |
|------|----------------|
| Lazio / paesi hub | 1,00 |
| Toscana, Campania, … | ~1,12 |
| **Puglia** | **1,20** |
| Sicilia / Sardegna / Nord lontano | ~1,28–1,32 |

Effetti:

- Penalità punti proporzionale a `(factor − 1)`
- In card: prezzo + **≈ equivalente a casa** se lontano
- Reason: `lontano (≈1200€ eq.)`

## Track rigide

- No gommone/RIB, no solo-motore, no solo-carrello  
- Prezzo ~800–4500 (stretch 5500)  
- Bonus gozzo/open/lancia, tendalino, pesca, Lazio, CV ≤40,8  

## Track gommoni

Criteri: [[preferenze/track-gommoni]].  
Reference: [[modelli/argo-evo-360]] a **970 €** nuovo.

### Regola −20% vs nuovo

Usato **praticamente uguale** al reference **senza motore** deve costare almeno **20% in meno** (~**776 €**).  
Altrimenti penalità forte (“meglio nuovo”).  
**Bundle con motore** decente a totale ragionevole → bonus.

Pavimento: paiolato alluminio > airdeck. Chiglia gonfiabile preferita.

## Track motori

Criteri: [[preferenze/track-motori]].

- **Reject** CV **&lt; 6** (niente 2.5 / 4 CV)  
- Sweet **9.9–15**, ideale **8–20**, max **40,8**  
- 4 tempi, gambo corto, marche buone  
- Hard prezzo UI **≤ 1.200 €**  

## Fit labels

| Fit | Idea |
|-----|------|
| alto | score alto + status ok |
| medio / basso | debole o incompleto |
| stretch | prezzo sopra hard della categoria |

## Nota

I feed sono **candidati grezzi**, non consigli d’acquisto. CV, documenti e stato sempre a mano.
