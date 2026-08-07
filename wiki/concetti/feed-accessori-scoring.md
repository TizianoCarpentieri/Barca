---
title: Feed accessori — design e scoring
type: concetto
updated: 2026-08-07
status: active
tags: [accessori, scoring, subito, ebay, feed, design]
sources:
  - presentazione/scripts/scoring-accessori.mjs
  - presentazione/scripts/fetch-accessori.mjs
---

# Feed accessori — design approvato (2026-08-07)

Quarta sezione in `annunci.html` (tab **Accessori**), doppia fonte Subito + eBay, un solo JSON fuso `accessori.json`.

## Architettura

```
presentazione/scripts/
  scoring-accessori.mjs   # condiviso: tabella tipologie + classify()
  fetch-accessori.mjs     # Subito (hades) + eBay (Browse API) → public/data/accessori.json
presentazione/src/js/annunci.js   # entry FEEDS accessori (soglia alto 65, ph ACCESSORIO)
presentazione/annunci.html        # tab «Accessori»
.github/workflows/pages.yml       # step fetch-accessori.mjs + secrets EBAY_CLIENT_ID/SECRET
```

- eBay in try/catch: se chiavi mancanti/errore, il feed Subito esce comunque; step workflow con `continue-on-error`.
- Ogni item ha `source: 'subito'|'ebay'`.

## Formula score

```
score = 20 (base) + peso_tipologia + bonus_prezzo + condizione + marca + trasporto + compatibilità
```

- **bonus_prezzo**: `ratio = effective_price / ref_new`; per eBay `effective_price = prezzo + spedizione`
  - NUOVO: ratio ≤1 → +10; >1 → −15
  - USATO: ≤0.30 → +25 · ≤0.50 → +15 · ≤0.75 → +5 · >0.75 → −20 · >0.90 → −25
- **condizione**: nuovo +8 · come nuovo +6 · usato funzionante +5 · usato generico +3 · da riparare: REJECT su elettronica, −25 altri
- **REJECT fissi**: giubbotti/estintori/razzi usati o scaduti · batterie usate · olio/carburante usato · annunci-imbarcazione (titolo barche)
- **marca nota** +5 (Garmin, Lowrance, Raymarine, Humminbird, B&G, Deeper, Plastimo, Scotty, …)
- **trasporto**: Subito → `geo-score.mjs` (Lazio +15 via fattore); eBay → spedizione nel prezzo, gratuita +8
- **compatibilità** +5 (gommone, 3–4 m, gozzo, tender, no patente, fuoribordo); REJECT se yacht/radome/radar/winch/generatore/elica 40–150 CV/dinette; bimini accetta 3.5–6 m
- **fit**: alto ≥65 · medio ≥45 · basso <45 · **stretch** se prezzo > cap tipologia

## Tabella tipologie (ref_new e cap da ricerca mercato)

| Tipologia | Peso | ref_new € | cap € |
|---|---|---|---|
| Ecoscandaglio/fishfinder | 30 | 180 | 400 |
| Fishfinder portatile (Deeper) | 28 | 220 | 350 |
| Plotter/GPS | 22 | 350 | 700 |
| Supporto tablet/phone imperm. | 16 | 40 | 80 |
| Portacanne kit (Scotty/Plastimo) | 28 | 55 | 120 |
| Portacanne da poppa/falchetta | 26 | 45 | 100 |
| Ancora + sagola | 25 | 35 | 80 |
| Kill bag / secchio vivo | 20 | 35 | 90 |
| Bimini / tendalino kit | 25 | 130 | 320 |
| Ombrellone da barca | 18 | 60 | 150 |
| Telone copertura/stiva | 14 | 90 | 220 |
| Giubbotto salvagente | 20 | 45 | 100 |
| Estintore nautico | 16 | 40 | 90 |
| Fanali di via | 16 | 50 | 120 |
| Pompa di sentina | 14 | 45 | 100 |
| Elica di scorta (9.9–15 CV) | 12 | 75 | 180 |
| Batteria 12V | 10 | 60 | 140 |
| Tanica/cavi/oli | 10 | 25 | 60 |
| Parabordi | 8 | 15 | 45 |
| Cime/ormeggio | 8 | 20 | 50 |
| Sedile da pesca | 12 | 60 | 140 |
| Kit riparazione gommone | 10 | 30 | 70 |

"Tappo sentina" e "pagaia" rimossi dalle query (nessuna tipologia li copre).

## eBay — note tecniche

- Token OAuth `client_credentials` dalle chiavi in `.env.ebay` (locale) / secrets workflow (deploy)
- Browse API: `GET /buy/browse/v1/item_summary/search` con `q=<keyword>`, `filter=buyingOptions:{FIXED_PRICE}`, `price:[0..cap]`, `limit=50`
- Spedizione: `shippingOptions[].cost` sommato al prezzo; `shippingCostType` FREE → +8; CALCULATED → "da calcolare"
- Nessun filtro categoria (26429 = "Barche"): keyword + classificatore
- Solo 1ª pagina per keyword (budget chiamate)

## Status

- [x] Design approvato
- [ ] Script scoring + fetch
- [ ] UI tab
- [ ] Workflow + secrets
- [ ] Deploy online
