---
title: Architettura e flusso di Sbarco
type: concetto
updated: 2026-08-23
status: active
tags: [sbarco, bot, deep-research, worker]
sources: [worker/src/index.js, presentazione/src/js/sbarco.js, presentazione/src/js/sbarco-format.js, presentazione/src/js/sbarco-pdf.js]
---

# Architettura e flusso di Sbarco

## Flusso chat

```text
widget mobile
  → POST /api/chat
  → SSE aperto subito
  → contesto wiki + memoria KV
  → tool loop limitato
  → sintesi finale senza tool
  → risposta + metriche + persistenza KV
```

Il client riceve eventi di stato durante la lavorazione, quindi una ricerca
lunga non appare più come una chat bloccata.

## Modalità

| Modalità | Uso | Budget |
|----------|-----|--------|
| Rapida/auto | domande sul progetto e wiki | fino a 3 round; step da 1.000 token |
| Ricerca profonda | prezzi, normativa, dati correnti e richiesta esplicita | fino a 6 round; step da 1.000 token |

La ricerca profonda usa al massimo 3 ricerche, 5 pagine web lette, 14 chiamate
strumento complessive e 4 strumenti concorrenti. Ogni fonte web ha timeout di
12 secondi. Raggiunto un limite, Sbarco deve sintetizzare quanto raccolto.

## Latenza percepita e misurata

- Il widget mostra subito una riga di lavoro grigio-luminosa e la aggiorna con
  fasi reali o messaggi di attesa durante gli heartbeat.
- I round intermedi mantengono il margine collaudato di 1.000 token; la sintesi
  finale dispone di 2.600 token. I risparmi riguardano il prompt in ingresso,
  non il tetto dell'output visibile, per evitare Markdown o tabelle troncati.
- Il `thinking` DeepSeek è **disattivato nei round con strumenti** (incompatibilità
  nota V4 con `tool_choice` nel loop agente) ma è **attivo sulla sintesi finale Pro**
  (`tool_choice: "none"`, con `reasoning_effort: "high"`). Se il provider rifiuta il
  parametro, un solo retry senza thinking: metriche `thinking: on/off/fallback`.
- Su Pro il candidate del loop agente non diventa più la risposta finale: si passa
  sempre alla sintesi in streaming con thinking. Su Base resta il percorso diretto.
- Il ragionamento della sintesi Pro arriva come evento SSE dedicato `{reasoning: "…"}`
  e il client lo mostra nel blocco ripiegabile "Come ho ragionato", aperto durante il
  ragionamento e richiuso al primo token della risposta. Mai fuso nel testo visibile.
- La profondità di Base deriva dalla sequenza obbligatoria di ricerche e letture,
  non da token di ragionamento.
- Ogni evento persistito in `/debug` separa `contextReadyMs`, `firstAgentMs`,
  `firstTokenMs` ed `elapsedMs`, così un rallentamento è localizzabile.
- `/debug` registra anche token effettivi cumulativi, stima caratteri/token del
  prompt e se lo stream è nativo del provider o cadenzato dal Worker.
- Una ricerca restituisce fino a 6 risultati e ogni pagina fornisce al modello
  al massimo 6.000 caratteri, riducendo il prompt senza eliminare il confronto.

## Garanzie di uscita

- La risposta HTTP inizia prima dei round LLM e invia heartbeat periodici.
- La sintesi conclusiva non riceve strumenti (`tool_choice: none`).
- Il parser SSE ricompone frame CRLF, frame spezzati tra chunk e l'ultimo frame
  privo di newline; il client fa lo stesso.
- Una risposta rapida già completa viene emessa in frame cadenzati. Questo
  evita che rete e browser accorpino tutti i token in un solo aggiornamento.
- Il client rivela i token a cadenza visibile (cursore in coda), anche se
  Cloudflare consegna l’intera risposta in un unico read. Con
  `prefers-reduced-motion` il testo arriva intero.
- Se il modello chiude senza contenuto, il client mostra un errore esplicito.
- Le chiamate agli strumenti emesse da DeepSeek come markup nel contenuto
  (`<|DSML|function_calls>…` oppure `<|tool_calls>…` senza prefisso) vengono
  estratte, eseguite come tool veri e mai mostrate all'utente; lo stesso
  markup viene rimosso da ogni testo candidato.
- La sanificazione (`stripToolCallMarkup`) copre anche le varianti con pipe
  fullwidth (`｜`, `▁`) e i blocchi `<think>…</think>` (aperti o chiusi) e
  **preserva gli a-capo** del testo visibile: la risposta resta markdown
  strutturata anche quando nasce in un round agente. Vale per candidate,
  sintesi in streaming, retry e contenuto `save_doc`.
- Anche la sintesi finale in streaming filtra riga per riga il markup di
  chiamate strumenti. Se dopo il filtro il testo e' vuoto o minimo, il Worker
  ritenta una sola volta la sintesi senza strumenti e senza tag; se fallisce
  ancora, arriva un errore esplicito. Il markup non puo' raggiungere la chat.
- Timeout, budget e annullamento impediscono ricerche senza fine.
- `/debug` legge anche gli ultimi eventi persistiti in KV, non solo la memoria dell’istanza.

## Protezioni runtime

- Il Worker accetta chat e status dall'origine Pages configurata, ritira gli
  endpoint legacy e non espone testi di chat o memoria in `/debug`.
- L'identità `tiziano` richiede una **passkey platform** per lo sblocco iniziale
  (WebAuthn + biometria/PIN del Galaxy). Dopo la verifica il Worker emette una
  **session token** (header `X-Tiziano-Session`, TTL 30 minuti sliding, hash in
  KV). Chat e status accettano la session al posto di una nuova asserzione
  passkey; a scadenza si ripete una sola conferma biometrica. Il selettore del
  browser non costituisce autenticazione. Il rinnovo scrive KV solo quando è
  trascorso più di 1/3 del TTL: meno scritture, stessa durata utile.
- La prima associazione richiede un codice segreto esterno al repository; KV
  conserva soltanto id credenziale, chiave pubblica e contatore di firma. Il
  codice di enrollment viaggia nel **body di una POST** (mai in query string:
  gli URL finiscono nei log) e il confronto è a tempo costante su hash
  SHA-256. Challenge e tentativi di enroll sono **rate-limitati per IP**
  (5/min e 10/min, IP da `CF-Connecting-IP`).
- `read_url` ricontrolla ogni redirect contro reti locali; il prompt tratta le
  pagine esterne come dati non affidabili, mai come istruzioni.

## Affidabilità delle chiamate

- Le chiamate DeepSeek **ritentano su 429/5xx** (2 tentativi, backoff con
  `Retry-After`) e su errori di rete transitori; un abort (timeout o client
  disconnesso) non viene mai ritentato. Le richieste sono idempotenti: i tool
  li esegue il Worker solo dopo aver ricevuto la risposta.
- Il **budget tempo copre anche la sintesi finale**: prima di ogni round resta
  un margine di ~25 s per la sintesi e il timeout del passo non supera mai il
  budget residuo del modo. Se il budget è quasi esaurito si salta direttamente
  alla risposta finale.
- `read_wiki` usa la **cache KV** (`wiki:cache:v6:<path>`, TTL 5 min) come
  context/index; le ricerche DuckDuckGo sono cached per query (TTL 1 h).
  Una scrittura KV fallita non butta via il testo appena scaricato.
- **Budget sul prompt in ingresso**: una pagina wiki entra al modello per al
  massimo 16.000 char (troncata su righe intere dalla testa), i risultati dei
  tool hanno un budget cumulativo di ~40.000 char (i più vecchi vengono
  sostituiti da un marker) e ogni fatto di memoria condivisa pesa al massimo
  300 char nel prompt (in KV restano a 800).
- Su errore di sistema (provider 429/5xx dopo i retry, timeout, errore
  interno) il **credito viene rimborsato**; mai sul cancel dell'utente.
- `/debug` espone in più: `finishReasons`, `searchesEmpty`, `finalTextLen`,
  `finalRetry`, `lastAgentPromptTokens`, `preSynthesisChars` e
  `preSynthesisToolChars` (prompt reale prima della sintesi, tool inclusi).
- `debug:events` è bufferizzato in memoria e persistito in un unico
  read-modify-write a fine chat (chiave condivisa, last-write-wins).

## Modello (Base / Pro)

Scelta nel widget, indipendente da rapida/profonda. Il Worker accetta `tier`.

| Tier | Modello API | Costo crediti |
|------|-------------|---------------|
| **Base** (default) | `deepseek-v4-flash` (`DEEPSEEK_MODEL`) | 1 (compari) · 0 Tiziano |
| **Pro** | `deepseek-v4-pro` (`DEEPSEEK_MODEL_PRO`) | **2** (compari) · 0 Tiziano |

Il `thinking` è attivo sulla sintesi finale di Pro (vedi sopra); i round con strumenti
restano non-thinking. Client vecchi senza `tier` restano su Base.

## Quote giornaliere

- Tiziano è autenticato tramite passkey e non passa dal contatore: la sua quota
  è illimitata sia nel Worker sia nella UI, dove viene mostrato `∞`. Vale per Base e Pro.
- Antonio e Peppe hanno **5 crediti** giornalieri ciascuno. Base = 1 credito, Pro = 2.
  Con 1 credito rimasto Pro è rifiutato (429) e il contatore non scala.
- Le chiavi KV includono la versione della policy e la data `Europe/Rome`:
  `rate:v2-20260811:{userId}:YYYY-MM-DD`. Il cambio di versione ha azzerato i
  conteggi il 2026-08-11 senza toccare chat, summary o memoria.
- `/api/status` espone `max`, `used`, `remaining`, `unlimited` e la versione
  della policy; `/api/health` pubblica la policy attiva per lo smoke test.

## Memoria e wiki

- Contesto primario: [[sintesi/contesto-sbarco]] (GitHub Raw, cache KV `wiki:cache:v6:*`, TTL 5 min). Fallback: blocco `EMBEDDED_WIKI` nel Worker.
- Indice compatto da [[index]]: il modello sceglie i path, poi `read_wiki` apre la pagina. **Non** carica `graphify-out/graph.json` né `worker/graph.json` a runtime: il grafo è per gli agenti nel repo (`graphify query`), non per la chat.
- Le altre pagine vengono aperte su richiesta tramite `read_wiki`.
- `remember` salva davvero un fatto verificato in KV.
- La memoria condivisa conserva al massimo 40 fatti e ne passa 12 al modello.
  Una `key` tematica aggiorna il valore precedente, evitando duplicati e claim
  superati ripetuti nel prompt.
- L'estrattore automatico si attiva soltanto quando il messaggio contiene una
  preferenza o decisione esplicita. Legge solo il testo dell'utente, non la
  risposta di Sbarco: domande e affermazioni generate dal bot non diventano memoria.
- La cronologia conserva fino a 8 messaggi, ma anche un massimo di 9.000
  caratteri complessivi. I messaggi sono troncati per ruolo e quelli espulsi
  confluiscono in un digest di 1.400 caratteri tagliato solo su righe intere.
- La wiki resta la fonte persistente del progetto; la memoria KV non la sostituisce.

## Output e interfaccia

- Ogni risposta ordinaria ha l'azione **Copia**. Il PDF non viene proposto sul
  testo libero della chat: evita documenti poco strutturati e un doppio export.
- `save_doc` produce una scheda dedicata con **Scarica PDF**; questa è l'unica
  via di export e MD/TXT non sono più l'output primario.
- Una richiesta esplicita di PDF forza `save_doc` nel tool loop. Se il provider
  non rispetta la chiamata obbligatoria, il Worker crea comunque la scheda dal
  testo finale: Sbarco non può più dichiarare un PDF pronto senza emettere il
  relativo evento `documents` verso la UI.
- Il PDF è A4, multipagina, con titoli, callout, elenchi, tabelle, fonti,
  intestazione e numerazione. jsPDF viene caricato solo al click (chunk lazy).
- Emoji e simboli da chat vengono convertiti in etichette testuali; gli altri
  glifi non supportati da Helvetica sono rimossi preservando gli accenti italiani.
- Il Markdown è parsato a blocchi e sanificato; tabelle larghe scorrono
  orizzontalmente. Durante lo stream il DOM viene aggiornato una volta per frame,
  riducendo lavoro e salti di scroll su telefono.
- Sotto 600 px il widget usa l'altezza di `visualViewport`, safe-area e layout
  full-screen, così resta usabile anche con tastiera mobile aperta.

## Manutenzione

1. Dopo modifiche alle preferenze, aggiornare [[sintesi/contesto-sbarco]].
2. Eseguire `node scripts/lint-wiki.mjs`.
3. Verificare `worker/src/index.js` e fare la build di `presentazione/`.
4. Eseguire `graphify update .` dopo modifiche sostanziali; il grafo resta un
   indice del repository e non viene incorporato nel bundle del Worker.
5. Dopo il deploy, provare una domanda rapida e una ricerca profonda.
