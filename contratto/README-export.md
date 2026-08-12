# Export PDF — cantiere contratto

Genera PDF A4 dall’aspetto di **documento ufficiale** a partire dai markdown:

- `bozza-patto-v1.md` → `export/patto-le-bestie.pdf`
- `prospetto-costi-a-norma.md` → `export/prospetto-costi-a-norma.pdf`
- `dati/punti-varo-lazio.json` (+ `build-mappa-varo.mjs`) → `export/mappa-punti-varo-lazio.pdf`

## Setup (una volta)

```bash
cd contratto
npm install
npx playwright install chromium
```

Serve Node ≥ 18. Se `node` non è in PATH, usa il binario in `.tools/node-*/` del repo.

## Comandi

| Comando | Effetto |
|---------|---------|
| `npm run pdf` | Esporta **bozza + prospetto + mappa** in `export/` |
| `npm run pdf:bozza` | Solo patto |
| `npm run pdf:prospetto` | Solo prospetto |
| `npm run pdf:mappa` | Solo mappa punti di varo (build HTML + PDF) |
| `npm run pdf:qa` | Fixture layout corta in `export/_qa/` (verifica tabelle/tipografia) |
| `npm run pdf -- --out DIR` | Cartella output custom |
| `npm run pdf -- --html-only` | Solo HTML intermedia (debug CSS) |

La cartella `export/` è in `.gitignore`: i PDF non si committano di default.

## Design stampa

- **Sfondo bianco puro** (`#ffffff`) — no tinta carta che spreca toner
- Testo navy/inchiostro scuro; header tabelle navy pieno (unica area di colore)
- Corpo **Literata** ~9 pt; tabelle **Source Sans 3** ~7,25 pt; intestazioni un filo più grandi
- Mono formule: Source Code Pro (Google Fonts al render)
- Footer con numerazione pagine

## Comportamento dei PDF

- **Indice navigabile** automatico in testa: articoli e allegati nel patto, sezioni e sottosezioni nel prospetto.
- Sezioni **Changelog** escluse da entrambi i PDF (restano nei markdown sorgente per tracciabilità).
- Blocchi ASCII a barre (e mermaid `xychart`) convertiti in **grafici HTML** stampabili.

## Note

- Non esportare PDF “finali” finché bozza/prospetto sono in modifica attiva, salvo QA.
- Il PDF **non** è atto notarile né consulenza legale.
