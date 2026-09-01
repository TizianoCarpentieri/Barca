---
title: Feed annunci e scoring
type: concetto
updated: 2026-09-01
status: active
tags: [subito, scoring, feed, distanza]
sources:
  - presentazione/scripts/fetch-annunci.mjs
  - presentazione/scripts/fetch-gommoni.mjs
  - presentazione/scripts/fetch-motori.mjs
  - presentazione/scripts/fetch-vele.mjs
  - presentazione/scripts/fetch-posti.mjs
  - presentazione/scripts/posti-classify.mjs
  - presentazione/scripts/geo-score.mjs
  - presentazione/scripts/feed-normalizers.mjs
  - presentazione/scripts/validate-feeds.mjs
---

# Feed annunci Subito — logica di scoring

Cinque tab + Accessori, **una sola UI** Annunci:

| Tab | JSON | Script |
|-----|------|--------|
| **Rigide** | `annunci.json` | `fetch-annunci.mjs` |
| **Gommoni** | `gommoni.json` | `fetch-gommoni.mjs` |
| **Motori** | `motori.json` | `fetch-motori.mjs` |
| **Vele** | `vele.json` | `fetch-vele.mjs` |
| **Posti** | `posti.json` | `fetch-posti.mjs` + `posti-classify.mjs` |

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

## Track vele (sogno)

Criteri: [[preferenze/track-vele]]. Reference: [[modelli/comet-770]].

- Cabinato 6,5–9 m (sweet 7,5–8); derive da club = weak
- Hard ≤9.000 €, stretch ≤10.000
- Bonus Lazio, Comet/Comar/Finot, ausiliario ≤40,8 CV
- Penalità distanza come gli altri scafi (non è un accessorio spedibile)
- Etichetta UI: sogno parallelo, non piano A

### Normalizzazione e gate (2026-08-10)

- Le misure Subito `330`, `380` e `3600` diventano 3,30 m, 3,80 m e
  3,60 m; una misura esplicita nel titolo prevale sul campo API.
- RIB, semirigidi, scafo/carena/chiglia rigida e modelli RIB noti sono reject.
- `has_engine` distingue i bundle reali dalle descrizioni che citano soltanto
  la potenza consigliata.
- Per i motori marca, potenza e gambo nel titolo prevalgono sulle compatibilita'
  elencate nel corpo.
- `validate-feeds.mjs` (logica in `feed-gate.mjs`) blocca il deploy per i
  **feed core** (rigide, gommoni, motori, accessori): file mancanti, feed
  vecchi o piccoli, duplicati, misure/CV fuori scala e RIB sfuggiti al filtro.
- **Vele e Posti sono soft:** file assente, stantio o magro = **warning**, non ferma il
  piano A. Stesso URL in due tab = **warning** (anche rigide ∩ motori: bundle
  reali su Subito). Helper vela condivisi: `isSailboat`, `sailTypeOf`, inventario
  randa/genoa/spinnaker. Posti: `deal_type` rent/sale, vendita ≤20k.

## Track posti (ormeggio vela)

Criteri: [[preferenze/track-posti]].

- **Reject** fuori Lazio, stagionale, rumore (noleggio/charter/barca in vendita), vendita **> 20.000 €**
- Affitti **senza cap**; affitto ≫ vendita sullo score
- Sweet slot **7,3–8,5 m**; classe 6,5–9; in acqua > a secco
- Bonus hub **Fiumicino–Ostia–Anzio–Nettuno**
- Gate **soft** (come Vele)
- Striscia **Bandi e gestori** da JSON curato: non è Subito

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
