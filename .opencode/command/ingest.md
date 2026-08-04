---
description: Ingerisci una fonte (path o URL) nella knowledge base barca
agent: build
---

Esegui il workflow **ingest** del progetto Barca (vedi AGENTS.md e skill llm-wiki).

Input utente: $ARGUMENTS

1. Se è un URL, scarica/salva riferimento in `raw/` nella sottocartella adatta.
2. Se è un path, usalo come fonte (copia sotto `raw/` se non c'è già).
3. Estrai fatti rilevanti per l'acquisto della barca a motore del gruppo.
4. Aggiorna le pagine wiki necessarie, `wiki/index.md`, `wiki/overview.md` se cambia lo stato, e appendi a `wiki/log.md`.
5. Propaga preferenze se emergono.
6. Riassumi all'utente cosa è stato integrato e cosa resta aperto.
