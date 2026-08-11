# Log — Progetto Barca

Append-only. Prefisso voci: `## [YYYY-MM-DD] <tipo> | <titolo>`

Tipi: `setup` · `ingest` · `query` · `preferenze` · `lint` · `ricerca` · `decisione`

---

## [2026-08-10] ingest | Nuova pagina costi-nascosti-gommone

- Creata `wiki/concetti/costi-nascosti-gommone.md` (status: draft).
- Elenca voci da verificare: burocrazia, dotazioni sicurezza, navigazione notturna, manutenzione, assicurazione, ricambi.
- Le stime sono segnaposto; vanno validate con fonti reali (agenzie nautiche, assicurazioni, Guardia Costiera).
- Aggiornato index.

## [2026-08-05] lint | Wiki allineata a dual track + scoring

- Aggiornati: overview, must-have, nice-to-have, open-questions, requisiti-v1, index.
- Nuove pagine: `modelli/argo-evo-360`, `preferenze/track-gommoni`, `preferenze/track-motori`, `concetti/feed-annunci-scoring`, `mercato/feed-subito-live`.
- Contenuti: ref Argo 970€ e regola −20%; geo-score distanza da Ardea/Pomezia; motori min 6 CV / sweet 9.9–15; UI tab unificata Annunci.
- Nota storica: “no gommone” resta sul **track rigidi**; gommoni = **track parallelo**, non cancellazione.

## [2026-08-05] setup | Feed annunci Subito live

- Pagina `presentazione/annunci.html` + JSON `public/data/annunci.json`.
- Script `presentazione/scripts/fetch-annunci.mjs` (hades.subito.it, cat. Nautica).
- Filtri: no gommone/RIB, prezzo ~800–4500 (stretch 5500), preferenza gozzo/open/Lazio, CV≤40,8 se dichiarato.
- Aggiornamento: ogni deploy + cron GitHub Actions 06:15/18:15 UTC.
- URL: https://tizianocarpentieri.github.io/Barca/annunci.html

## [2026-08-05] setup | Feed parallelo Gommoni

- Nuova sezione parallela per gommoni pneumatici (no RIB scafo rigido).
- Script dedicato `presentazione/scripts/fetch-gommoni.mjs` + `public/data/gommoni.json`.
- Criteri: ≥3.30 m (ideale 3.5–3.8), ≥4 pax, portata ~400kg, paiolato alluminio (prio1) o airdeck (prio2), chiglia gonfiabile pref., trasportabile auto, specchio poppa fuoribordo, pesca.
- Pagina `presentazione/gommoni.html`, link da index + dock nav.
- Stesso aggiornamento automatico via GitHub Actions (doppio fetch).
- Snapshot raw: `subito-gommoni-YYYY-MM-DD.json`.
- Vedi `gommoni.html` per elenco completo requisiti.

## [2026-08-05] ricerca | Reference Argo-Evo 360 AL

- Prodotto benchmark nuovo: 3.60 m, paiolato alluminio, chiglia gonfiabile, 5 pax, 475 kg, 68 kg barca, max 20 HP (raccom. 9.9-15), 970 €.
- Salvato in `raw/mercato/argo-evo-360-al-reference-2026-08-05.md`.
- Regola applicata: usato identico deve costare almeno 20% in meno (~776€) senza motore. Bundle con motore buono può valere di più.
- Scoring proporzionale anche su lunghezze vicine (non solo esatta 3.6 m).

## [2026-08-05] setup | Feed parallelo Motori

- Terza pagina parallela: `presentazione/motori.html` + `public/data/motori.json`.
- Script `scripts/fetch-motori.mjs`.
- Filtro: fuoribordo ≤40.8 CV (ideale 5-20), 4 tempi preferiti, gambo corto, marche buone, adatti gommoni 3.3-4 m.
- Navigazione: tile + dock + sheet.
- Aggiornato automaticamente insieme agli altri due feed.
- "Motori che non serve patente" per combo con i nostri gommoni.

## [2026-08-04] setup | Presentazione web manifesto

- Sito multipagina in `presentazione/` (Vite + vanilla, mobile-first, GitHub Pages).
- Pagine: home, equipaggio, regole, priorità, base, mercato, status, mosse.
- Vibe: manifesto da bar; contenuti da requisiti v1 + overview.
- Dev: `cd presentazione && npm i && npm run dev` · build: `npm run build` → `dist/`.
- Workflow Pages: `.github/workflows/pages.yml`.

## [2026-08-04] sintesi | Requisiti v1

- Intervista base chiusa. Profilo in `wiki/sintesi/requisiti-v1.md`.
- Intestazione lasciata aperta tra bestie.
- Next: preventivi rimessaggio A/C + caccia annunci con filtri.

## [2026-08-04] preferenze | Timeline affare-driven

- Acquisto quando esce l’affare giusto (orizzonte anche 6–12 mesi).

## [2026-08-04] preferenze | Cap gestione 1200€/testa/anno

- Tutte le spese ≤3600€/anno totali. TCO in budget.md: posto barca solo se canone contenuto.

## [2026-08-04] preferenze | No traino/carrello

- B rimessaggio esclusa. Restano posto barca (A) e cantiere terra (C).
- Trasporti/alaggi eccezionali a pagamento. Hub fisso obbligato.

## [2026-08-04] preferenze | No gommone; scafo rigido + tendalino

- Esclusi gommone/RIB. Target gozzo/open/lancia comoda e robusta.
- Copertura sole alzabile = requisito comfort (anche aftermarket).
- Sample Subito scafi rigidi ≤5,5k in raw/mercato.

## [2026-08-04] preferenze | Priorità: pesca > giri > bagno > facilità

- Canne surfcasting da adattare; bolentino = tecnica naturale su barca piccola.
- Wiki: nice-to-have, concetti/pesca-da-barca-piccola.

## [2026-08-04] preferenze | Frequenza moderata

- Tra 1–2/mese e quasi ogni weekend. Rimessaggio: B/C avvantaggiati vs posto caro.

## [2026-08-04] preferenze | Budget ≤4500€ solo usato

- Max mezzo 4500€; stretch minimo se sogno; solo usato.
- Sample Subito API → `raw/mercato/subito-pacchetti-under-5500-*`, wiki `mercato/usato-under-4500.md`.
- Reality: tanti gommoni 3–4,5 m e gozzi; 6 pax comodi rari; Lazio ha alcuni lead (Anzio/Fiumicino/Roma).

## [2026-08-04] preferenze | No patente (ideale)

- Nessuno ha patente; ideale non prenderla; consapevolezza no-performance a 6 pax.
- Must-have riformulato; `wiki/concetti/no-patente-6-pax-realta.md`.
- Shortlist concettuale: RIB/gommone leggero, open leggero, gozzo; no cabinati pesanti.

## [2026-08-04] preferenze | Rimessaggio A/B/C aperti

- Esclusi D ibrido e E. Aperti: posto barca, carrello, cantiere terra.
- Confronto dettagliato: `wiki/confronti/rimessaggio-abc.md`
- Lead cantieri Anzio/Nettuno in raw/mercato.

## [2026-08-04] preferenze | Zona = litorale laziale

- Base: Ardea/Pomezia. Hub: Anzio, Circeo, Fiumicino. Mare (non lago).
- Open: rimessaggio. Wiki: gruppo, mercato/litorale-laziale, intervista.

## [2026-08-04] ricerca | Rimessaggio litorale laziale

- Anzio: gestione comunale post Capo d’Anzio; bandi posti; PDF tariffe 2026 scaricati ma **€ non stampati** nelle celle.
- Framework opzioni A–E (posto / boe / terra / carrello / ibrido) in `raw/mercato/litorale-laziale-rimessaggio-2026-08-04.md`.
- Da fare: telefonate listini Anzio/Nettuno/Fiumicino/Circeo + scivoli carrello.

## [2026-08-04] ricerca | Limiti senza patente IT

- Fonti: MIT https://www.mit.gov.it/node/2658 → `raw/normativa/mit-conseguimento-patente-nautica-2026-08-04.md`
- Secondarie: farevela, passionemare, in3giorni → `raw/normativa/note-secondarie-patente-2026-08-04.md`
- Wiki: `wiki/normativa/limiti-senza-patente.md`
- Takeaway: no-patente ≈ ≤30 kW (40,8 CV) + cilindrate + entro 6 miglia; vincolo forte vs 6 pax/performante.

## [2026-08-04] preferenze | Avvio intervista requisiti

- Iniziata raccolta requisiti one-question-at-a-time con ricerca web per punto.
- Pagina tracking: `wiki/preferenze/intervista-requisiti.md`

## [2026-08-04] setup | Bootstrap progetto

- Installati graphify (skill OpenCode project-scoped), superpowers (plugin), pattern LLM Wiki (skill + schema AGENTS.md).
- Creata struttura `raw/` + `wiki/` seed.
- Obiettivo: barca a motore piccola, usabile anche senza patente, pesca e divertimento per le bestie (tu, Antonio, Peppe), ideale fino a 6 persone.
- Preferenze dettagliate ancora da raccogliere in chat successive.
- Fonte pattern salvata in `raw/manuali/karpathy-llm-wiki.md`.
- Grafo iniziale `graphify-out/` (bootstrap AST; si arricchirà con `/graphify .` quando la wiki cresce).

## [2026-08-07] build | Sezione Accessori (Subito + eBay)

- Nuovo tab **Accessori** in annunci.html, doppia fonte: Subito (hades) + eBay (Browse API).
- `scoring-accessori.mjs`: formula score = 20 + peso tipologia + bonus prezzo (ratio vs ref_new) + condizione + marca + trasporto + compatibilità; fit alto ≥65 / medio ≥45 / stretch >cap / basso.
- Tabella 22 tipologie con ref_new e cap da ricerca mercato: `wiki/concetti/feed-accessori-scoring.md`.
- `fetch-accessori.mjs`: scrive `presentazione/public/data/accessori.json` (fuso, tag source). eBay in try/catch: senza chiavi o errore esce solo Subito.
- Workflow pages.yml: step fetch-accessori con secrets EBAY_CLIENT_ID/SECRET (continue-on-error).
- Test locale: feed Subito ok (60 item, barche intere escluse). eBay: **404 Browse API** — app nel portale eBay senza scope buy (invalid_scope). Da abilitare Browse API sull'app (vedi open question).
- Deploy: push → GitHub Pages.

## [2026-08-07] debug | eBay Browse 404 — causa confermata

- Riprodotto in locale con le chiavi reali: token scope generico → 200; supporto `buy.browse.readonly` → 400 invalid_scope; Browse search → 404 errorId 2002.
- Causa: app keyset creata come Sell/Commerce, senza Buy API (nessuno scope `buy.*` concesso).
- Fix ipotizzato: portale → abilitare Buy APIs. **Errato**: il portale non permette di modificare la lista degli scope (è fissa).
- Verità (fonti: Cleo support, mfalkus/ebay-bargains, hendt/ebay-api #99): la pagina OAuth scopes di `developer.ebay.com/my/keys` è **read-only**; gli scope sono assegnati al keyset quando viene creato. Per avere Buy/Browse: creare nuova app/keyset con Buy APIs, oppure contattare eBay developer support.
- Nessuna modifica al codice: `EBAY_SCOPE` resta `api_scope` (lo scope generico basta per `item_summary/search` quando il keyset ha la Buy API).

## [2026-08-09] ingest | 45 vocali WhatsApp tra bestie

- Trascritti 45 file `.ogg` da `raw/audio/` con Whisper base (graphify transcribe).
- Estratti temi chiave: split costi/danni, dibattito gommone vs rigido, stime assicurazione, ormeggio, uso invernale, barche valutate, regole danni.
- Nuove pagine wiki: `sintesi/conversazioni-audio-20260809`, `preferenze/split-costi`, `concetti/montaggio-gommone`.
- Aggiornate: `preferenze/budget` (stime da audio), `preferenze/open-questions` (chiuse split, scelta rigido, frequenza inverno), `index.md`.
- Consenso emerso: scafo rigido > gommone per praticità; accordo scritto obbligatorio su danni/split.

## [2026-08-10] decisione | Gommone primario, budget 2000€, 30€/mese

Dopo le conversazioni del 9 agosto e l'analisi dei costi fissi:
- **Gommone pneumatico** = unica via fattibile con il budget mensile attuale (≤30 €/testa/mese)
- **Scafo rigido** = scenario futuro condizionato a ≥5 soci con preventivi reali
- **Budget acquisto**: ≤2.000 € bundle gommone+motore usato
- **Costi fissi**: ≤30 €/testa/mese (90 €/mese totali) — ampiamente raggiungibile col gommone (~10 €/testa/mese)
- Nuove pagine wiki: `costi-nascosti-gommone`, `logistica-trasporto`, `scenario-rigido-5-soci`
- Pagine aggiornate: overview, must-have, budget, open-questions, track-gommoni, split-costi, requisiti (v2), index
- Restano da verificare: costi reali (passaggio, documenti, dotazioni), logistica (auto, custodia), accordo scritto

## [2026-08-08] feat(access) | Revamp v2 completato

- Rinazione completa eBay (fetch+UI+workflow+.env.ebay)
- Automatismo ref_new: mediana prezzi Subito condizione "nuovo" 2x/giorno (update-accessori-ref.mjs → ref-prezzi.json)
- Scoring addolcito: 27 tipologie, 5 destinazioni, cap=ref×2, Lazio+5, niente penalità distanza
- UI: icona Accessori stessa riga (fix grid 3+1), accessori.html dedicato con filtri destinazione/tipologia
- Fix collaterali: gommoni hardMax 1500, regex rimorchio, scanned_unique da null a numero
- Commits: cd76edf 9c2d7ae 640a5f9 fc3c398 c995b64

## [2026-08-10] audit | Revisione operazioni DeepSeek e causa risposta vuota Sbarco

- Ricostruito il flusso introdotto nei commit del 10 agosto.
- Causa primaria: dopo fino a 8 round non-streaming da 8.000 token partiva una nuova chiamata streaming con i tool ancora attivi; le `tool_call` emesse nello stream non venivano interpretate e il client riceveva solo `done`.
- Concause: nessun avanzamento visibile prima della risposta, nessun limite temporale per fonte, `remember` non persisteva, summary KV ridotta a contatori ripetitivi e debug solo in-memory.
- Il problema non era quindi il solo esaurimento dei token, ma il contratto incompleto tra agent loop, SSE e widget.

## [2026-08-10] feat(sbarco) | Deep research v2 e mobile UX

- Stream SSE aperto subito con fasi e heartbeat; modalità rapida/ricerca profonda.
- Budget: 3 ricerche, 5 fonti aperte, 14 tool call, concorrenza 4, timeout 12s per fonte e 6 round massimi.
- Sintesi finale forzata senza tool; eliminato il percorso che poteva concludersi senza testo.
- Aggiunti annullamento, fallback risposta vuota, status rate-limit dal server e pannello mobile full-screen con safe-area.
- `remember` salva in KV; cronologia e debug diventano persistenti e utili.
- Documentazione: [[concetti/architettura-sbarco]] e [[sintesi/contesto-sbarco]].

## [2026-08-10] lint | Riallineamento wiki al piano A

- Shortlist promossa a bundle gommone+motore ≤2.000 €; rigide spostate a scenario condizionale.
- Ripulite le open question: rimosse decisioni chiuse e diagnosi eBay già storicizzate.
- Marcate come storiche/condizionali intervista iniziale, mercato ≤4.500 €, tendalino e rimessaggio A/B/C.
- Corrette incoerenze su hub, custodia e stime di costo non ancora verificate.
- Aggiunto lint deterministico `scripts/lint-wiki.mjs` per wikilink, copertura indice, frontmatter e status.

## [2026-08-10] perf(sbarco) | Contesto e bundle alleggeriti

- Rimosso il grafo statico dal bundle del Worker: resta un indice di progetto aggiornato con Graphify.
- Sbarco carica da KV il contesto compatto e l'indice wiki, aprendo le altre pagine solo quando servono.

## [2026-08-10] perf(sbarco) | Feedback di attesa e diagnostica latenza

- Aggiunti stati grigio-luminosi e messaggi di bordo durante attesa e heartbeat.
- Ridotti a 1.000 i token dei round intermedi; ragionamento deep esteso solo nel primo round.
- Ridotto il rumore delle fonti web a 6 risultati e 6.000 caratteri per pagina.
- `/debug` registra ora tempo contesto, primo round, primo token e durata totale.
- Eliminata una lettura KV duplicata prima dell'apertura dello stream.

## [2026-08-10] fix(release) | Quality gate feed e pipeline unica

- Corrette misure Subito in cm/mm, precedenza del titolo, bundle con motore, marca/potenza/gambo motori.
- Esclusi rigidamente RIB, semirigidi e scafo/carena/chiglia rigida dal piano A.
- Aggiunti test dei normalizzatori e gate sui quattro feed; validati 80 rigide, 80 gommoni, 70 motori e 62 accessori.
- Separati deploy Pages e Worker; rimossi i fallimenti silenziosi dei fetch core.
- Wrangler aggiornato e fissato alla versione 4.120.0 con audit npm a zero vulnerabilita'.
- Ritirati gli endpoint Worker legacy e ridotto `/debug` a diagnostica senza contenuto delle conversazioni.
- Bloccati origin estranei e redirect web verso reti private; le fonti sono marcate come dati non affidabili contro prompt injection.

## [2026-08-10] deploy | Sbarco 2.0.1 e sito pubblicati

- Release principale `39a574e`, compatibilita' CI Node 22 `d0503a0`, identita' utente `6d62b39`, header anti-cache `97a604d`.
- GitHub Pages completato: workflow `31401507364`; online asset UI con stati luminosi, stop e modalita' deep.
- Worker Cloudflare completato: workflow finale `31402710940`; health `2.0.1`, risposte dinamiche `no-store` e `Vary: Origin`.
- Feed live verificati in produzione: 80 rigide, 80 gommoni, 70 motori, 63 accessori.
- Smoke rapido: primo evento 678 ms, risposta completa 2,119 s, output `Sbarco v2 operativo.`.
- Smoke deep 2.0.1: primo evento 655 ms e risposta completa in 18,319 s; il debug ha poi mostrato 1 ricerca e 0 aperture, quindi gli URL citati provenivano dagli snippet e non da fonti lette integralmente.
- Corretto il nome dell'utente attivo dopo che lo smoke deep di Peppe aveva risposto `per te, Tiziano`; test successivo: `Peppe` in 2,100 s.
- Aggiunto `scripts/smoke-sbarco.mjs` per ripetere il test SSE con tempi, status, output ed errori.
- Le prove reali hanno consumato due messaggi di Antonio e due di Peppe; la quota giornaliera residua al termine era 1 ciascuno.

## [2026-08-10] fix(sbarco) | Deep research deterministica e thinking spento

- Le fasi deep ora forzano almeno 2 `search_web`, poi almeno 2 `read_url`, prima di consentire la sintesi.
- Aggiunta `toolSequence` alle metriche per verificare dai log la sequenza effettiva senza esporre conversazioni.
- DeepSeek V4 mappa `reasoning_effort: low` a `high`: per evitare i 400 con `tool_choice` e `reasoning_content`, tutte e tre le chiamate usano `thinking: disabled` e nessuna invia `reasoning_effort`.
- Le versioni intermedie 2.0.2-2.0.4 hanno prodotto errori di compatibilita' durante lo smoke e sono state subito sostituite; gli errori sono rimasti visibili in `/debug`.
- Produzione finale `2.0.5`, commit `2c24600`, workflow Worker `31404793764` riuscito; health e header anti-cache verificati dopo propagazione.
- Test locali: 8/8 Worker. Le prove in produzione hanno esaurito le quote del 10 agosto; lo smoke deep completo 2.0.5 va ripetuto dopo il reset automatico a mezzanotte UTC (02:00 Europe/Rome).

## [2026-08-10] feat(ui) | Filtri annunci gerarchici

- Sostituita la fila piatta di pulsanti con tre rami numerati e leggibili su mobile.
- I filtri di affinamento sono ora cumulabili; il riepilogo mostra filtri attivi e risultati rimasti.
- Rigide: luogo/recenza, compattezza/no-patente, budget. Gommoni: misura/bundle/pavimento, affare, logistica.
- Motori: fascia CV, 4T/gambo corto, affare/distanza. Accessori: uso padre, tipologia figlia, occasione.
- Ogni scelta mostra il numero di annunci compatibili; le opzioni senza risultati sono disabilitate.
## [2026-08-10] security(sbarco) | Account Tiziano vincolato a passkey Galaxy

- Rimossa l'impersonificazione basata sul solo `userId`: chat, status e debug
  di Tiziano verificano una passkey WebAuthn platform con UV.
- La prima associazione richiede un codice di attivazione mantenuto come secret
  Cloudflare; KV non conserva chiavi private.
- La quota giornaliera di Tiziano viene azzerata in produzione durante il deploy.

## [2026-08-11] feat(sbarco) | Memoria, streaming, PDF e mobile 2.2.0

- Memoria KV deduplicata per tema: 40 fatti persistiti, 12 nel prompt; history
  limitata a 8 messaggi e 9.000 caratteri con digest su righe intere.
- Estrazione memoria attivata solo per preferenze esplicite e limitata al testo
  dell'utente; eliminate chiamate LLM di memoria sulle domande normali.
- Parser SSE robusto lato Worker e client; risposte rapide cadenzate e rendering
  DOM raggruppato per animation frame.
- Nuovo Markdown a blocchi sanificato, UI nautica full-screen sotto 600 px,
  supporto `visualViewport`, safe-area, metadati risposta e azione copia.
- Export PDF A4 multipagina per ogni risposta e per `save_doc`; jsPDF caricato
  solo al click in chunk lazy da circa 131 kB gzip.
- Budget intermedi ridotto 1.000 → 700 token e finale 2.600 → 2.200; `/debug`
  espone usage effettiva, stima prompt e modalità di stream.
- Verifica locale: Worker 11/11, presentazione 7/7, build Vite e PDF/UI visual QA.
  Deploy e smoke live restano pendenti. Dettaglio: [[sintesi/audit-sbarco-20260811]].

## [2026-08-11] preferenze(sbarco) | Output completo prima del risparmio token

- Ripristinati i budget collaudati: 1.000 token per round e 2.600 per la
  sintesi finale. Le ottimizzazioni restano sul prompt, sulla memoria e sulle
  chiamate LLM superflue, per non rischiare Markdown o tabelle troncati.
- Aggiunto un test di regressione sui due limiti prima del deploy 2.2.0.

## [2026-08-11] deploy | Sbarco 2.2.0 e PDF online

- Commit `c29830b` inviato su `main`.
- Workflow Cloudflare Worker `31485142103` e GitHub Pages `31485142102`
  completati con successo.
- Health live: `2.2.0`, deep research attiva e contesto `wiki-runtime`.
- Smoke rapido: 5 frame, 392 caratteri, 2,45 s, risposta completa.
- Smoke deep: 3 round, 2 ricerche, 2 fonti lette, 12 frame, 9,68 s,
  risposta completa; quota Peppe residua 1/3.
- Frontend live aggiornato; azione PDF presente e chunk jsPDF verificato con
  HTTP 200. Restano i test manuali di annullamento, quota zero e `/debug`
  autenticato tramite passkey di Tiziano.
