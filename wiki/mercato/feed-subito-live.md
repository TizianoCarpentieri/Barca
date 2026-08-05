---
title: Feed Subito live
type: mercato
updated: 2026-08-05
status: active
tags: [subito, automazione, pages]
---

# Feed Subito live (presentazione)

## URL

| Cosa | Link |
|------|------|
| Hub annunci (3 tab) | https://tizianocarpentieri.github.io/Barca/annunci.html |
| Rigide | `?cat=rigide` (default) |
| Gommoni | `?cat=gommoni` |
| Motori | `?cat=motori` |
| Redirect legacy | `gommoni.html` / `motori.html` → tab corrispondente |

## Repo

| Path | Ruolo |
|------|--------|
| `presentazione/annunci.html` | UI unica + tab categoria |
| `presentazione/src/js/annunci.js` | load JSON, filtri, geo client-side |
| `presentazione/scripts/fetch-*.mjs` | scrape/score Subito |
| `presentazione/scripts/geo-score.mjs` | distanza da base Lazio |
| `presentazione/public/data/*.json` | output statico su Pages |
| `.github/workflows/pages.yml` | build + 3 fetch + deploy |

## Comandi locali

```bash
cd presentazione
npm run fetch-annunci
npm run fetch-gommoni
npm run fetch-motori
npm run build
```

## Snapshot raw

Dopo fetch: `raw/mercato/subito-feed-*.json`, `subito-gommoni-*.json`, `subito-motori-*.json`.

## Documentazione logica

[[concetti/feed-annunci-scoring]] · [[preferenze/track-gommoni]] · [[preferenze/track-motori]] · [[modelli/argo-evo-360]]
