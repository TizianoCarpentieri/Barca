---
title: Worker Sbarco — inventario chiamate e punti migliorabili
type: concetto
updated: 2026-08-23
status: active
tags: [sbarco, worker, review, deep-research, costi]
sources: [worker/src/index.js, worker/README.md, worker/test/core.test.mjs]
---

# Worker Sbarco — inventario chiamate e punti migliorabili

Review del `worker/src/index.js` (v2.4.0) sulle **chiamate** che il Worker può
fare: a quali servizi, con quali budget, e dove ci sono margini di
miglioramento. Test di riferimento: 42/42 verdi (`node --test` in `worker/`).

## Inventario delle chiamate

### A. DeepSeek Chat Completions (`https://api.deepseek.com/v1/chat/completions`)

| Chiamata | Quando | Tipo | Budget | Note |
|----------|--------|------|--------|------|
| `requestAgentStep` | 1 per round agente (max 6 deep / 3 quick) | POST non-stream, `tools`, `tool_choice` auto/forzato | `max_tokens: 1000`, temp 0.35, thinking off | timeout 55 s |
| `streamForcedFinal` | sintesi finale quando manca testo candidato | POST stream, `tool_choice: none` | `max_tokens: 2600`, temp 0.3, thinking on per Pro (`reasoning_effort: high`), `include_usage` | fallback singolo senza thinking su 400/422 |
| retry sintesi (markup-only) | se la sintesi emette solo markup | POST non-stream, `tool_choice: none` | `max_tokens: 2600`, thinking off | 1 solo tentativo |
| `extractMemoryIfNeeded` | background, se `shouldExtractMemory` (euristiche) | POST non-stream, `response_format: json_object` | `max_tokens: 500`, temp 0.1, modello Base | timeout 30 s; silenziosa su errore |

### B. Chiamate web (non-LLM)

| Chiamata | Endpoint | Budget | Cache |
|----------|----------|--------|-------|
| `fetchWikiPage` | GitHub Raw (`raw.githubusercontent.com/tizianocarpentieri/Barca/main`) per context + index | 2 pagine a chat | **KV** `wiki:cache:v6:*`, TTL 300 s; fallback `EMBEDDED_WIKI` per context |
| `executeReadWiki` (tool `read_wiki`) | GitHub Raw per pagina wiki arbitraria | illimitata (bounded da MAX_TOOL_CALLS) | **nessuna**: fetch a ogni chiamata |
| `executeSearchWeb` (tool `search_web`) | `html.duckduckgo.com/html/` → fallback `lite.duckduckgo.com/lite/` | max 3 a chat | nessuna |
| `executeReadUrl` (tool `read_url`) | URL pubblici arbitrari, redirect controllati (SSRF) | max 5 a chat | nessuna; 96 KB letti, 6.000 char al modello |

### C. KV interno (`SBARCO_KV`)

`memory:project` · `chat:{userId}` · `chat:{userId}:summary` · `rate:v2-20260811:*` ·
`auth:tiziano:passkey` · `auth:tiziano:challenge:*` · `auth:tiziano:session:*` ·
`wiki:cache:v6:*` · `debug:events`.

### D. Endpoint esposti

`/api/chat` (POST, SSE) · `/api/status` (GET) · `/api/health` · `/api/passkey/challenge` ·
`/api/passkey/enroll` · 410 legacy (`/api/search`, `/api/export`, `/api/debug-url`) ·
**handler `/api/debug-url` irraggiungibile** (il 410 in cima al router lo copre: codice morto).

## Punti migliorabili

### Bug / codice morto (facili, a costo zero)

1. **Rimuovere l'handler `/api/debug-url`** (riga ~1972): già ritirato con 410
   dal guard in cima al router; il ramo non è mai raggiungibile.
2. **README obsoleto e con encoding rotto**: dichiara versione 2.3.2 (codice è
   2.4.0) e ha mojibake (`â€"`); riscrivere i byte UTF-8 e allineare la versione.

### Affidabilità

3. **Nessun retry su DeepSeek per 429/5xx** — un errore transitorio del provider
   manda in errore l'intera chat **dopo** che il credito è stato scalato.
   Suggerito: 1–2 retry con backoff (solo 429/5xx, richieste idempotenti), sotto
   il tetto di durata del round.
4. **Timeout DeepSeek 55 s vs limite fetch outbound di Cloudflare** (~30 s):
   il timeout applicato probabilmente non scatta mai per primo. Verificare e
   allineare (~28 s), o spostare i round agente su streaming per superare il cap.
5. **`read_wiki` non usa la cache KV** mentre context/index sì: la stessa pagina
   (es. `wiki/documenti/patto.md`) viene riscaricata a ogni richiesta.
   Suggerito: riusare `wiki:cache:v6:<path>` con TTL breve (o invalidazione
   esplicita al commit wiki).
6. **Crescita del prompt con i risultati dei tool**: `read_wiki` restituisce fino
   a 48.000 caratteri (~12k token); con 14 tool call il contesto può superare la
   finestra del modello (errore 400 o degrado). Suggerito: cap per pagina ridotto
   (12–16k) e/o budget cumulativo sui tool result con trim dei messaggi più vecchi.
7. **`fetchWikiPage`: `kv.put` dentro il try della fetch** — se la scrittura KV
   fallisce (throttle) dopo un download riuscito, il catch butta via il testo
   appena scaricato e ripiega sul fallback. Separare put e fetch nei try/catch.
8. **Scraping DuckDuckGo fragile**: struttura HTML a rischio di modifiche/blocco.
   Suggerito: cache KV query→risultati (TTL ~1 h) per ridurre chiamate e latenza.

### Costi

9. **Estrazione memoria = chiamata LLM extra per chat**: le euristiche di
   `shouldExtractMemory` sono molto ampie (`vorrei`, `voglio`, `budget`…), anche
   su frasi che non contengono preferenze → `extractMemoryIfNeeded` (max 500
   token) gira a vuoto. Suggerito: stringere i pattern e/o massimo 1 estrazione
   ogni N messaggi per utente.
10. **Credito scalato anche su errore di sistema**: `incrementRateLimit` avviene
    prima dello stream; su `agent_error` l'utente perde il credito. Valutare
    rimborso (decremento) nel catch per errori di sistema, non per cancel utente.

### Sicurezza / abuso

11. **Passkey challenge/enroll senza rate limit**: `challenge` scrive in KV a
    ogni chiamata (spam facile) e `enroll` permette brute force sul codice segreto
    (confronto stringhe non constant-time, nessun throttling). Suggerito: rate
    limit per IP (es. 5/min) e confronto a tempo costante.
12. **Quota Antonio/Peppe senza autenticazione**: chiunque può bruciare i 5
    crediti giornalieri dichiarando `userId: antonio/peppe`. Trade-off di
    semplicità voluto; da decidere se introdurre un PIN semplice o accettare il
    rischio (gruppo piccolo, uso familiare).

### Telemetria / privacy

13. **`console.log("[sbarco-line]")` logga il contenuto della risposta** riga per
    riga: rumore nei log e dati di chat esposti nei log Cloudflare. Suggerito:
    loggare solo lunghezze e metriche, non il testo.
14. **Residui diagnostici in `/api/status`**: `diagMarker: "probe-v1"` e
    `diagKvProbe` sono resti di debug; rimuoverli o spostarli sotto `/debug`.

### Minori

15. **Session sliding**: `verifyTizianoSession` fa KV get+put a ogni richiesta;
    rinnovare solo quando manca >1/3 del TTL.
16. **`debug:events` get+put a ogni chat** (chiave condivisa): bufferizzare in
    memoria e persistere meno spesso.
17. **URL DeepSeek hardcoded**: esporre `DEEPSEEK_BASE_URL` da env per test e
    futuri gateway.
18. **`isSafePublicUrl`**: non copre DNS rebinding (limite noto e accettabile per
    un uso tra amici; i formati numerici/hex già coperti dai test).

## Priorità consigliate

1. **Rapide e sicure**: 1, 2, 13 (rimozione dead code, README, log del contenuto).
2. **Affidabilità**: 3 (retry DeepSeek), 5 (cache `read_wiki`), 7 (put KV separato).
3. **Costi**: 9 (euristiche estrazione memoria), 10 (rimborso credito su errore).
4. **Sicurezza**: 11 (rate limit passkey) — da fare prima di condividere il sito oltre il gruppo.

Nessun punto richiede modifiche strutturali all'architettura: sono ritocchi
locali con test già presenti (`node --test` in `worker/`).

## Revisione 2026-08-23 (v2)

Verifica sul codice della sintesi [[sintesi/piano-miglioramenti-sbarco]]:

- Punto 4 **corretto**: non esiste un cap documentato di ~30 s sui fetch
  outbound di Cloudflare; i limiti reali sono il CPU time per piano (10 ms
  free / fino a 5 min paid, dal 2025-03-25) e il numero di subrequest (50
  free; cap di 1.000 rimosso il 2026-02-11). Il timeout di 55 s resta valido,
  ma la verifica va fatta su piano account e log, non su un presunto cap fetch.
- Aggiunti alla sintesi tre punti nuovi: budget tempo che copra anche la
  sintesi finale (oggi `maxDuration` non la limita), cap ~300 char/fatto della
  memoria condivisa nel prompt (12×800 ≈ 9.600 char), codice di enrollment
  passkey fuori dalla query string (finisce nei log CF).
- Le verifiche 2–5 della sintesi richiedono metriche oggi assenti
  (`prompt.estimatedTokens` misura solo il prompt iniziale; `finish_reason`,
  `finalTextLen`/`finalRetry` e `searchesEmpty` non sono persistiti): vanno
  aggiunte in P1 prima di decidere i budget.
