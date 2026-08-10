---
title: Audit Sbarco e wiki — 10 agosto 2026
type: sintesi
updated: 2026-08-10
status: active
tags: [audit, sbarco, deep-research, wiki, mobile]
sources: [lavoroDeepSeekdel10agosto.md, worker/src/index.js, presentazione/src/js/sbarco.js, wiki/]
---

# Audit Sbarco e wiki — 10 agosto 2026

## Esito

Il mancato output della deep research non dipendeva soltanto dal consumo di
token. Era soprattutto un difetto di protocollo: dopo il tool loop il Worker
apriva una nuova chiamata streaming lasciando nuovamente disponibili i tool,
ma il parser leggeva solo `delta.content`. Una nuova `tool_call` veniva quindi
ignorata e il client riceveva `done` senza testo.

## Problemi trovati

| Gravità | Problema | Impatto |
|---------|----------|---------|
| critica | Seconda chiamata streaming con tool, delta tool ignorati | risposta vuota |
| alta | Fino a 8 round × 8.000 token prima di restituire la Response | latenza/costo e percezione di blocco |
| alta | Nessun progresso o heartbeat nel widget | l’utente non sa se il bot lavora |
| alta | `remember` rispondeva “salvato” senza scrivere in KV | memoria dichiarata ma inesistente |
| alta | Persistenza avviata dopo lo stream senza `waitUntil` e con scritture concorrenti | history/memory non affidabili |
| media | Summary composta da “poi altri 2 messaggi” | contesto sprecato senza informazione |
| media | Debug solo in RAM dell’istanza | `/debug` spesso vuoto dopo cold start |
| media | Parser DuckDuckGo/URL fragile e letture web senza timeout/limite | ricerca instabile |
| media | Contatore client presunto, riabilitato anche a quota zero | UX incoerente |
| media | Wiki con shortlist rigidi primaria e pagine storiche marcate active | risposte contraddittorie |

## Correzioni implementate

- SSE aperto subito, avanzamento per fase e heartbeat.
- Modi rapido e deep con budget espliciti e fonti aperte in parallelo.
- Sintesi conclusiva obbligatoria senza strumenti disponibili.
- Limiti di caratteri, timeout web, controllo URL pubblici e normalizzazione link.
- Memoria `remember`, cronologia, summary e debug KV resi effettivi.
- Widget mobile full-screen, safe-area, textarea, annullamento e fallback vuoto.
- Contesto bot concentrato in [[sintesi/contesto-sbarco]].
- Grafo rimosso dal bundle del Worker: Graphify resta dedicato alla navigazione
  del repository, mentre Sbarco carica da KV solo il contesto wiki necessario.
- Wiki riallineata e lint automatico senza errori.

Dettaglio tecnico: [[concetti/architettura-sbarco]].

## Limiti residui dichiarati

- DuckDuckGo HTML non offre SLA: una futura API di ricerca sarebbe più stabile.
- Il rate limit KV non è transazionale e i tre user ID non sono autenticati.
- La memoria KV non aggiorna automaticamente la wiki: i fatti utili vanno ingeriti.
- Il deploy di produzione e lo smoke test live non fanno parte di questa revisione locale.
- Il piano rigido resta documentato, ma va trattato come scenario condizionale.

## Gate prima del deploy

1. `node --check worker/src/index.js`
2. `node --test --test-isolation=none worker/test/core.test.mjs`
3. `node scripts/lint-wiki.mjs`
4. build Vite di `presentazione/`
5. aggiornamento Graphify
6. smoke test live: rapido, deep, annulla, quota zero, `/debug`
