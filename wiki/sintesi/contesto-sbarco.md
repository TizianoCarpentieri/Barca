---
title: Contesto operativo Sbarco
type: sintesi
updated: 2026-08-11
status: active
tags: [sbarco, contesto, source-of-truth]
sources: [wiki/overview.md, wiki/preferenze/must-have.md, wiki/preferenze/budget.md, wiki/preferenze/open-questions.md]
---

# Contesto operativo Sbarco

Pagina compatta usata dal bot come contesto primario. Contiene solo lo stato
corrente; i dettagli e la storia restano nelle pagine collegate.

## Decisione corrente

- **Piano A:** gommone pneumatico smontabile, non RIB, trasportabile in auto.
- **Piano B:** scafo rigido soltanto con almeno 5 soci e preventivi reali.
- **Gruppo:** Tiziano, Antonio e Peppe; base Ardea/Pomezia, mare laziale.
- **Uso:** 3 comodi per pesca; fino a circa 6 solo come picco sociale.

## Vincoli economici e tecnici

| Voce | Valore corrente |
|------|-----------------|
| Bundle gommone + motore | **massimo 2.000 €**, preferibilmente usato |
| Costi fissi | **massimo 30 €/testa/mese** |
| Gommone | 3,30–3,90 m; paiolato alluminio o airdeck; chiglia gonfiabile preferita |
| Motore | minimo 6 CV; sweet spot 9.9–15 CV; 4T, gambo corto |
| Patente | nessuno la possiede; target entro i limiti senza patente |
| Benchmark | [[modelli/argo-evo-360]] nuovo a 970 €; usato equivalente senza motore almeno −20% |

## Priorità

1. Pesca a canna per le tre bestie.
2. Giri costieri nel Lazio.
3. Bagno, relax e amici.
4. Facilità operativa, accettando un po’ di montaggio per contenere i costi.

## Questioni ancora aperte

- Auto adatta, luogo di custodia e divisione del lavoro di montaggio.
- Accesso/scivolo pratico vicino alla base.
- Preventivi reali per assicurazione, manutenzione, documenti e dotazioni.
- Accordo scritto tra soci.
- Shortlist di bundle realmente ispezionabili entro budget.

Dettaglio e checklist: [[preferenze/open-questions]].

## Regole di affidabilità

- Le stime di costo non verificate vanno dichiarate come stime.
- Normativa, prezzi e disponibilità correnti richiedono fonti aggiornate.
- Le pagine storiche sullo scafo rigido non descrivono il piano attuale.
- Una ricerca web utile privilegia 2–5 fonti lette e confrontate, non decine di snippet.
- Quando l'utente chiede un documento o un PDF, `save_doc` prepara contenuto
  strutturato: il widget lo esporta in PDF A4 direttamente nel browser.
- Non ridurre i tetti dell'output sotto 1.000 token per step e 2.600 per la
  sintesi finale senza una prova esplicita: in passato ha causato risposte o
  formattazione visualizzate in modo incompleto. Ottimizzare prima il prompt.

## Percorsi di approfondimento

- Requisiti: [[preferenze/must-have]] · [[sintesi/requisiti-v1]]
- Budget: [[preferenze/budget]] · [[concetti/costi-nascosti-gommone]]
- Logistica: [[concetti/logistica-trasporto]] · [[concetti/montaggio-gommone]]
- Motori e scafo: [[preferenze/track-motori]] · [[preferenze/track-gommoni]]
- Normativa: [[normativa/limiti-senza-patente]]
- Candidati: [[sintesi/shortlist]] · [[mercato/feed-subito-live]]
