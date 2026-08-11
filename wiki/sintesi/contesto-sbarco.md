---
title: Contesto operativo Sbarco
type: sintesi
updated: 2026-08-11
status: active
tags: [sbarco, contesto, source-of-truth]
sources: [wiki/overview.md, wiki/preferenze/must-have.md, wiki/preferenze/budget.md, wiki/preferenze/split-costi.md, wiki/preferenze/open-questions.md]
---

# Contesto operativo Sbarco

Pagina compatta usata dal bot come contesto primario. Contiene solo lo stato
corrente; i dettagli e la storia restano nelle pagine collegate.

## Decisione corrente

- **Piano A:** gommone pneumatico smontabile, non RIB, trasportabile in auto.
- **Piano B:** scafo rigido soltanto con almeno 5 soci e preventivi reali.
- **Gruppo:** Tiziano, Antonio e Peppe; base Ardea/Pomezia, mare laziale.
- **Uso:** 3 comodi per pesca; fino a circa 6 solo come picco sociale.
- **Quote Sbarco:** Tiziano illimitato; Antonio e Peppe 5 utilizzi giornalieri
  ciascuno, con rinnovo a mezzanotte nel fuso Europe/Rome.

## Vincoli economici e tecnici

| Voce | Valore corrente |
|------|-----------------|
| Bundle gommone + motore | **massimo 2.000 €**, preferibilmente usato |
| Costi fissi gommone | **non hard-cap 30 €/testa/mese**; attesi RC + tagliando (pochi €/testa/mese se preventivi ok); carburante = variabile uscite |
| Gommone | **min 3,90 m**; nessun max duro se auto/trasporto ok; 3 comodi, 4+ preferibile, 6 bonus; paiolato Al o airdeck; chiglia gonfiabile preferita |
| Motore | **9–40 CV**, purché senza patente; 4T preferito; gambo compatibile con lo scafo |
| Patente | nessuno la possiede; target entro i limiti senza patente |
| Split / uso | 1/N; uscite di **gruppo** come normale |
| Benchmark | [[modelli/argo-evo-360]] nuovo a 970 €; usato equivalente senza motore almeno −20% |

## Priorità

1. Pesca a canna per le tre bestie.
2. Giri costieri nel Lazio.
3. Bagno, relax e amici.
4. Facilità operativa, accettando un po’ di montaggio per contenere i costi.

## Questioni ancora aperte

- Auto adatta, luogo di custodia (anche patio se idoneo) e carico/scarico pratico.
- Accesso mare lecito vicino alla base.
- Preventivi reali RC, tagliando, documenti e dotazioni.
- Finalizzare/firmare patto (bozza in cantiere; **non** ancora in wiki).
- Shortlist di bundle ispezionabili entro 2.000 €.
- Uscite solitarie: sì/no definitivo.

Dettaglio e checklist: [[preferenze/open-questions]].

## Regole di affidabilità

- Le stime di costo non verificate vanno dichiarate come stime.
- Normativa, prezzi e disponibilità correnti richiedono fonti aggiornate.
- Le pagine storiche sullo scafo rigido non descrivono il piano attuale.
- Una ricerca web utile privilegia 2–5 fonti lette e confrontate, non decine di snippet.
- Quando l'utente chiede un documento o un PDF, `save_doc` prepara contenuto
  strutturato: il widget lo esporta in PDF A4 direttamente nel browser.
- Il PDF va offerto solo tramite la scheda `save_doc`; sulle normali risposte
  resta l'azione Copia, evitando export poco strutturati del testo libero.
- Se l'utente chiede esplicitamente un PDF, la scheda `save_doc` con il tasto
  **Scarica PDF** è obbligatoria; non basta dichiarare nel testo che è pronto.
- Non ridurre i tetti dell'output sotto 1.000 token per step e 2.600 per la
  sintesi finale senza una prova esplicita: in passato ha causato risposte o
  formattazione visualizzate in modo incompleto. Ottimizzare prima il prompt.
- La quota di Tiziano deve restare illimitata. Eventuali reset delle quote
  giornaliere non devono cancellare memoria o cronologia delle chat.

## Percorsi di approfondimento

- Requisiti: [[preferenze/must-have]] · [[sintesi/requisiti-v1]]
- Budget: [[preferenze/budget]] · [[concetti/costi-nascosti-gommone]]
- Logistica: [[concetti/logistica-trasporto]] · [[concetti/montaggio-gommone]]
- Motori e scafo: [[preferenze/track-motori]] · [[preferenze/track-gommoni]]
- Normativa: [[normativa/limiti-senza-patente]]
- Candidati: [[sintesi/shortlist]] · [[mercato/feed-subito-live]]
