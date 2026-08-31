# Sbarco v3 - orchestratore evidence-first

Data: 2026-08-31
Status: approved by user request
Ambito: Worker, widget Sbarco, Graphify runtime, memoria, PDF e test.

## Problemi osservati

1. Le modalita' profonda ed estesa coincidono con l'obbligo di usare il web:
   una richiesta di analisi, scrittura o creazione PDF viene quindi spinta verso
   `search_web` anche quando la rete non serve.
2. Il grafo `worker/graph.json` esiste ma non e' caricato dal Worker. La scelta
   delle pagine dipende dal solo indice compatto e da poche regex speciali.
3. In Base una bozza del loop da 1.000 token puo' diventare direttamente la
   risposta. Deep/extended non garantiscono una vera revisione finale.
4. Cronologia, summary e risultati tool si accumulano nel prompt; quando il cap
   scatta, le fonti vecchie spariscono senza un taccuino compatto persistente nel
   singolo turno.
5. `save_doc` e' trattato come unico modo valido per produrre il PDF. JSON lungo
   o troncato provoca round correttivi, conferme e fallimenti evitabili.

## Decisione

Separare tre assi indipendenti:

- **modello**: Base Flash / Pro V4;
- **profondita'**: rapida / profonda / estesa, cioe' round, tempo e revisione;
- **fonti**: grafo + wiki sempre disponibili, web scelto solo se il dato e'
  assente, instabile o richiesto esplicitamente.

Il flusso diventa:

```text
domanda
  -> query deterministica del grafo Graphify runtime
  -> prefetch di 1-2 estratti wiki pertinenti (budget fisso)
  -> loop agente con tool autonomi
  -> taccuino evidenze bounded aggiornato a ogni tool
  -> almeno 2/3 passaggi in profonda/estesa
  -> sintesi finale senza tool
  -> PDF materializzato anche senza save_doc
```

## Budget e memoria

- La cronologia entra solo nei follow-up contestuali; una domanda autonoma non
  trascina la chat precedente.
- History: massimo 4 messaggi / 4.800 caratteri; summary massimo 900 caratteri.
- Memoria: massimo 8 fatti selezionati, 220 caratteri ciascuno.
- Un singolo risultato tool e' compattato; il totale raw resta bounded. Le
  evidenze importanti sopravvivono nel taccuino del turno con path/URL.
- Deep ed extended passano sempre da una sintesi finale completa. L'output che
  termina per `length` puo' continuare due volte, poi chiude esplicitamente.

## Retrieval Graphify

`worker/graph.json` e' una proiezione deployabile del grafo del corpus. Il
runtime la interroga prima del primo round e restituisce nodi, relazioni e
`source_file`/`source_location`. Le etichette del grafo servono per navigare,
non sono prova fattuale: i claim vengono fondati sugli estratti wiki aperti.

Il modello dispone anche di `query_graph` per approfondire un ramo senza
caricare pagine casuali. `/api/health` e le metriche SSE rendono verificabile che
il retrieval sia avvenuto.

## PDF - direzione visiva

Soggetto: documenti di bordo per tre amici che devono decidere e agire, non un
report aziendale generico. Firma visiva: una scia cartografica sottile sulla
copertina, con palette mare profondo + ottone e struttura da quaderno di bordo.

- Palette default: Abisso `#182126`, Mare `#1B4649`, Ottone `#BC7723`, Schiuma
  `#F8EFE0`, Carta `#FDFBF7`, Sartia `#DEDAD1`.
- Tipografia: Helvetica bold per titoli/coordinate, Helvetica per corpo e dati;
  gerarchia forte, nessun font remoto.
- Layout: copertina breve, sezioni marcate a babordo, tabelle con larghezze
  adattive, header ripetuto e landscape automatico per tabelle larghe.
- Personalizzazione bounded: tema, orientamento, densita', copertina, colore
  accento, sottotitolo. Valori sanitizzati dal Worker e dal renderer.

Se `save_doc` non arriva o ha JSON malformato, la sintesi finale completa viene
materializzata come documento. Il tool resta una scorciatoia, non un punto
singolo di fallimento.

## Garanzie

- Nessun web obbligatorio solo perche' l'utente seleziona profonda/estesa.
- Web obbligatorio solo su richiesta esplicita o dato chiaramente corrente.
- Nessun claim dal solo grafo: aprire la wiki o dichiarare il limite.
- Tool loop e continuazioni hanno tetti espliciti; la sintesi non ha strumenti.
- Errori tool degradano a consegna con evidenze disponibili.
- Test unitari/integrati, build Vite, dry-run Wrangler, lint wiki, Graphify
  update e PDF renderizzato con Poppler prima della consegna.
