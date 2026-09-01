---
title: Feed Subito live
type: mercato
updated: 2026-09-01
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
| Posti barca | `?cat=posti` |
| Redirect legacy | `gommoni.html` / `motori.html` / `posti.html` → tab corrispondente |

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
npm run fetch-posti
npm run validate-feeds
npm run build
```

## Snapshot raw

Dopo fetch: `raw/mercato/subito-feed-*.json`, `subito-gommoni-*.json`, `subito-motori-*.json`, `subito-vele-*.json`, `subito-posti-*.json`.

La pubblicazione mantiene l'ultima versione online se un fetch **core** o il
quality gate falliscono: non distribuisce tab mancanti fingendo un deploy
riuscito. I fetch **Vele** e **Posti** sono `continue-on-error`: un Hades giù
sul sogno/ormeggio non blocca gommoni/motori; il gate li tratta come warning.

## Documentazione logica

[[concetti/feed-annunci-scoring]] · [[preferenze/track-gommoni]] · [[preferenze/track-motori]] · [[preferenze/track-vele]] · [[preferenze/track-posti]] · [[modelli/argo-evo-360]] · [[modelli/comet-770]]
