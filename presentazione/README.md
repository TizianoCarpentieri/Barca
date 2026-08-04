# Progetto Barca — Presentazione

Sito manifesto multipagina per le Bestie. Mobile-first, deploy su GitHub Pages.

## Dev

```bash
cd presentazione
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output in `dist/`.

## GitHub Pages

1. Repo GitHub con questa cartella (o monorepo).
2. Settings → Pages → Source: **GitHub Actions** oppure branch `gh-pages` / `docs`.
3. Se il sito è su `https://USER.github.io/REPO/`:

In `vite.config.js` imposta:

```js
base: '/REPO/',
```

Poi build e pubblica il contenuto di `dist/`.

### Action minima (opzionale)

Workflow che builda da `presentazione/` e fa upload di `dist` come artifact Pages.

## Stack

- Vite 6
- HTML multipagina + CSS + JS vanilla
- Font: Anton / Barlow (Google Fonts)
- Foto: Unsplash (hotlink)
