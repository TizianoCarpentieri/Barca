---
title: Feed Subito live
type: mercato
updated: 2026-08-22
status: active
tags: [subito, automazione, pages]
---

# Feed Subito live (presentazione)

## URL

| Cosa | Link |
|------|------|
| Hub annunci | https://tizianocarpentieri.github.io/Barca/annunci.html |
| Rigide | `?cat=rigide` (default) |
| Gommoni | `?cat=gommoni` |
| Motori | `?cat=motori` |
| Vele (sogno) | `?cat=vele` |
| Redirect legacy | `gommoni.html` / `motori.html` → tab corrispondente |

## Repo

| Path | Ruolo |
|------|--------|
| `presentazione/annunci.html` | UI unica + tab categoria |
| `presentazione/src/js/annunci.js` | load JSON, filtri, geo client-side |
| `presentazione/scripts/fetch-*.mjs` | scrape/score Subito |
| `presentazione/scripts/geo-score.mjs` | distanza da base Lazio |
| `presentazione/public/data/*.json` | output statico su Pages |
| `.github/workflows/pages.yml` | test + fetch (incl. vele) + quality gate + deploy |

## Comandi locali

```bash
cd presentazione
npm run fetch-annunci
npm run fetch-gommoni
npm run fetch-motori
npm run fetch-accessori
npm run fetch-vele
npm run validate-feeds
npm run build
```

## Snapshot raw

Dopo fetch: `raw/mercato/subito-feed-*.json`, `subito-gommoni-*.json`, `subito-motori-*.json`.

La pubblicazione mantiene l'ultima versione online se un fetch core o il quality
gate falliscono: non distribuisce tab mancanti fingendo un deploy riuscito.

## Documentazione logica

[[concetti/feed-annunci-scoring]] · [[preferenze/track-gommoni]] · [[preferenze/track-motori]] · [[preferenze/track-vele]] · [[modelli/argo-evo-360]] · [[modelli/comet-770]]
