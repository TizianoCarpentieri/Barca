# Sbarco Worker — Cloudflare

Assistente chat per Progetto Barca con Retrieval basato su graphify.

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

### 3. Configura ALLOWED_ORIGIN
In `wrangler.toml`, modifica `ALLOWED_ORIGIN` con l'URL del tuo GitHub Pages:
```toml
[vars]
DEEPSEEK_MODEL = "deepseek-chat"
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
# → {"status":"ok","graphNodes":166,"graphEdges":198}
```

## Struttura KV

| Key | Contenuto |
|-----|-----------|
| `memory:project` | Fatti condivisi: `[{user, date, fact, tags}]` |
| `chat:{userId}` | Storico chat per utente |
| `chat:{userId}:summary` | Riassunto messaggi vecchi |

## Comandi speciali in chat

| Comando | Chi | Effetto |
|---------|-----|---------|
| `/debug` | Solo Tiziano | Scarica JSON con log, KV state, errori |

## Aggiornare il grafo

Dopo modifiche alla wiki:
```bash
cd ..
python graphify-out/build_graph.py
copy graphify-out\graph.json worker\graph.json
cd worker && npm run deploy
```
