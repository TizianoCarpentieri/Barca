# Sbarco Worker â€” Cloudflare

Assistente chat per Progetto Barca con contesto wiki, memoria KV deduplicata,
strumenti web e risposta SSE progressiva.

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
Galaxy: selezionando **Tiziano** verrÃ  chiesto il codice e il telefono
registrerÃ  una passkey platform con verifica biometrica/PIN. Da quel momento
chat, quota, status e `/debug` di Tiziano richiedono la firma della stessa
passkey; scegliere â€œTizianoâ€ nel menu non Ã¨ sufficiente.

Dopo la **prima** verifica passkey riuscita, il Worker emette una **session**
opaca (`X-Tiziano-Session`) valida **30 minuti** con rinnovo a ogni uso
(sliding). Il browser la conserva in `localStorage` (`barca_tiziano_session`).
FinchÃ© la session Ã¨ valida non serve un nuovo QR/impronta. Scaduta o revocata
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
# â†’ {"status":"ok","version":"2.3.2","deepResearch":true,"knowledgeSource":"wiki-runtime",...}
```

## Struttura KV

| Key | Contenuto |
|-----|-----------|
| `memory:project` | Fatti condivisi: `[{key, user, date, fact, tags, source, scope}]`; upsert per `key` |
| `chat:{userId}` | Storico chat per utente |
| `chat:{userId}:summary` | Digest compatto dei messaggi espulsi dalla finestra recente |
| `rate:v2-20260811:{userId}:YYYY-MM-DD` | Contatore giornaliero versionato per Antonio e Peppe |

## Quote giornaliere

- **Tiziano:** utilizzo illimitato; il Worker non legge nÃ© incrementa una
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
| `/api/chat` | POST | chat SSE; body `{userId, question, mode}` |

`mode` puÃ² essere `auto` o `deep`. La modalitÃ  profonda apre lo stream prima
della ricerca, invia fasi/heartbeat, limita fonti e round e forza la sintesi
finale senza ulteriori tool. Dettaglio: `wiki/concetti/architettura-sbarco.md`.

Le risposte rapide gia' complete vengono inviate in frame cadenzati per evitare
che proxy e browser le accorpino. La sintesi forzata usa lo stream nativo del
provider. `/debug` espone token effettivi, stima del prompt, modalita' di stream
e latenze, senza contenuto delle chat.

Il widget esporta in PDF A4 i documenti `save_doc`; le risposte ordinarie
mantengono la sola azione Copia. Il renderer jsPDF e' un chunk lazy: non pesa
sul caricamento normale della chat.

## Verifica prima del deploy

```bash
node --check src/index.js
cd ../presentazione && npm run build
cd .. && node scripts/lint-wiki.mjs
```

Dopo il deploy verificare:

1. `/api/health` riporta `version: 2.3.2` e la policy quota attiva (Base 1 credito, Pro 2).
2. Una domanda rapida produce stato e risposta.
3. Una ricerca profonda mostra le fasi e cita almeno due fonti lette.
4. `/debug` mostra metriche persistenti (`rounds`, `searches`, `sourcesRead`,
   `contextReadyMs`, `firstAgentMs`, `firstTokenMs`, `elapsedMs`).

## Aggiornare il grafo

Il grafo serve alla navigazione e all'analisi del repository, ma non viene piÃ¹
incorporato nel bundle del Worker. Dopo modifiche sostanziali al progetto:

```bash
cd ..
graphify update .
```

Il Worker legge il contesto compatto e l'indice da GitHub Raw e li mantiene in
cache KV per un'ora; non e' necessario incorporare o copiare il grafo.
