---
type: "query"
date: "2026-08-31T17:29:19.347588+00:00"
question: "Rendere Sbarco meno rigido: profondita indipendente dal web, Graphify e wiki prima delle risposte, storico bounded e PDF resilienti personalizzabili"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Architettura e flusso di Sbarco", "Modalità", "Memoria e wiki", "Output e interfaccia", "Garanzie di uscita"]
---

# Q: Rendere Sbarco meno rigido: profondita indipendente dal web, Graphify e wiki prima delle risposte, storico bounded e PDF resilienti personalizzabili

## Answer

Implementato Sbarco 3.0 evidence-first. Query espansa su: Sbarco, worker, buildSystemPrompt, TOOLS, createChatSSEStream, streamForcedFinal, Graphify, wiki, memoria, PDF. Il Worker interroga una proiezione Graphify e apre la wiki prima del modello; deep ed extended impongono passaggi di revisione ma non il web; la rete viene scelta per dati correnti o lacune; lo storico entra solo nei follow-up; i PDF hanno fallback dalla sintesi/wiki e temi/orientamento personalizzabili.

## Outcome

- Signal: useful

## Source Nodes

- Architettura e flusso di Sbarco
- Modalità
- Memoria e wiki
- Output e interfaccia
- Garanzie di uscita