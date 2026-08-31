# Sbarco Worker — Cloudflare

Assistente chat per Progetto Barca con Graphify runtime, prefetch wiki
evidence-first, memoria KV deduplicata, strumenti autonomi e risposta SSE.

## Setup

```bash
cd worker
npm install
```

### 1. Crea KV namespace
```bash
npx wrangler kv:namespace create SBARCO_KV
npx wrangler kv:namespace create SBARCO_KV --preview
```

Copia gli `id` e `preview_id` generati nel file `wrangler.toml`.

### 2. Imposta il secret DeepSeek
```bash
npx wrangler secret put DEEPSEEK_API_KEY
# Inserisci la API key di DeepSeek (https://platform.deepseek.com)
```

### 2b. Attiva la passkey esclusiva di Tiziano

Imposta un codice monouso, comunicalo solo a Tiziano e poi apri Sbarco dal suo
Galaxy: selezionando **Tiziano** verrà chiesto il codice e il telefono
registrerà una passkey platform con verifica biometrica/PIN. Da quel momento
chat, quota, status e `/debug` di Tiziano richiedono la firma della stessa
passkey; scegliere "Tiziano" nel menu non è sufficiente.

Dopo la **prima** verifica passkey riuscita, il Worker emette una **session**
opaca (`X-Tiziano-Session`) valida **30 minuti** con rinnovo a ogni uso
(sliding). Il browser la conserva in `localStorage` (`barca_tiziano_session`).
Finché la session è valida non serve un nuovo QR/impronta. Scaduta o revocata
in KV (`auth:tiziano:session:*`), si ripete una sola passkey.

```bash
npx wrangler secret put TIZIANO_ENROLLMENT_CODE
```

Non committare mai il codice. Per sostituire il telefono, cancella la chiave KV
`auth:tiziano:passkey`, imposta un nuovo codice e ripeti la registrazione.

### 3. Configura ALLOWED_ORIGIN
In `wrangler.toml`, modifica `ALLOWED_ORIGIN` con l'URL del tuo GitHub Pages:
```toml
[vars]
DEEPSEEK_MODEL = "deepseek-v4-flash"
DEEPSEEK_MODEL_PRO = "deepseek-v4-pro"
ALLOWED_ORIGIN = "https://tizianocarpentieri.github.io"
# Opzionale: base URL DeepSeek per test o gateway (default https://api.deepseek.com/v1)
# DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
```

### 4. Aggiorna l'URL nel frontend
In `presentazione/src/js/sbarco.js`:
```js
const SBARCO_WORKER = "https://sbarco.TUO_WORKER.workers.dev";
```
Sostituisci con il dominio worker reale dopo il deploy.

### 5. Deploy
```bash
npm run deploy
```

### 6. Test
```bash
curl https://sbarco.TUO_WORKER.workers.dev/api/health
# → {"status":"ok","version":"3.0.0","knowledgeSource":"graphify-runtime+wiki-runtime",...}
```

## Struttura KV

| Key | Contenuto |
|-----|-----------|
| `memory:project` | Fatti condivisi: `[{key, user, date, fact, tags, source, scope}]`; upsert per `key` |
| `chat:{userId}` | Storico chat per utente |
| `chat:{userId}:summary` | Digest compatto dei messaggi espulsi dalla finestra recente |
| `rate:v2-20260811:{userId}:YYYY-MM-DD` | Contatore giornaliero versionato per Antonio e Peppe |

## Quote giornaliere

- **Tiziano:** utilizzo illimitato; il Worker non legge né incrementa una
  chiave quota per questo profilo.
- **Antonio e Peppe:** 5 utilizzi al giorno ciascuno.
- Il giorno cambia a mezzanotte nel fuso `Europe/Rome`. La versione nella
  chiave consente un reset controllato senza cancellare cronologia o memoria.

## Comandi speciali in chat

| Comando | Chi | Effetto |
|---------|-----|---------|
| `/debug` | Tiziano | Metriche aggregate ed errori, senza conversazioni o fatti KV |

## API

| Endpoint | Metodo | Uso |
|----------|--------|-----|
| `/api/health` | GET | versione e stato Worker |
| `/api/status?userId=...` | GET | contatore giornaliero reale |
| `/api/chat` | POST | chat SSE; body `{userId, question, mode, tier}` |

`mode` può essere `auto`, `deep` o `extended`; `tier` può essere `base` o `pro`.
Le modalità regolano la **profondità**, non l'obbligo di cercare online:
`deep` esegue almeno due passaggi e `extended` almeno tre anche per analisi,
scrittura e PDF offline. Il web viene forzato solo per richieste esplicite o
dati correnti/instabili; resta disponibile autonomamente se grafo e wiki non
bastano. L'estesa conserva i tetti massimi di 12 round, 12 ricerche, 16 pagine,
48 chiamate e 300 s. Costo: Base 1 · Pro 2 · estesa Base 3 · Pro 5; con
i profili limitati l'estesa parte con ≥1 credito e consuma `min(costo, residuo)`
senza mai fermarsi a metà.
Dettaglio: `wiki/concetti/architettura-sbarco.md`.

Le risposte rapide gia' complete vengono inviate in frame cadenzati per evitare
che proxy e browser le accorpino. La sintesi forzata usa lo stream nativo del
provider. `/debug` espone token effettivi, stima del prompt, modalita' di stream
e latenze, senza contenuto delle chat.

Il Worker crea la scheda PDF sia da `save_doc` sia dalla sintesi finale, quindi
un JSON tool troncato non blocca più il compito. Il renderer jsPDF lazy supporta
temi nautico/cantiere/minimal, colore accento, copertina, densità e orientamento
automatico/verticale/orizzontale; le tabelle larghe passano in landscape.

Prima della prima chiamata al modello, `project-graph.js` interroga la proiezione
`worker/graph.json` e apre fino a due pagine wiki pertinenti. Il grafo orienta;
le pagine aperte sono le evidenze. Cronologia e digest entrano nel prompt solo
nei follow-up contestuali, con cap 4 messaggi / 4.800 caratteri.

## Verifica prima del deploy

```bash
node --check src/index.js
node --test --test-isolation=none test/core.test.mjs
cd ../presentazione && npm run build
cd .. && node scripts/lint-wiki.mjs
```

Dopo il deploy verificare:

1. `/api/health` riporta `version: 3.0.0`, le statistiche del grafo e la policy quota attiva.
2. Una domanda rapida produce stato e risposta.
3. Una profonda offline fa almeno due passaggi senza `search_web`; una domanda
   su prezzi attuali usa e cita fonti web.
4. Una richiesta PDF personalizzata produce sempre la scheda Scarica PDF.
5. `/debug` mostra metriche persistenti (`rounds`, `searches`, `sourcesRead`,
   `contextReadyMs`, `firstAgentMs`, `firstTokenMs`, `elapsedMs`).

## Aggiornare il grafo

Graphify resta la fonte del grafo completo; il Worker incorpora una proiezione
compatta delle sole pagine wiki. Dopo modifiche sostanziali al progetto:

```bash
cd ..
graphify update .
python -B graphify-out/build_graph.py
```

Il secondo comando rigenera `graphify-out/sbarco-graph.json` e
`worker/graph.json`. Contesto e pagine wiki restano letti da GitHub Raw con
cache KV di 5 minuti.
