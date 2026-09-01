---
title: Track posti barca (vela)
type: preferenza
updated: 2026-09-01
status: active
tags: [ormeggio, posti-barca, vela, lazio, annuale]
sources:
  - wiki/documenti/porti-fiumicino-sabaudia.md
  - wiki/preferenze/track-vele.md
  - presentazione/scripts/posti-classify.mjs
  - presentazione/scripts/posti-ufficiali.json
---

# Track Posti — ormeggio annuale Lazio

Serve il **cabinato 7–9 m** (ref [[modelli/comet-770]]), non il gommone smontabile. Decisione 2026-09-01: una tab Annunci, piano C (tutto il litorale laziale annuale, filtri per tipo/misura), **nessun cap sugli affitti**, vendita concessione **≤ 20.000 €**.

UI: `annunci.html?cat=posti`. Score: [[concetti/feed-annunci-scoring]].

## Cosa entra

| Voce | Valore |
|------|--------|
| Oggetto | Posto barca, ormeggio, pontile, darsena, rimessaggio |
| Geografia | **Solo Lazio**. Fuori regione = scarto (un posto non si porta a casa) |
| Periodo | **Solo annuale**. Fuori: stagionale, estate, weekend, transito, giornaliero, mensile, invernale, **dal…al / da…a / fino al** su pochi mesi (`1ottobre-30aprile`, `dal 1/11 al 30/4`). Restano: «libero da ottobre» su un annuale, concessione fino al 2048, orari lunedì-venerdì |
| Contratto | Affitto **e** vendita; **affitto pesa di più** sullo score |
| Affitti | Nessun tetto di canone |
| Vendite | Hard **≤ 20.000 €** |
| Sanity | Prezzo **≥ 50.000 €** = cessione immobiliare, scarto anche se l’inserzionista scrive «affitto» |
| Target misura | Classe **6,5–9 m** (sweet **7,3–8,5** ≈ slot 8,50 × 2,70 del 770) |
| Hub | Fiumicino, Ostia, Anzio, Nettuno |
| A secco | Visibile, score più basso dell’acqua |

## Cosa non è questo feed

- Noleggio barca, charter, compleanni, “vacanza a vela”
- Barca in vendita che cita “posto incluso”
- Bandi comunali e liste demaniali: **non stanno su Subito**. Stanno nella striscia **Bandi e gestori** (`presentazione/scripts/posti-ufficiali.json`), seme da [[documenti/porti-fiumicino-sabaudia]]

## Filtri UI (stesso albero a 3 livelli)

1. Contratto — Affitto · Vendita
2. Posto — In acqua · Classe 6,5–9 m · Hub Fiumicino–Nettuno
3. Occasione — Annuale dichiarato · Fit alto · Ultimi 7 giorni

Periodo non dichiarato: resta in lista con penalità; il chip “Annuale dichiarato” lo nasconde.

## Fonti ufficiali (alternativa a Subito)

Non si scrapano gli albi: sono fragili. Ogni nuovo bando → drop in `raw/` + riga nel JSON ufficiale. Oggi il seme verificato copre Anzio (bando/trasparenza/PEC), Marina di Nettuno, Porto Turistico di Roma, Porto Romano, foce Tevere, Demanio Ardea, Tor San Lorenzo, ULM Torvaianica, cantieri Anzio, Rio Martino.

Anzio 2026: domande solo PEC `protocollo.comuneanzio@pec.it`; non residenti senza sconto 15%. Il listino 8,50 m **sfora** il cap vela 700/testa — serve preventivo, non il PDF da solo.

## Gate

Feed **soft** come Vele: magro o stantio = warning, non ferma gommoni/motori.
