---
title: Architettura e flusso di Sbarco
type: concetto
updated: 2026-08-10
status: active
tags: [sbarco, bot, deep-research, worker]
sources: [worker/src/index.js, presentazione/src/js/sbarco.js]
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
| Rapida/auto | domande sul progetto e wiki | fino a 3 round |
| Ricerca profonda | prezzi, normativa, dati correnti e richiesta esplicita | fino a 6 round |

La ricerca profonda usa al massimo 3 ricerche, 5 pagine web lette, 14 chiamate
strumento complessive e 4 strumenti concorrenti. Ogni fonte web ha timeout di
12 secondi. Raggiunto un limite, Sbarco deve sintetizzare quanto raccolto.

## Latenza percepita e misurata

- Il widget mostra subito una riga di lavoro grigio-luminosa e la aggiorna con
  fasi reali o messaggi di attesa durante gli heartbeat.
- I round intermedi hanno massimo 1.000 token; i 2.600 token della risposta
  completa restano riservati alla sintesi finale.
- In modalita' deep il ragionamento esteso viene usato nel primo round di
  pianificazione, non ripetuto dopo ogni tool.
- Ogni evento persistito in `/debug` separa `contextReadyMs`, `firstAgentMs`,
  `firstTokenMs` ed `elapsedMs`, così un rallentamento è localizzabile.
- Una ricerca restituisce fino a 6 risultati e ogni pagina fornisce al modello
  al massimo 6.000 caratteri, riducendo il prompt senza eliminare il confronto.

## Garanzie di uscita

- La risposta HTTP inizia prima dei round LLM e invia heartbeat periodici.
- La sintesi conclusiva non riceve strumenti (`tool_choice: none`).
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

## Memoria e wiki

- Contesto primario: [[sintesi/contesto-sbarco]].
- Le altre pagine vengono aperte su richiesta tramite `read_wiki`.
- `remember` salva davvero un fatto verificato in KV.
- La cronologia conserva 8 messaggi recenti e un riassunto estrattivo compatto.
- La wiki resta la fonte persistente del progetto; la memoria KV non la sostituisce.

## Manutenzione

1. Dopo modifiche alle preferenze, aggiornare [[sintesi/contesto-sbarco]].
2. Eseguire `node scripts/lint-wiki.mjs`.
3. Verificare `worker/src/index.js` e fare la build di `presentazione/`.
4. Eseguire `graphify update .` dopo modifiche sostanziali; il grafo resta un
   indice del repository e non viene incorporato nel bundle del Worker.
5. Dopo il deploy, provare una domanda rapida e una ricerca profonda.
