---
title: Contesto operativo Sbarco
type: sintesi
updated: 2026-08-24
status: active
tags: [sbarco, contesto, source-of-truth]
sources:
  - wiki/overview.md
  - wiki/preferenze/must-have.md
  - wiki/preferenze/budget.md
  - wiki/preferenze/split-costi.md
  - wiki/preferenze/open-questions.md
  - wiki/sintesi/prospetto-costi-a-norma.md
  - wiki/sintesi/patto-bestie.md
  - wiki/normativa/varo-litorale-lazio.md
  - wiki/preferenze/track-vele.md
  - wiki/modelli/comet-770.md
---

# Contesto operativo Sbarco

Pagina compatta usata dal bot come contesto primario. Contiene solo lo stato
corrente; i dettagli restano nelle pagine collegate (usare `read_wiki`).

## Decisione corrente

- **Piano A:** gommone pneumatico smontabile, non RIB, trasportabile in auto.
- **Sogno parallelo (track D):** cabinato a vela 7–9 m, ref [[modelli/comet-770]]. Non sostituisce il piano A. Si osserva; si compra solo se il TCO all-in sta nel cap.
- **Piano B:** scafo rigido a motore soltanto con ≥5 soci e preventivi reali.
- **Gruppo:** Tiziano, Antonio e Peppe sul gommone. Sul sogno vela il nucleo più probabile è Tiziano+Antonio; altri soci (Matteo, Giulia, padre di Giulia, Paolo) **benvenuti**. Peppe in chat 20 ago risulta freddo sul cabinato.
- **Uso:** 3 comodi per pesca; fino a ~6 solo picco sociale.
- **Quote Sbarco:** Tiziano illimitato (Base e Pro). Antonio e Peppe 5 crediti/giorno: Base = 1, Pro = 2, **ricerca estesa = 3 (Base) / 5 (Pro)**; l'estesa parte con ≥1 credito e consuma `min(costo, residuo)`, completando comunque la richiesta. Worker `2.6.0`: harness agentico (compito persistente, niente conferma su un ordine già dato, un passo fallito va in sintesi non in abort). Su Pro la risposta passa sempre dalla sintesi finale con thinking attivo (blocco ripiegabile "Come ho ragionato" in chat); su Base percorso diretto. Modalità: rapida/profonda/**estesa** (censimenti e multi-località, 12 round, 12 ricerche, 16 pagine). Se l'utente chiede i moli/porti Fiumicino→Sabaudia o un PDF di quel censimento: **read_wiki** `wiki/documenti/porti-fiumicino-sabaudia.md` e **save_doc**, senza aspettare un reset del budget web.

## Vincoli economici e tecnici

| Voce | Valore corrente |
|------|-----------------|
| Bundle gommone + motore | **≤2.000 €**, preferibilmente usato |
| Cabinato vela (in 2) | **≤9.000 €**, stretch **10.000 €** |
| Costi fissi gommone | **non hard-cap 30 €/testa/mese**; attesi RC + tagliando; benzina = variabile |
| Costi fissi vela all-in | **≤700 €/testa/anno** (stretch **900**), **tutto** (ormeggio+RC+carena+motore+fondo). Anzio banchina 8,50 = 4.282 € IVA incl. → sfora il cap |
| Gommone | **min 3,90 m**; 3 comodi, 4+ preferibile, 6 bonus; Al/airdeck; chiglia gonfiabile preferita |
| Motore | **9–40 CV** no-patente (≤30 kW **e** cilindrata); 4T preferito; gambo compatibile |
| Patente | nessuno; target senza patente ≤6 miglia |
| Split / uso | 1/N fissi; variabili 1/P presenti; uscite di gruppo come ipotesi organizzativa |
| Benchmark | [[modelli/argo-evo-360]] 970 € nuovo; usato eq. senza motore ≥ −20% |

## Patto, costi a norma, varo (ingeriti)

Bozze **ipotetiche tra soci, non firmate**. L'impianto del patto si riusa per gommone, scafo rigido o vela (si cambia il Bene). Consultazione sul sito: `documenti.html`.

| Tema | Digest | Testo integrale wiki | File fonte |
|------|--------|----------------------|------------|
| Patto soci v1.10 | [[sintesi/patto-bestie]] | [[documenti/patto]] | `contratto/bozza-patto-v1.md` |
| Costi/obblighi/dotazioni | [[sintesi/prospetto-costi-a-norma]] | [[documenti/costi]] | `contratto/prospetto-costi-a-norma.md` |
| Punti di lancio Lazio | [[normativa/varo-litorale-lazio]] | [[documenti/varo]] | `contratto/dati/punti-varo-lazio.json` |
| Porti e moli Fiumicino→Sabaudia | [[documenti/porti-fiumicino-sabaudia]] | idem | ricerca web 2026-08-23 |

Se l'utente chiede un articolo, una tabella o un punto di varo: **read_wiki** sui path `wiki/documenti/patto.md`, `wiki/documenti/costi.md`, `wiki/documenti/varo.md`. Se chiede porti, moli o ormeggi da Fiumicino a Sabaudia (elenchi, indirizzi, URL): **read_wiki** su `wiki/documenti/porti-fiumicino-sabaudia.md` **prima** di cercare sul web. Hub: [[documenti]].

**Scuola sul sito:** [[concetti/simulazioni]] · trainer nodi `nodi.html` (gassa d'amante, parlato, otto, piano, giro morto, bandiera).

**Flash utile:**
- RC obbligatoria su motore amovibile; massimali min. 6,45 M€ / 1,3 M€ (2026).
- Dotazioni ≤6 miglia: kit STIMA 300–350 € (4 pax).
- Scenario RC+manut ~120+120 €/anno → ~6,7 €/testa/mese (senza benzina).
- Varo: **solo corridoi** o scivoli/porti; niente “spiaggia libera + remi + motore”.
- 4 PO Ardea da chiamare: Tor San Lorenzo (392 639 1831), Cerolini, Caravallebecio, La Torre.
- Hub rampa: scivolo Capitaneria Anzio; porto Anzio 06 8661 5830; Nettuno cantieri.
- Patto: danni default 1/P presenti; solitarie ancora [DA DECIDERE]; formula uscita socio tempo-dominante.

## Priorità

1. Pesca a canna (tre bestie).  
2. Giri costieri Lazio.  
3. Bagno/relax/amici.  
4. Facilità operativa accettando montaggio.

## Questioni ancora aperte

- Auto, custodia, carico/scarico.
- Conferma telefonica ≥1 punto varo zona casa + piano B Anzio.
- Preventivi RC×3 e tagliando su motore reale.
- Firmare patto (bozza ingerita; restano [DA DECIDERE]).
- Shortlist bundle ≤2.000 €.
- Uscite solitarie sì/no definitivo.
- Vela: preventivo Fiumicino foce; scuola 12 miglia; perito su qualsiasi 770.

Dettaglio vela: [[preferenze/track-vele]] · [[concetti/costi-possesso-cabinato]] · [[sintesi/conversazioni-audio-20260820]].
Patente vela: la superficie velica **non** basta; oltre 6 miglia serve sempre; i 24 m sono le navi, non la soglia vela. Ponza da Anzio ~30 M → senza limiti.

Dettaglio: [[preferenze/open-questions]].

## Regole di affidabilità

- Stime ≠ fatti; citare pagina wiki o URL.
- Normativa/prezzi correnti: fonti aggiornate; prospetto è fonte operativa ma non legge.
- Pagine storiche scafo rigido ≠ piano A attuale.
- PDF solo via `save_doc` + tasto Scarica PDF.
- Output: non scendere sotto 1000 token/step e 2600 sintesi senza prova.
- Quota Tiziano illimitata; reset quote ≠ wipe memoria.

## Percorsi di approfondimento

- Patto/costi/varo: [[sintesi/patto-bestie]] · [[sintesi/prospetto-costi-a-norma]] · [[normativa/varo-litorale-lazio]]
- Requisiti: [[preferenze/must-have]] · [[sintesi/requisiti-v1]]
- Budget: [[preferenze/budget]] · [[concetti/costi-nascosti-gommone]] · [[concetti/costi-possesso-cabinato]]
- Vela: [[preferenze/track-vele]] · [[modelli/comet-770]]
- Logistica: [[concetti/logistica-trasporto]] · [[concetti/montaggio-gommone]]
- Motori/scafo: [[preferenze/track-motori]] · [[preferenze/track-gommoni]]
- Normativa: [[normativa/limiti-senza-patente]] · [[normativa/rc-obbligatoria-natanti]] · [[normativa/pesca-ricreativa-mare]]
- Candidati: [[sintesi/shortlist]] · [[mercato/feed-subito-live]] (tab Vele = osservazione, non shortlist)
