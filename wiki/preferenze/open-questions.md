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
- [x] Split costi tra le 3 bestie → [[split-costi]] (regole danni, split, uscita socio)
- [ ] Accordo scritto da firmare
- [x] Budget annuo gestione: **≤1200 €/testa** all-in
- [x] Riserva lavori post-acquisto: ~500 €/anno già stimata in costi fissi
- [x] Zona: **mare laziale** (Ardea/Pomezia; Anzio–Circeo–Fiumicino)
- [x] Dual track: **rigide + gommoni + motori** (feed live)
- [x] Scelta finale: **scafo rigido** preferito (praticità > costo) da conversazioni 9 ago
- [x] Patente: nessuno; ideale restare senza
- [x] Frequenza uscite/anno: moderata + inverno pesca (conversazioni 9 ago)

## Barca / gommone

- [x] Track rigidi: **no gommone**; gozzo/open/lancia + tendalino
- [x] Track gommoni: criteri + ref [[modelli/argo-evo-360]]
- [x] Motori: min 6 CV, sweet 9.9–15
- [ ] Bundle ideale gommone+motore: tetto totale €?
- [ ] Fuoribordo vs entro (solo track rigidi)
- [ ] Cabina: no di default a questo budget

## [2026-08-07] Accessori — decisioni revamp (chiuse)

- [x] **eBay: RIMOSSA completamente** dal feed accessori (UI, script, workflow, `.env.ebay`). Motivo: keyset senza Buy API, portale read-only, nessun fix possibile → fonte inutile.
- [x] **Prezzo nuovo = automatismo**: mediana prezzi annunci Subito con condizione "nuovo" per modello, stesso cron dei feed (2×/giorno, 06:15/18:15 UTC). Nessuna API aggiuntiva (stessa hades).
- [x] **+5 nuove tipologie** approvate: galleggianti/boie, canne & mulinelli, radio VHF, cassetta attrezzi, binocolo → griglia 27 tipologie in 5 destinazioni.
- [x] **5 destinazioni** (filtri UI): Elettronica · Pesca · Sicurezza & dotazione · Scafo & comfort · Motore & manutenzione.
- [x] **Icona Accessori** accanto ai 3 tab su stessa riga (fix accapo grid `repeat(3,1fr)`), clic → pagina dedicata `accessori.html`.

## Logistica

- [x] Traino/carrello: **no** sul track rigidi
- [ ] A posto barca vs C terra (numeri € nel cap)
- [x] Intestazione: da decidere (non blocca caccia)
- [ ] Chi gestisce manutenzione e pratiche?

## Normativa / sicurezza

- [ ] Tenere allineate fonti ufficiali limiti no-patente
- [ ] Dotazioni e assicurazione per fascia scelta

## [2026-08-07] eBay API — Browse non abilitata (diagnosi CONFERMATA in locale)

- Riproduzione live fatta il 2026-08-07 con le chiavi reali di `.env.ebay`:
  - Token `grant_type=client_credentials` con scope generico `https://api.ebay.com/oauth/api_scope` → **200** (token emesso).
  - Token con scope `https://api.ebay.com/oauth/api_scope/buy.browse.readonly` → **400 invalid_scope "exceeds the scope granted to the client"**.
  - Browse API `GET /buy/browse/v1/item_summary/search` col token generico → **404 errorId 2002** "Resource not found".
- Causa: il keyset dell'app è stato creato con i **Sell/Commerce APIs**, senza **Buy APIs**. La pagina OAuth scopes del portale è **read-only e NON modificabile**: gli scope sono assegnati al keyset al momento della creazione (fonti: supporto Cleo "se manca uno scope contattare eBay support"; guida mfalkus/ebay-bargains "non si possono aggiungere scope nel portale, sono assegnati alla creazione del keyset").
- Buy API/Browse quindi NON è raggiungibile per questo keyset → 404. Nel codice `EBAY_SCOPE` resta `api_scope` (scope generico ok per `item_summary/search` una volta che il keyset ha la Buy API); NON usare `buy.browse.readonly` finchè lo scope non è concesso, altrimenti il token fallisce con 400.
- Strade per sbloccare:
  1. **Creare una nuova application/keyset** selezionando nel flusso di creazione le **Buy APIs (Browse)**; usare le client id/secret Production del nuovo keyset in `.env.ebay` / secrets CI.
  2. **Contattare il supporto eBay developer** (developer.ebay.com/support) richiedendo l'accesso `buy.browse.readonly` / Buy API per il keyset esistente (citare errorId 2002/404, endpoint `buy/browse/v1/item_summary/search`, marketplace EBAY_IT).
- Verifica finale: `node scripts/fetch-accessori.mjs` locale → `stats.ebay > 0`.
