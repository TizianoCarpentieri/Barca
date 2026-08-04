---
title: Mercato usato ≤4500€
type: mercato
updated: 2026-08-04
status: active
tags: [usato, subito, budget]
sources:
  - raw/mercato/subito-pacchetti-under-5500-2026-08-04.md
  - raw/mercato/subito-pacchetti-under-5500-2026-08-04.json
---

# Mercato usato — tetto ~4.500 € (sample Subito 2026-08-04)

## Metodo

- API pubblica ricerca Subito (`hades.subito.it`), query multiple (gommone+motore, senza patente, gozzo, open, Anzio/Roma/Nettuno…).
- Filtro post: prezzo 800–5.500 €, annuncio con **scafo + motore** (non solo motore/carrello).
- **Campione non esaustivo** (snapshot un giorno); i prezzi cambiano in fretta.

## Numeri campione

| Metrica | Valore |
|---------|--------|
| Annunci unici grezzi | ~640 |
| Pacchetti scafo+motore 0,8–5,5k € | ~120 |
| Di cui cv≤40 o cv non dichiarato | ~100 |
| Bucket ≤2k / 2–3,5k / 3,5–4,5k / 4,5–5,5k (cv≤40/unk) | 39 / 31 / 12 / 18 |

## Cosa si trova davvero a ≤4.500 €

**Frequente**
- Gommone 3–4,5 m + 15–25 CV (± carrello)
- Gozzi VTR/legno 4,5–6 m con fuoribordo piccolo (9,9–25 CV)
- Affari sospetti molto sotto mercato (motore da rifare, tubolari spompati, senza documenti)

**Raro ma presente**
- Pacchetto ~4–5 m vicino al tetto 40 CV
- Inclusione “posto barca” o carrello omologato nel prezzo

**Quasi assente a questo budget**
- Open/fishing CE recente 6 pax comodi “chiavi in mano”
- RIB 5,5–6 m in buono stato con 40 CV 4T recente

## Segnali Lazio (stesso snapshot — verificare online)

Esempi **illustrativi** (non raccomandazioni; annunci possono sparire):

| € | Zona | Cosa diceva il titolo |
|---|------|------------------------|
| 2399 | Anzio | Gommone 4 m + carrello + 25 CV + posto barca |
| 2500 | Roma | Yam 360 smontabile + Yamaha 20 CV |
| 2600 | Sperlonga | Gozzo + fuoribordo |
| 3000 | Rocca Priora | Gommone + motore + carrello omologato |
| 3200 | Fiumicino | Gozzo 5 m + Yamaha |
| 4000 | Santa Marinella | Gozzo 25 CV |
| 5000 | Fiumicino | Lomac 460 (stretch) |
| 5000 | Roma | Gommone+motore+carrello (stretch) |
| 1000 | Roma | Joker 430 + Evinrude 25/40 — **prezzo anomalo → alta cautela** |

Lista grezza: `raw/mercato/subito-pacchetti-under-5500-2026-08-04.md`

## Reality check vs obiettivo Bestie

| Obiettivo | Fit a ≤4.500 € |
|-----------|----------------|
| Solo usato | ✅ allineato |
| No patente (≤40,8 CV) | ✅ molti annunci in fascia; verificare cilindrata/potenza reale |
| 3 a pesca | ✅ fattibile su 4–5 m sistemati |
| Fino a 6 | ⚠️ omologazione/comfort spesso 4–5; 6 = picco stretto o annuncio ottimistico |
| Performante | ❌ già escluso dal gruppo |
| “Pronta mare” senza lavori | ⚠️ minoranza; budget ripristino da tenere a parte |

## Regole d’acquisto in questa fascia

1. **Vedere a secco** tubolari, fondo, traverse, piedi motore, corrosione gambo  
2. **Prova in acqua** + compressione/smoket test se 2T vecchio  
3. Documenti: fattura/cessione, conformità CE se dovuta, libretto motore  
4. Se manca carrello e scegliete rimessaggio B: costo carrello **extra** (spesso 500–1.500 € usato)  
5. Tenere **500–1.500 €** di riserva lavori post-acquisto (non nel tetto “sogno”)

## Prossimi passi mercato

- [ ] Alert Subito/Facebook Marketplace: gommone|gozzo + Lazio + max 5000  
- [ ] Sopralluogo cluster Anzio/Nettuno/Fiumicino quando spunta candidato  
- [ ] Checklist ispezione in `wiki/concetti/`  
