---
title: Overview
type: sintesi
updated: 2026-09-01
status: active
tags: [stato]
---

# Overview — ricerca barca

## In una frase

Dal 1 settembre 2026 la **caccia attiva è il cabinato a vela** (classe [[modelli/comet-770]], ≤9–10k in due, fissi **≤700 €/testa/anno all-in**, stretch 900) **più un posto annuale sul litorale laziale**. Gommone, motori e rigide restano in wiki e nei feed, in secondo piano. Lo scafo rigido a motore resta condizionale.

## Direzione attuale (2026-09-01)

| Asse | Direzione |
|------|-----------|
| Mezzo primario (caccia attiva) | **Cabinato a vela 7–9 m** (ref Comet 770) + posto annuale Lazio |
| Gommone | In secondo piano; resta nei feed |
| Scafo rigido a motore | Solo con ≥5 soci e preventivi reali |
| Budget acquisto gommone | **≤2.000 €** bundle gommone+motore usato |
| Budget acquisto vela (in 2) | **≤9.000 €**, stretch **10.000** |
| Costi fissi gommone | **Non hard-cap 30 €/testa/mese**; attesi soprattutto RC + tagliando |
| Costi fissi vela | **≤700 €/testa/anno all-in** (stretch 900). Anzio banchina 8,50 da sola lo sfonda |
| Uso | Preferenza **uscite di gruppo**; split 1/N |
| Motore | **9–40 CV**, purché senza patente; 4T preferito; gambo compatibile con lo scafo |
| Reference | [[modelli/argo-evo-360]] a 970 € nuovo (benchmark scafo) |

UI unica: [Annunci live](https://tizianocarpentieri.github.io/Barca/annunci.html) (tab Rigide · Gommoni · Motori · **Vele** · **Posti** · Accessori). Posti = ormeggio annuale Lazio + striscia bandi/gestori.  
Documenti di bordo: [Patto · Costi · Varo](https://tizianocarpentieri.github.io/Barca/documenti.html) (bozze, non firmati).  
Scuola: [Simulazioni](https://tizianocarpentieri.github.io/Barca/simulazioni.html) · [Nodi](https://tizianocarpentieri.github.io/Barca/nodi.html).
Logica score: [[concetti/feed-annunci-scoring]] + [[concetti/feed-accessori-scoring]].

## Stato

| Area | Stato |
|------|--------|
| Setup tool (wiki, presentazione, Pages) | ✅ |
| Preferenze gruppo | ✅ |
| Nuova direzione gommone primario | ✅ (2026-08-10) |
| Sogno vela (Comet 770, cap 700/900) | 🟢 **caccia attiva** (1 set 2026); ormeggio ancora da chiudere |
| Feed posti barca Lazio | 🟢 tab Annunci + bandi/gestori curati |
| Zona operativa | ✅ mare laziale — Ardea/Pomezia → Anzio/Circeo/Fiumicino |
| Patente | ✅ nessuno; no-patente ≤40,8 CV |
| Normativa no-patente IT | 🟡 presente; tenere fonti aggiornate |
| Budget acquisto | ✅ ≤2.000 € bundle gommone+motore |
| Budget gestione gommone | 🟢 modello chiaro: no hard-cap 30 €; fissi RC+tagliando; variabili a uscita — preventivi reali ancora open |
| Costi reali (manutenzione, passaggio, doc) | 🟡 RC legge ok; tagliando/dotazioni in corso — [[concetti/costi-nascosti-gommone]] |
| Logistica trasporto (auto, custodia) | ⬜ [[concetti/logistica-trasporto]] — da verificare |
| Accordo scritto bestie | 🟡 bozza in cantiere (fuori wiki); da revisionare insieme e firmare — **non** ancora ingerita |
| Scenario rigido 5 soci | ⬜ [[sintesi/scenario-rigido-5-soci]] |
| Feed Subito automatico | ✅ 3 feed + geo-score + cron |
| Sbarco deep research | 🟢 produzione `2.3.0`; Base/Pro (Flash vs V4-Pro); streaming visibile |
| Lint wiki automatico | ✅ `node scripts/lint-wiki.mjs` |
| Shortlist candidati | ⬜ da popolare dai feed |
| Visite/prove | ⬜ non iniziato |

## Prossimi passi consigliati

1. Preventivi reali RC e tagliando; chiudere dotazioni/documenti sul bundle scelto.
2. Logistica: auto, custode, prova ciclo carico/montaggio, accesso mare lecito.
3. Shortlist bundle ≤2.000 € dai feed live.
4. Revisionare insieme e firmare il patto (bozza già in cantiere; ingest wiki solo dopo).
5. **Vela:** preventivo Fiumicino foce + scuola 12 miglia **prima** di innamorarsi di un 770. [[preferenze/track-vele]]
6. Scenario rigido a motore: solo con ≥5 soci e preventivi.
7. Metriche `/debug` Sbarco dopo uso reale.

## Come usare questo repo

- Drop fonti in `raw/`, poi ingest
- `preferenza: …` → `wiki/preferenze/`
- `node scripts/lint-wiki.mjs` → controlla link, indice e frontmatter
- Annunci: tab su Pages / `annunci.html?cat=…`
- Dettaglio: `AGENTS.md` · [[mercato/feed-subito-live]]
