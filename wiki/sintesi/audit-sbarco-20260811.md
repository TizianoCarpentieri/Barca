---
title: Audit Sbarco - memoria, streaming, PDF e mobile
type: sintesi
updated: 2026-08-11
status: active
tags: [sbarco, audit, memoria, streaming, pdf, mobile, token]
sources: [worker/src/index.js, worker/test/core.test.mjs, presentazione/src/js/sbarco.js, presentazione/src/js/sbarco-format.js, presentazione/src/js/sbarco-pdf.js, presentazione/src/styles/sbarco.css]
---

# Audit Sbarco - 11 agosto 2026

## Esito

La pipeline 2.0.5 aveva corretto il caso critico della risposta vuota, ma
conservava quattro inefficienze: memoria contaminabile dalla risposta del bot,
history limitata per numero ma non per dimensione, falso streaming delle
risposte rapide e rendering Markdown completo a ogni token. La revisione 2.2.0
corregge questi punti e sostituisce MD/TXT come output principale con PDF A4.

La revisione è verificata localmente e distribuita in produzione con commit
`c29830b`. I workflow Worker `31485142103` e Pages `31485142102` sono riusciti;
gli smoke live rapido, deep e caricamento PDF sono completati.

## Audit per area funzionale

| Area | Valutazione iniziale | Intervento 2.2.0 |
|------|----------------------|------------------|
| Passkey WebAuthn | Separata dalla chat; nessun collo di bottiglia dominante | Invariata |
| Memoria KV | Append fino a 50; duplicati e contraddizioni possibili | Upsert per `key`, 40 fatti persistiti, 12 in prompt |
| Estrazione memoria | Chiamata LLM dopo ogni risposta; vedeva anche testo di Sbarco | Solo preferenze esplicite; legge soltanto il messaggio utente |
| History | 8 messaggi, ma potenzialmente molto lunghi | 8 messaggi **e** 9.000 caratteri; cap per ruolo |
| Summary | Estrattiva e tagliata anche a metà riga | Digest da 1.400 caratteri, solo righe intere |
| Prompt wiki | Contesto compatto più indice intero | Indice ridotto a sezioni e wikilink utili |
| Tool loop | Budget buono, step da 1.000 token | Conservati 1.000 per step e 2.600 per la finale; ottimizzato il solo input |
| SSE Worker | Provider stream robusto solo nella finale forzata | Parser a frame; risposta rapida cadenzata con yield |
| SSE client | Parser per riga, ultimo buffer perso, errori silenziosi | Frame CRLF/chunk/finale ricomposti |
| Rendering client | Tutto il Markdown riparsato a ogni token | Un aggiornamento DOM per animation frame |
| Markdown | Regex fragili; titoli e tabelle iniziali non affidabili | Parser a blocchi sanificato, tabelle scrollabili |
| Export | Download locale `.md` e `.txt` | PDF A4 multipagina; export anche da ogni risposta |
| Mobile UI | Full-screen sotto 440 px | Full-screen sotto 600 px, `visualViewport`, safe-area, touch target |
| Codice morto | Endpoint ritirati ancora presenti dopo il `410` | Implementazioni irraggiungibili rimosse |

## Rapporto qualità / consumo token

- I round agentici mantengono 1.000 token e la risposta finale 2.600: precedenti
  riduzioni del tetto di output avevano causato visualizzazioni incomplete.
- Il risparmio viene quindi ottenuto sul contesto in ingresso e sulle chiamate
  superflue, senza comprimere il testo che deve essere mostrato all'utente.
- Le domande normali non avviano più la chiamata LLM di estrazione memoria.
- La history ha ora un tetto reale di caratteri; un singolo output lungo non può
  gonfiare tutte le chiamate successive.
- L'indice wiki nel system prompt conserva i percorsi navigabili, eliminando
  frontmatter, separatori e rumore tabellare.
- `/debug` espone `usage`, stima prompt, suddivisione caratteri e `streamMode`:
  le prossime ottimizzazioni possono basarsi su uso reale, non su impressioni.

## PDF e peso frontend

Il renderer usa jsPDF soltanto al click. La build separa il PDF in un chunk lazy
di circa **395 kB minificati / 131 kB gzip**; il bundle iniziale dell'app resta
circa **25,7 kB / 9,4 kB gzip**. I plugin opzionali HTML/SVG di jsPDF sono
esclusi perché Sbarco genera il documento con primitive vettoriali e testo.

Il PDF include copertina, data/autore, gerarchia titoli, callout, codice,
elenchi, tabelle, intestazione, footer e numerazione. È stato renderizzato con
Poppler e ispezionato visivamente su due pagine senza clipping o sovrapposizioni.

## Colli di bottiglia residui

1. I round che possono chiamare tool restano non-streaming: è necessario per
   conoscere una `tool_call` completa prima di eseguirla. Stato e heartbeat
   coprono l'attesa, ma il primo testo arriva dopo il round.
2. DuckDuckGo HTML non offre SLA; una Search API affidabile resta il miglior
   miglioramento futuro per la modalità deep.
3. Cloudflare KV non offre incremento transazionale per il rate limit; richieste
   simultanee rare possono ancora competere.
4. Il digest è deterministico e molto economico, non semantico. Se le chat
   cresceranno davvero, un riassunto LLM periodico e misurato potrà migliorare
   la continuità, ma non va eseguito a ogni turno.
5. La memoria KV non scrive automaticamente nella wiki. Le decisioni del gruppo
   devono ancora seguire il workflow preferenze del repository.

## Verifica locale

- Worker: 11 test superati.
- Presentazione: 7 test superati.
- Check sintassi su Worker e tre moduli Sbarco.
- Build Vite riuscita con PDF in chunk lazy.
- PDF QA: A4, 2 pagine, metadati e rendering Poppler verificati.
- UI QA: screenshot Edge headless a 500 x 844; header, tabelle, azioni PDF,
  documento e composer risultano leggibili e senza overflow.

## Verifica produzione

- Worker health: `version: 2.2.0`, deep research attiva, contesto `wiki-runtime`.
- Rapida: HTTP 200, 392 caratteri in 5 frame, `done`, nessun errore, 2,45 s.
- Deep: HTTP 200, 1.077 caratteri in 12 frame, 3 round, 2 ricerche e
  2 fonti lette, `done`, nessun errore, 9,68 s.
- Pages: nuovo bundle Sbarco servito correttamente; azione `Esporta PDF`
  presente e chunk jsPDF lazy da 395.010 byte raggiungibile con HTTP 200.
- Restano da provare manualmente annullamento da browser, stato quota esaurita
  e `/debug` autenticato con la passkey di Tiziano.
