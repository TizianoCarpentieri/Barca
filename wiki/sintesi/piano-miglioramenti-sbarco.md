---
title: Piano miglioramenti Sbarco — sintesi operativa
type: sintesi
updated: 2026-08-23
status: active
tags: [sbarco, worker, review, piano, efficienza, risposte]
sources:
  - wiki/concetti/worker-chiamate-review.md
  - worker/src/index.js
  - worker/test/core.test.mjs
  - presentazione/src/js/sbarco.js
  - presentazione/src/js/sbarco-format.js
---

# Piano miglioramenti Sbarco — sintesi operativa

**v2 — rivisto sul codice** (`worker/src/index.js` v2.4.0, test, client). La
prima stesura regge quasi per intero; questa versione corregge la premessa del
timeout, rende misurabili le verifiche 2–5 e aggiunge tre punti (budget tempo,
cap memoria nel prompt, codice enroll fuori dalla query string). Numerazione
sequenziale per priorità; tra parentesi il numero originale della review
`wiki/concetti/worker-chiamate-review.md` (fonte dei dettagli e delle righe).

## Esito della verifica su codice

- **P0 tutti confermati**: handler `/api/debug-url` irraggiungibile (guard 410
  in cima al router, riga ~1736); README 2.3.2 con mojibake (righe 1, 30–33,
  72, 129); `console.log("[sbarco-line]")` (riga ~1169) logga il testo della
  risposta riga per riga; `diagMarker`/`diagKvProbe` (righe ~1815–1816) non
  usati dal client (grep: zero occorrenze) e assertati in
  `worker/test/core.test.mjs` righe 168–169 e 185–186.
- **Corretta la premessa del punto timeout**: non esiste un cap documentato di
  ~30 s sui fetch outbound di Cloudflare. I limiti reali sono il **CPU time**
  per piano (10 ms free / fino a 5 min paid, dal 2025-03-25) e il **numero di
  subrequest** (50 free; il cap di 1.000 è stato rimosso il 2026-02-11). La
  chiamata DeepSeek è attesa I/O, non CPU: il vincolo da verificare è il piano
  dell'account, non i 55 s.
- **Gap trovati e integrati nel piano**: `maxDuration` non copre la sintesi
  finale (worst case quick ≈ 275 s contro un tetto dichiarato di 70 s);
  `prompt.estimatedTokens` in `/debug` misura solo il prompt iniziale, quindi
  la verifica 2 era impossibile con i dati attuali; la memoria condivisa può
  pesare fino a ~9.600 char nel prompt (12 fatti × 800); il codice di
  enrollment passkey viaggia in query string e finisce nei log Cloudflare.

## I punti, per priorità

### P0 — Pulizie rapide (rischio basso, costo zero)

| # | Ref review | Punto | Effetto |
|---|------------|-------|---------|
| 1 | 1 | Rimuovere l'handler `/api/debug-url` | Codice morto: il 410 del guard lo rende irraggiungibile |
| 2 | 2 | README worker: versione 2.4.0 + byte UTF-8 | Oggi dice 2.3.2 e ha mojibake (`â€"`, `verrÃ `, `Ã¨`) |
| 3 | 13 | Togliere `console.log("[sbarco-line]")` del contenuto | Logga riga per riga la risposta: rumore + testo chat nei log CF. Tenere solo lunghezze/metriche (il log `[sbarco-final] fullTextLen/retryNeeded` diventa una metrica persistita) |
| 4 | 14 | Rimuovere `diagMarker`/`diagKvProbe` da `/api/status` | Client verificato: usa solo `max`/`used`/`remaining`/`unlimited`. Aggiornare i test (righe 168–186) |

### P1 — Affidabilità e qualità delle risposte

| # | Ref review | Punto | Effetto |
|---|------------|-------|---------|
| 5 | 3 | **Retry DeepSeek su 429/5xx**: 1–2 tentativi, backoff con `Retry-After`, richieste idempotenti (nessun side effect prima della risposta: i tool li eseguiamo noi) | Meno chat morte; credito non bruciato per errori transitori. Applicare a `requestAgentStep` **e** alla sintesi finale; per lo stream retry solo se fallisce prima del primo byte, altrimenti percorso non-stream. Mai retry su 400/422 (resta il solo fallback thinking) |
| 6 | nuovo | **Il budget tempo deve coprire anche la sintesi**: il check `maxDuration` gira solo a inizio round; worst case quick ≈ 3×55 s + sintesi 55 s + retry 55 s ≈ 275 s contro un tetto dichiarato di 70 s | Garantisce l'uscita (AGENTS.md §7). Fix: prima di ogni `requestAgentStep` verificare il budget residuo (es. < ~25 s → si salta alla sintesi) |
| 7 | 4 | **Timeout 55 s: verificare, non assumere** | Il vincolo reale è CPU time/subrequest del piano CF (verifica 1). Se emerge un cap pratico, allineare (~28 s) o valutare round in streaming; non cambiare prima della misura |
| 8 | 5 | **Cache KV per `read_wiki`** (riuso `wiki:cache:v6:<path>`, TTL 300 s) | Meno fetch GitHub, meno latenza. Invalidazione = bump versione cache (v7) al commit wiki sostanziale; le modifiche wiki appaiono in chat entro 5 min (già così per context/index). Il test esporta `wikiCacheVersion` → allinearlo |
| 9 | 6 | **Budget tool result + cap memoria**: `read_wiki` 12–16k char (troncati su righe intere, `trimWholeLines`), budget cumulativo ~40k char sui messaggi `tool` con trim dei più vecchi (marker esplicito). In più: la memoria condivisa può pesare ~9.600 char (12×800) → cap ~300 char/fatto nel prompt (in KV restano a 800) | Oggi una pagina arriva a 48k char (~12k token); con 14 tool call il prompt sfora il margine e la sintesi annega. `save_doc` (30k) già non entra nel prompt. **È il punto che più migliora la qualità** |
| 10 | 7 | `fetchWikiPage`: `kv.put` fuori dal try della fetch | Una scrittura KV fallita non butta via il testo appena scaricato |
| 11 | 8 | Cache KV query→risultati DuckDuckGo (TTL ~1 h) | Meno scraping fragile. Terzo motore di fallback solo se la verifica 5 mostra molte ricerche a vuoto |

### P2 — Costi ed efficienza

| # | Ref review | Punto | Effetto |
|---|------------|-------|---------|
| 12 | 9 | Stringere `shouldExtractMemory` (oggi `voglio`, `vogliamo`, `budget`… scattano a vuoto) + max 1 estrazione ogni N messaggi per utente | Meno chiamate LLM extra. Nota: gira in `waitUntil` dopo la risposta → è solo costo, non latenza; usa sempre il modello Base |
| 13 | 10 | Rimborso credito su errore di sistema: decrement con clamp ≥ 0 solo su `agent_error` (provider 429/5xx dopo retry esauriti, timeout provider, errore interno) | La quota non si consuma per guasti. Mai rimborsare cancel/abort client, 400 di validazione o 429 quota. Race tra chat concorrenti accettabile |
| 14 | 15 | Session sliding: rinnovare la session KV solo se manca >2/3 del TTL | Da una scrittura a ogni richiesta a una ogni ~10 min |
| 15 | 16 | `debug:events`: buffer in memoria + flush aggregato (ogni N eventi o a fine chat in `waitUntil`) | Chiave condivisa scritta 2 volte a chat. Read-modify-write last-write-wins ok per telemetria. Riferimento: KV free = 1.000 write/giorno; oggi ~8–12 scritture KV per chat |

### P3 — Sicurezza

| # | Ref review | Punto | Effetto |
|---|------------|-------|---------|
| 16 | 11 | Rate limit per IP su passkey challenge (5/min) ed enroll fallito (~10/min) + confronto codice constant-time (`crypto.subtle.timingSafeEqual` su hash). **In più**: il codice di enrollment oggi è in query string → finisce nei log CF; spostarlo nel body/header della POST | Chiude il brute force e lo spam di challenge in KV. IP da `CF-Connecting-IP` |
| 17 | 12 | Quota Antonio/Peppe senza autenticazione: decidere in gruppo (accettare / PIN con tentativi limitati / token HMAC condiviso). **Collegato da decidere**: deep research costa 1 credito come la rapida su Base pur valendo ~150 s, 6 round + sintesi → valutare deep = 2 crediti o solo su Pro | Oggi chiunque può bruciare i 5 crediti dichiarando `userId`. Da chiudere prima di condividere il sito oltre il gruppo |

### P4 — Minori

| # | Ref review | Punto |
|---|------------|-------|
| 18 | 17 | `DEEPSEEK_BASE_URL` da env (3–4 call site hardcoded) |
| 19 | 18 | `isSafePublicUrl` non copre DNS rebinding: limite noto, accettabile tra amici (i formati numerici/hex sono già coperti dai test) |

## Cose da verificare prima/durante gli interventi

1. **Vincoli reali CF, non i 55 s**: piano dell'account (CPU 10 ms free / 5 min
   paid; subrequest 50 free) + nei log eventuali `CPU time exceeded` o errori
   da subrequest. `firstAgentMs`/`elapsedMs` in `/debug` dicono dove si perde tempo.
2. **Prompt reale vs finestra**: correzione — `prompt.estimatedTokens` in
   `/debug` misura solo il prompt iniziale (pre-tool). Per misurare quello vero
   aggiungere una metrica: `usage.prompt_tokens` dell'ultimo round agente e
   della sintesi (DeepSeek li restituisce; `include_usage` è già attivo sulla
   sintesi) + char totali dei messaggi `tool` prima della sintesi. Senza questa
   metrica la verifica è un'opinione. Decide se il punto 9 è obbligatorio.
3. **Frequenza `finish_reason: "length"`**: oggi non è persistito → aggiungere
   `finishReasons` per round alla metrica. Se tronca spesso a 1.000 token,
   valutare 1.200–1.500 solo dopo la verifica 2.
4. **Sintesi finale a testo vuoto / retry markup**: oggi solo `console.log`
   (`fullTextLen`, `retryNeeded`) → aggiungere `finalTextLen`/`finalRetry` alla
   metrica. Se alta, i candidate dei round sono sprecati (il retry costa una
   chiamata non-stream in più).
5. **Affidabilità DuckDuckGo**: aggiungere contatore `searchesEmpty` (oggi le
   ricerche a vuoto non sono contate). Se alta → cache + terzo motore.
6. **Volume scritture KV e subrequest per chat**: KV free = 1.000 write/giorno;
   stima attuale ~8–12 write/chat (rate, session, debug ×2, history, summary,
   cache wiki). Verificare anche il totale subrequest di una deep research vs
   il limite del piano (50 free): se KV conta come subrequest nel piano attivo,
   il punto 15 diventa prioritario.
7. **Pro thinking in produzione**: fallback 400/422 coperto dai test; verificare
   che `reasoning_content` arrivi prima del contenuto e il client richiuda il
   blocco "Come ho ragionato" (già gestito in `sbarco.js`).
8. **Impatto rimozione diag su test**: client ok (verificato), ma
   `test/core.test.mjs` righe 168–186 asserta i campi → aggiornare insieme;
   idem `wikiCacheVersion` se si bumpa la cache al punto 8.
9. **Memoria condivisa**: monitorare `memory.count` (cap 40) e le `key` tematiche
   per duplicati/fatti superati; il cap ~300 char/fatto del punto 9 riduce il
   peso nel prompt senza toccare il KV.
10. **Latenza quick mode**: il tetto di 70 s oggi non è un tetto (punto 6): con
    il fix del budget residuo il caso peggiore si allinea; misurare prima e dopo.
11. **Costo deep mode per Antonio/Peppe**: decisione di gruppo insieme al punto 17.

## Migliorare le risposte senza alzare i budget

- **Prima di alzare numeri** (MAX_HISTORY, token, round) completare la verifica
  2 con la metrica corretta: il margine si guadagna riducendo il prompt in
  ingresso (tool result, memoria, cache, euristiche), non alzando l'output.
- Con prompt più snelli il modello segue meglio le regole del system prompt
  (conclusione prima, citazioni, markdown) e la sintesi finale ha spazio.
- **Le metriche prima delle decisioni**: i punti di misura delle verifiche 2–5
  sono due righe di codice ciascuno e vanno aggiunti in P1 prima di decidere i
  budget; senza, le verifiche restano impressioni.
- **Opzionale futuro**: riassunto LLM periodico del summary solo quando sta per
  traboccare, al posto del solo trim meccanico. Da misurare prima.

## Opzionale: chat non vuota al riavvio

Problema: il trascritto vive solo nel DOM (`msgsEl`); al reload la chat riparte
vuota anche se il worker conserva la cronologia in KV (`chat:{userId}`).

**Soluzione consigliata (client-side, zero costi worker):**
- Salvare in `localStorage` il trascritto per utente (`barca_transcript:{userId}`),
  testo sorgente (non HTML), cap ~50 messaggi o ~60 KB, cap ~6.000 char per
  messaggio, write con debounce ~500 ms a fine stream.
- Al load, se l'utente corrente ha un trascritto → ri-renderizzare con
  `renderMarkdown` (verificato: costruisce HTML con `escapeHtml`, ri-render
  sicuro). Il ripristino va agganciato a `setUser` (che oggi svuota `msgsEl`);
  per Tiziano solo dopo la passkey/session, come già per la selezione utente.
- Gestire `QuotaExceededError` (try/catch e drop dei messaggi più vecchi).
- Pro: nessun nuovo endpoint, privacy ok (resta sul device), UI coerente con ciò
  che Sbarco ricorda. Contro: si perde cambiando browser/device.

**Alternativa non consigliata**: endpoint `GET /api/chat/history` — esporrebbe
le chat di Antonio/Peppe senza autenticazione.

## Ordine di esecuzione consigliato

1. **P0** (1–4) + aggiornamento test.
2. **P1** (5–11) con le metriche delle verifiche 2–5 incluse; verifiche 1 e 6 in
   parallelo. Il punto 9 (budget tool result) si applica subito dopo la verifica 2.
3. **P2** (12–15).
4. **P3** (16–17) prima di condividere il sito oltre il gruppo.
5. Opzionale: persistenza trascritto client.
6. Dopo ogni modifica: `node --test` in `worker/`, build `presentazione/`,
   `node scripts/lint-wiki.mjs`, smoke post-deploy (domanda rapida + deep research).

## Stato di esecuzione (2026-08-23)

| Punti | Stato |
|-------|-------|
| P0 (1–4) | **Fatto**: dead code rimosso, README 2.4.0 UTF-8, log senza contenuto di chat, campi diag rimossi e test allineati |
| P1 (5–11) | **Fatto**: retry 429/5xx con backoff, budget tempo con riserva per la sintesi + timeout dinamico per step, metriche nuove in `/debug` (finishReasons, searchesEmpty, finalTextLen/finalRetry, lastAgentPromptTokens, preSynthesis*), cache KV `read_wiki` e DuckDuckGo, cap 16k/pagina + 40k cumulativo + 300 char/fatto memoria, `kv.put` fuori dal try |
| P2 (12–15) | **Fatto**: euristiche memoria ristrette (domande scartate prima, "voglio sapere…" escluso, finestra 6 h per utente), rimborso credito su `agent_error` (mai su cancel), session renew solo dopo 1/3 del TTL, `debug:events` bufferizzato con flush a fine chat |
| P3 (16) | **Fatto**: rate limit per IP su challenge/enroll, confronto codice a tempo costante (SHA-256 + compare senza uscite anticipate), codice enroll nel body POST (mai più in query string) |
| P3 (17) | **Deciso in gruppo**: quota Antonio/Peppe senza PIN accettata (gruppo piccolo, CORS già limita le origini); deep mode resta a 1 credito |
| P4 (18–19) | **Fatto** `DEEPSEEK_BASE_URL` da env; DNS rebinding accettato come limite noto |
| 20 (nuovo) | **Fatto**: modalità **ricerca estesa** (censimenti/multi-località: 12 round, 12 ricerche, 16 pagine, 48 tool call, tetto 300 s, garanzie di uscita invariate) con costo scalato Base 3 / Pro 5 e **regola esaurimento-richiesta**: parte con ≥1 credito, consuma `min(costo, residuo)` e completa comunque |
| Verifiche | 1 e 6: da completare sui log reali post-deploy; 2–5: metriche ora disponibili in `/debug`; 10: coperta dal fix del punto 6 |

Test worker dopo gli interventi: 53/53 verdi (`node --test`, isolamento
in-process per il sandbox; la CI esegue `npm test` completo su Ubuntu).
