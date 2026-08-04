---
description: Health-check della wiki barca (contraddizioni, orphan, gap)
agent: build
---

Esegui **lint** della knowledge base (`wiki/`) secondo AGENTS.md e skill llm-wiki.

1. Scansiona index e pagine principali
2. Segnala e dove possibile correggi: contraddizioni, claim senza fonte, orphan, concetti mancanti, open-questions stantie, shortlist disallineata
3. Appendi log `## [YYYY-MM-DD] lint | ...`
4. Propone 3–5 prossime ricerche utili
