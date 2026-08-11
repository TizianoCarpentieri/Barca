---
title: Architettura e flusso di Sbarco
type: concetto
updated: 2026-08-11
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
- Il `thinking` DeepSeek resta disattivato in tutti i round per compatibilità
  con `tool_choice`; la profondità deriva dalla sequenza obbligatoria di
  ricerche e letture, non da token di ragionamento nascosti.
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
- Se il modello chiude senza contenuto, il client mostra un errore esplicito.
- Timeout, budget e annullamento impediscono ricerche senza fine.
- `/debug` legge anche gli ultimi eventi persistiti in KV, non solo la memoria dell’istanza.

## Protezioni runtime

- Il Worker accetta chat e status dall'origine Pages configurata, ritira gli
  endpoint legacy e non espone testi di chat o memoria in `/debug`.
- L'identità `tiziano` richiede una **passkey platform**: firma WebAuthn con
  verifica biometrica/PIN del Galaxy per status, chat e `/debug`; il selettore
  del browser non costituisce più autenticazione.
- La prima associazione richiede un codice segreto esterno al repository; KV
  conserva soltanto id credenziale, chiave pubblica e contatore di firma.
- `read_url` ricontrolla ogni redirect contro reti locali; il prompt tratta le
  pagine esterne come dati non affidabili, mai come istruzioni.

## Quote giornaliere

- Tiziano è autenticato tramite passkey e non passa dal contatore: la sua quota
  è illimitata sia nel Worker sia nella UI, dove viene mostrato `∞`.
- Antonio e Peppe hanno 5 utilizzi giornalieri ciascuno.
- Le chiavi KV includono la versione della policy e la data `Europe/Rome`:
  `rate:v2-20260811:{userId}:YYYY-MM-DD`. Il cambio di versione ha azzerato i
  conteggi il 2026-08-11 senza toccare chat, summary o memoria.
- `/api/status` espone `max`, `used`, `remaining`, `unlimited` e la versione
  della policy; `/api/health` pubblica la policy attiva per lo smoke test.

## Memoria e wiki

- Contesto primario: [[sintesi/contesto-sbarco]].
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
