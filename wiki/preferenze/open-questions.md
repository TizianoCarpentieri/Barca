---
title: Open questions
type: preferenza
updated: 2026-08-05
status: active
tags: [todo]
---

# Open questions

## Gruppo e uso

- [x] Budget mezzo: **≤4.500 € usato** (track rigidi); gommone ref **970 €** nuovo scafo
- [ ] Split costi tra le 3 bestie
- [x] Budget annuo gestione: **≤1200 €/testa** all-in
- [ ] Riserva lavori post-acquisto (consigliata 500–1500 € extra)
- [x] Zona: **mare laziale** (Ardea/Pomezia; Anzio–Circeo–Fiumicino)
- [x] Dual track: **rigide + gommoni + motori** (feed live)
- [ ] Scelta finale: investire più su **rigido** o su **gommone+motore**?
- [x] Patente: nessuno; ideale restare senza
- [ ] Frequenza uscite/anno più precisa

## Barca / gommone

- [x] Track rigidi: **no gommone**; gozzo/open/lancia + tendalino
- [x] Track gommoni: criteri + ref [[modelli/argo-evo-360]]
- [x] Motori: min 6 CV, sweet 9.9–15
- [ ] Bundle ideale gommone+motore: tetto totale €?
- [ ] Fuoribordo vs entro (solo track rigidi)
- [ ] Cabina: no di default a questo budget

## Logistica

- [x] Traino/carrello: **no** sul track rigidi
- [ ] A posto barca vs C terra (numeri € nel cap)
- [x] Intestazione: da decidere (non blocca caccia)
- [ ] Chi gestisce manutenzione e pratiche?

## Normativa / sicurezza

- [ ] Tenere allineate fonti ufficiali limiti no-patente
- [ ] Dotazioni e assicurazione per fascia scelta

## [2026-08-07] eBay API — Browse non abilitata

- Token OAuth funziona (200), ma ogni scope Buy/Browse da `invalid_scope` e l'endpoint `item_summary/search` risponde **404 errorId 2002**.
- Causa probabile: l'app nel portale eBay (developer.ebay.com) non ha di fatto l'accesso alla **Buy/Browse API** (imb similar a "non abilitata per l'app").
- Fix: nel portale → My Apps → voce "API access" / "Key Management" → abilitare **Buy APIs / Browse** (e re-generare o verificare il keyset Production).
- Dopo il fix: `node scripts/fetch-accessori.mjs` in locale con `.env.ebay` → il feed eBay si riempie. In CI funzionano i secrets già aggiunti al workflow.
