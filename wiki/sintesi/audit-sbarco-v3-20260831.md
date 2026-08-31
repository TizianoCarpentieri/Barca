---
title: Audit Sbarco v3 — orchestrazione evidence-first
type: sintesi
updated: 2026-08-31
status: active
tags: [sbarco, graphify, orchestrazione, pdf, memoria]
sources:
  - worker/src/index.js
  - worker/src/project-graph.js
  - worker/graph.json
  - presentazione/src/js/sbarco.js
  - presentazione/src/js/sbarco-pdf.js
  - docs/superpowers/specs/2026-08-31-sbarco-orchestratore-v3-design.md
---

# Audit Sbarco v3 — orchestrazione evidence-first

## Esito

Sbarco 3.0 separa tre decisioni che prima erano accoppiate:

1. **tier modello**: Base `deepseek-v4-flash` / Pro `deepseek-v4-pro`;
2. **profondità**: rapida / profonda (≥2 passaggi) / estesa (≥3 passaggi);
3. **fonti**: Graphify+wiki sempre per il progetto, web solo quando serve.

Di conseguenza una modalità profonda può analizzare il patto, confrontare
alternative o creare un PDF senza fare ricerche online. Una domanda su prezzi
attuali o normativa vigente attiva invece il percorso web verificato.

## Fondamento prima del modello

- `worker/graph.json` è una proiezione runtime del grafo Graphify, non più un
  file decorativo o soltanto per gli agenti di sviluppo.
- Prima della prima chiamata LLM, `queryProjectGraph()` trova nodi e relazioni,
  ordina le pagine candidate e il Worker apre fino a due pagine wiki.
- Le etichette del grafo servono a navigare; i claim devono poggiare sul testo
  wiki aperto o su URL letti.
- Il taccuino evidenze compatto conserva path, URL e contenuti chiave anche
  quando i risultati raw più vecchi vengono eliminati dal prompt.

## Token e memoria

- Storico: massimo 4 messaggi / 4.800 caratteri, caricato soltanto nei follow-up
  contestuali. Una domanda autonoma non trascina l'intera conversazione.
- Digest storico: massimo 900 caratteri, anch'esso solo nei follow-up.
- Memoria condivisa: fino a 8 fatti pertinenti, 220 caratteri per fatto.
- Risultati tool: 9.000 caratteri ciascuno, 24.000 cumulativi; taccuino evidenze
  12.000 caratteri.
- Output: 2.600 token per il primo passaggio rapido, 3.200 per la sintesi finale,
  fino a due continuazioni se il provider termina per lunghezza.

## PDF

`save_doc` resta disponibile ma non è più un punto singolo di fallimento. Per
ogni richiesta PDF il Worker materializza la sintesi completa; se questa è
debole, può ripiegare sulla pagina wiki già individuata. Il client supporta:

- temi `nautico`, `cantiere`, `minimal`;
- orientamento automatico, verticale o orizzontale;
- landscape automatico per tabelle da almeno cinque colonne;
- colore accento, densità, sottotitolo e copertina;
- tabelle adattive, intestazioni ripetute e impaginazione multipagina.

## Verifiche locali

- Worker: 77 test, inclusi Graphify runtime, routing web, due/tre passaggi,
  cronologia contestuale, PDF fallback e continuazioni anti-troncamento.
- Frontend/PDF: 38 test, build Vite e render PDF visivo.
- Il dry-run Wrangler sul grafo definitivo produce un bundle da 598,09 KiB
  (79,26 KiB gzip).
- Prima della pubblicazione resta lo smoke live dopo deploy; il deploy non è
  implicito in questo audit.

Dettaglio operativo: [[concetti/architettura-sbarco]].
