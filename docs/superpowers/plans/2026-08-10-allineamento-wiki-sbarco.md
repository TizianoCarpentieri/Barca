# Allineamento Wiki + Sito + Sbarco Agentico — Piano di Implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allineare wiki, sito e chatbot Sbarco alla nuova direzione (gommone primario, budget 2.000 EUR, 30 EUR/testa/mese) e rendere Sbarco agentico con tool calls, system prompt dinamico e web search.

**Architecture:** Tre fasi sequenziali. Fase 1 aggiorna la wiki (source of truth). Fase 2 allinea il sito statico. Fase 3 refactorizza il worker Cloudflare con tool loop (search_web, read_wiki, save_doc), system prompt dinamico da wiki via KV cache + GitHub raw, modello deepseek-v4-flash con thinking mode.

**Tech Stack:** Markdown/YAML (wiki), HTML/CSS vanilla (sito), Cloudflare Worker + KV + DeepSeek API (Sbarco)

## Global Constraints

- Italiano per wiki, sito e risposte Sbarco (salvo nomi tecnici)
- Frontmatter YAML con `updated` e `status` su tutte le pagine wiki
- `status: deprecated` per dati superati
- Log append-only: `## [YYYY-MM-DD] <tipo> | <titolo>`
- Nomi file wiki: `kebab-case.md`
- Sbarco: max 2000 token output per iterazione, 3 msg/giorno rate limit (temporaneo)
- Modello Sbarco: `deepseek-v4-flash`, thinking mode enabled
- Presentazione: mobile-first, CSS vanilla, nessuna nuova dipendenza

---

## File Structure

```
Barca/
├── wiki/
│   ├── overview.md              # MODIFY: gommone primario, rigido 5 soci
│   ├── index.md                 # MODIFY: aggiungere pagine mancanti
│   ├── log.md                   # MODIFY: append entry
│   ├── preferenze/
│   │   ├── must-have.md         # MODIFY: track gerarchia, budget 2000
│   │   ├── budget.md            # MODIFY: scenario gommone primario
│   │   ├── open-questions.md    # MODIFY: chiudere/aggiungere
│   │   ├── track-gommoni.md     # MODIFY: parallelo→primario
│   │   └── split-costi.md       # MODIFY: ricalcolo con 90€/mese
│   ├── sintesi/
│   │   ├── requisiti-v1.md      # MODIFY: gommone=A, rigido=B
│   │   └── scenario-rigido-5-soci.md  # CREATE
│   └── concetti/
│       ├── costi-nascosti-gommone.md   # CREATE
│       └── logistica-trasporto.md      # CREATE
├── presentazione/
│   ├── regole.html              # MODIFY
│   ├── status.html              # MODIFY
│   ├── mosse.html               # MODIFY
│   ├── mercato.html             # MODIFY
│   ├── base.html                # MODIFY (riscrittura)
│   └── src/js/sbarco.js         # MODIFY: download doc
├── worker/
│   └── src/index.js             # MODIFY: refactor tool loop, prompt dinamico
```

---

## FASE 1 — Revisione Wiki

### Task 1: Aggiornare overview.md

**Files:**
- Modify: `wiki/overview.md`

**Interfaces:**
- Consumes: nessuna (primo task)
- Produces: stato attuale del progetto, usato da tutto il resto

- [ ] **Step 1: Leggere overview.md attuale**

File gia' letto durante brainstorming. Contenuto attuale: dual track, "scafo rigido preferito", 4.500 EUR, 3.600 EUR/anno.

- [ ] **Step 2: Riscrivere overview.md**

```markdown
---
title: Overview
type: sintesi
updated: 2026-08-10
status: active
tags: [stato]
---

# Overview — ricerca barca

## In una frase

Le bestie (tu + Antonio + Peppe) cercano un **gommone pneumatico smontabile no-patente**, usato low-budget (≤2.000 € bundle), per **pesca e costa laziale** (base Ardea/Pomezia). Scafo rigido = scenario futuro con 5 soci.

## Direzione attuale (2026-08-10)

| Asse | Direzione |
|------|-----------|
| Mezzo primario | **Gommone pneumatico smontabile** (no RIB), trasportabile in auto |
| Scafo rigido | Desiderio, ma realistico solo con ≥5 soci e preventivi reali |
| Budget acquisto | **≤2.000 €** bundle gommone+motore usato |
| Costi fissi | **≤30 €/testa/mese** (90 €/mese totali) |
| Motore | ≥6 CV, sweet 9.9–15, max 40,8, 4T gambo corto |
| Reference | [[modelli/argo-evo-360]] a 970 € nuovo (benchmark scafo) |

UI unica: [Annunci live](https://tizianocarpentieri.github.io/Barca/annunci.html) (tab Rigide · Gommoni · Motori · Accessori).
Logica score: [[concetti/feed-annunci-scoring]] + [[concetti/feed-accessori-scoring]].

## Stato

| Area | Stato |
|------|--------|
| Setup tool (wiki, presentazione, Pages) | ✅ |
| Preferenze gruppo | ✅ |
| Nuova direzione gommone primario | ✅ (2026-08-10) |
| Zona operativa | ✅ mare laziale — Ardea/Pomezia → Anzio/Circeo/Fiumicino |
| Patente | ✅ nessuno; no-patente ≤40,8 CV |
| Normativa no-patente IT | 🟡 presente; tenere fonti aggiornate |
| Budget acquisto | ✅ ≤2.000 € bundle gommone+motore |
| Budget gestione | ✅ ≤30 €/testa/mese |
| Costi reali (manutenzione, passaggio, doc) | ⬜ [[concetti/costi-nascosti-gommone]] — da verificare |
| Logistica trasporto (auto, custodia) | ⬜ [[concetti/logistica-trasporto]] — da verificare |
| Accordo scritto bestie | ⬜ da redigere |
| Scenario rigido 5 soci | ⬜ [[sintesi/scenario-rigido-5-soci]] |
| Feed Subito automatico | ✅ 3 feed + geo-score + cron |
| Shortlist candidati | ⬜ da popolare dai feed |
| Visite/prove | ⬜ non iniziato |

## Prossimi passi consigliati

1. Verificare costi reali: passaggio proprietà, tagliando, assicurazione RC, dotazioni obbligatorie.
2. Chiarire logistica: chi ha auto adatta, chi tiene il gommone, quante uscite/anno realistiche.
3. Popolare shortlist gommoni+motori bundle ≤2.000 € dai feed live.
4. Redigere accordo scritto tra bestie (split costi, danni, uscita socio).
5. Scenario rigido: calcolare con 5 soci se i numeri tornano.

## Come usare questo repo

- Drop fonti in `raw/`, poi ingest
- `preferenza: …` → `wiki/preferenze/`
- Annunci: tab su Pages / `annunci.html?cat=…`
- Dettaglio: `AGENTS.md` · [[mercato/feed-subito-live]]
```

- [ ] **Step 3: Verificare**

Leggere il file e confermare che frontmatter, link wikilink e formattazione siano corretti.

- [ ] **Step 4: Commit**

```bash
git add wiki/overview.md
git commit -m "docs(wiki): overview allineata a gommone primario, budget 2000€, 30€/mese"
```

---

### Task 2: Aggiornare must-have.md

**Files:**
- Modify: `wiki/preferenze/must-have.md`

- [ ] **Step 1: Aggiornare tabella trasversale**

Modificare la riga 8 (budget):

```markdown
| 8 | Budget acquisto **≤ 2.000 €** bundle gommone+motore usato | Gommone benchmark Argo 970 € nuovo scafo; motore usato ~500-1.000 € | active |
```

Aggiungere nuova riga dopo la 8:

```markdown
| 9 | Costi fissi **≤ 30 €/testa/mese** (90 €/mese totali) | Include assicurazione, manutenzione, carburante, imprevisti | active |
| 10 | Base **Lazio** (Ardea/Pomezia) | Score annunci penalizza la distanza | active |
```

- [ ] **Step 2: Aggiornare Track A (scafi rigidi)**

Cambiare status e aggiungere condizione:

```markdown
## Track A — Scafi rigidi (scenario futuro condizionato)

**Status: `conditional`** — attivabile solo con ≥5 soci e preventivi reali che dimostrino ≤30 €/testa/mese.
```

- [ ] **Step 3: Aggiornare Track B (gommoni)**

Promuovere a primario, aggiungere nota budget:

```markdown
## Track B — Gommoni pneumatici (PRIMARIO)

| Voce | Valore |
|------|--------|
| Forma | Pneumatico **smontabile**, **non RIB** |
| Lunghezza | min 3,30 m; ideale **3,50–3,80 m** |
| Pax / portata | ≥4 pax; ~≥400 kg |
| Pavimento | **Al alluminio** (prio1) o **airdeck** (prio2) |
| Chiglia | Gonfiabile preferibile |
| Trasporto | **In automobile** |
| Budget bundle | **≤2.000 €** gommone+motore usato |
| Reference | [[modelli/argo-evo-360]] (970 € nuovo, benchmark scafo) |
| Usato ≈ ref | almeno **−20%** senza motore |
```

- [ ] **Step 4: Aggiornare frontmatter**

```yaml
updated: 2026-08-10
```

- [ ] **Step 5: Commit**

```bash
git add wiki/preferenze/must-have.md
git commit -m "docs(wiki): must-have — gommone primario, budget 2000€, rigido condizionale"
```

---

### Task 3: Aggiornare budget.md

**Files:**
- Modify: `wiki/preferenze/budget.md`

- [ ] **Step 1: Aggiungere sezione scenario gommone primario prima delle tabelle TCO**

```markdown
## Scenario gommone primario (2026-08-10)

Il gommone smontabile elimina i costi di rimessaggio (posto barca/terra).
I costi fissi si riducono a: assicurazione RC + manutenzione motore + carburante + piccola manutenzione gommone.

| Voce | Stima mensile | Stima annua | Note |
|------|---------------|-------------|------|
| Assicurazione RC | ~10 €/mese | 100–150 € | Principianti, stima realistica |
| Manutenzione motore | ~8 €/mese | ~100 € | Tagliando annuale |
| Carburante | ~8 €/mese | ~100 € | Uscite moderate, 10-15 CV |
| Manutenzione gommone | ~4 €/mese | ~50 € | Toppe, colla, valvole |
| **Totale** | **~30 €/mese** | **~350–400 €** | Ben sotto il cap |
| **Per testa (÷3)** | **~10 €/mese** | **~115–135 €** | Ampio margine |

### Note scenario gommone

- **Nessun costo di rimessaggio**: il gommone si tiene a casa (garage/cantina/terrazzo).
- **Nessun costo di alaggio/varo**: si gonfia in spiaggia/scivolo.
- **Costi una tantum da verificare**: passaggio di proprietà, immatricolazione (se >10 CV), dotazioni di sicurezza obbligatorie, accessori notturni.
- Vedi [[concetti/costi-nascosti-gommone]] per il dettaglio.
```

- [ ] **Step 2: Aggiornare sezione acquisto**

```markdown
## Acquisto (intervista 2026-08-04, aggiornato 2026-08-10)

| Voce | Valore |
|------|--------|
| Nuovo vs usato | **Solo usato** per bundle; eccezione scafo gommone nuovo se <1.000 € |
| Max acquisto bundle | **2.000 €** (gommone + motore) |
| Stretch acquisto | Poco più solo se affare eccezionale |
| Split acquisto | 1/3 (≈670 €/testa) |
```

- [ ] **Step 3: Spostare scenario A/C in fondo**

Aggiungere header "## Scenario scafo rigido (condizionale, ≥5 soci)" e spostare le tabelle TCO esistenti sotto.

- [ ] **Step 4: Aggiornare frontmatter**

```yaml
updated: 2026-08-10
```

- [ ] **Step 5: Commit**

```bash
git add wiki/preferenze/budget.md
git commit -m "docs(wiki): budget — scenario gommone primario 30€/mese, acquisto 2000€"
```

---

### Task 4: Aggiornare open-questions.md

**Files:**
- Modify: `wiki/preferenze/open-questions.md`

- [ ] **Step 1: Aggiungere nuove open questions nella sezione "Barca / gommone"**

```markdown
## [2026-08-10] Logistica gommone — DA VERIFICARE

- [ ] Chi ha un'auto adatta a caricare gommone (70 kg) + motore + attrezzatura?
- [ ] Dove si tiene il gommone durante la settimana? (garage, cantina, terrazzo?)
- [ ] Quante uscite/anno sono realistiche con montaggio/smontaggio?
- [ ] Chi si occupa di gonfiaggio/sgonfiaggio e montaggio motore?
- [ ] C'è uno scivolo/accesso comodo vicino alla base (Ardea/Pomezia)?
```

- [ ] **Step 2: Aggiungere sezione costi da verificare**

```markdown
## [2026-08-10] Costi reali — DA VERIFICARE

- [ ] Costo passaggio di proprietà per gommone usato
- [ ] Costo immatricolazione motore (>10 CV?)
- [ ] Dotazioni di sicurezza obbligatorie per legge (costo e lista)
- [ ] Accessori per navigazione notturna (fanali, batteria)
- [ ] Costo tagliando annuale motore fuoribordo 9.9-15 CV
- [ ] Costo assicurazione RC per gommone (preventivo reale)
- [ ] Eventuali costi di ricovero invernale se non si tiene a casa
```

- [ ] **Step 3: Chiudere item superati**

```markdown
- [x] Scelta finale: **gommone primario**, scafo rigido solo con ≥5 soci (2026-08-10)
- [x] ~~Scafo rigido preferito~~ → superato dai vincoli di budget mensile
```

- [ ] **Step 4: Aggiornare frontmatter**

```yaml
updated: 2026-08-10
```

- [ ] **Step 5: Commit**

```bash
git add wiki/preferenze/open-questions.md
git commit -m "docs(wiki): open-questions — logistica, costi, chiusura item superati"
```

---

### Task 5: Aggiornare track-gommoni.md

**Files:**
- Modify: `wiki/preferenze/track-gommoni.md`

- [ ] **Step 1: Cambiare titolo e header**

```markdown
# Track primario — Gommoni pneumatici

Dal 2026-08-10 il gommone è il **track primario**. Lo scafo rigido resta come scenario futuro condizionato a ≥5 soci (vedi [[sintesi/scenario-rigido-5-soci]]).
```

- [ ] **Step 2: Aggiungere sezione open questions logistiche**

```markdown
## Logistica e trasporto — open questions

- Chi ha un'auto adatta? (gommone piegato + motore + attrezzatura)
- Dove si tiene durante la settimana?
- Ciclo completo di un'uscita: vedi [[concetti/montaggio-gommone]]
- Dettaglio trasporto e custodia: [[concetti/logistica-trasporto]]
```

- [ ] **Step 3: Aggiungere sezione costi**

```markdown
## Costi da verificare

Vedi [[concetti/costi-nascosti-gommone]] per il dettaglio di:
- Passaggio proprietà e documenti
- Dotazioni sicurezza obbligatorie
- Manutenzione ordinaria gommone e motore
```

- [ ] **Step 4: Aggiornare frontmatter**

```yaml
title: Track gommoni (PRIMARIO)
updated: 2026-08-10
```

- [ ] **Step 5: Commit**

```bash
git add wiki/preferenze/track-gommoni.md
git commit -m "docs(wiki): track-gommoni promosso a primario, aggiunte open questions"
```

---

### Task 6: Aggiornare split-costi.md

**Files:**
- Modify: `wiki/preferenze/split-costi.md`

- [ ] **Step 1: Aggiornare tabella costi fissi con nuovo tetto**

```markdown
## Costi fissi — split 1/3

**Tetto massimo: 30 €/testa/mese (90 €/mese totali)**

| Voce | Stima annua | /3 bestie | /mese testa |
|------|-------------|-----------|-------------|
| Assicurazione RC | 100–150 € | ~35–50 € | ~3–4 € |
| Manutenzione motore | ~100 € | ~35 € | ~3 € |
| Carburante | ~100 € | ~35 € | ~3 € |
| Manutenzione gommone | ~50 € | ~17 € | ~1,50 € |
| **Totale testa** | **~350–400 €** | **~115–135 €** | **~10–11 €** |

Ampio margine sotto il cap di 30 €/testa/mese. Resta budget per imprevisti e accessori.
```

- [ ] **Step 2: Aggiornare stima acquisto**

```markdown
## Acquisto — split 1/3

- Bundle gommone+motore ≤2.000 € diviso in 3 parti uguali
- Stima: ~670 €/testa
- Con 4 soci: ~500 €/testa
```

- [ ] **Step 3: Aggiornare frontmatter**

```yaml
updated: 2026-08-10
```

- [ ] **Step 4: Commit**

```bash
git add wiki/preferenze/split-costi.md
git commit -m "docs(wiki): split-costi ricalcolato su 90€/mese, scenario gommone"
```

---

### Task 7: Aggiornare requisiti-v1.md

**Files:**
- Modify: `wiki/sintesi/requisiti-v1.md`

- [ ] **Step 1: Aggiornare header**

```markdown
# Requisiti v2 — Le Bestie

Sintesi aggiornata 2026-08-10 dopo conversazioni 9 agosto.  
**Gommone = piano A. Scafo rigido = piano B (condizionato a ≥5 soci).**
```

- [ ] **Step 2: Aggiornare tabella "Mezzo"**

```markdown
| Scafo | **Gommone pneumatico smontabile**, no RIB, trasportabile auto |
| Escluso | Scafo rigido (se non con ≥5 soci e preventivi verificati) |
| Comfort | **Tendalino/copertura sole** aftermarket (opzionale su gommone) |
```

- [ ] **Step 3: Aggiornare tabella "Possesso e costi"**

```markdown
| Prezzo max | **≤2.000 €** bundle gommone+motore usato |
| Gestione annua | **≤30 €/testa/mese** = **≤360 €/testa/anno** |
| Rimessaggio | **Nessuno** (gommone a casa, in auto) |
```

- [ ] **Step 4: Aggiornare filtri shortlist**

```markdown
## Filtri shortlist — track gommoni (PRIMARIO)

1. Pneumatico **non RIB**, smontabile / trasportabile auto
2. Lunghezza ≥3,30 m (ideale 3,50–3,80)
3. ≥4 pax / portata ~≥400 kg
4. Pavimento: paiolato **alluminio** (prio1) o airdeck (prio2)
5. Bundle gommone+motore **≤2.000 €**
6. Motore abbinato: **9.9–15 CV** 4T gambo corto (vedi track motori)
7. Distanza da Lazio nello score

## Filtri shortlist — track rigidi (CONDIZIONALE, ≥5 soci)

1. Usato, prezzo ≤4.500 € (con 5 soci ≈900 €/testa)
2. Motore nei limiti no-patente
3. Gozzo/open/lancia, non gommone
4. Layout ok pesca + spazio 3-5
5. Posto barca o terra con canone ≤1.500 €/anno
6. Stato strutturale accettabile
```

- [ ] **Step 5: Aggiornare frontmatter**

```yaml
title: Requisiti v2
updated: 2026-08-10
```

- [ ] **Step 6: Commit**

```bash
git add wiki/sintesi/requisiti-v1.md
git commit -m "docs(wiki): requisiti v2 — gommone primario, rigido condizionale 5 soci"
```

---

### Task 8: Creare costi-nascosti-gommone.md

**Files:**
- Create: `wiki/concetti/costi-nascosti-gommone.md`

- [ ] **Step 1: Scrivere la pagina**

```markdown
---
title: Costi nascosti gommone
type: concetto
updated: 2026-08-10
status: draft
tags: [gommone, costi, burocrazia, manutenzione]
---

# Costi nascosti — gommone pneumatico

Costi una tantum e ricorrenti oltre all'acquisto di scafo e motore.
**Molte voci sono da verificare con fonti reali.**

## Da verificare — Documenti e burocrazia

| Voce | Domanda | Stima |
|------|---------|-------|
| Passaggio di proprietà | Quanto costa per un gommone usato? | Da verificare |
| Immatricolazione motore | Obbligatoria sopra quanti CV? Costo? | Da verificare |
| Tassa di possesso | C'è un bollo annuale per gommoni con motore? | Da verificare |
| Libretto e documenti | Quali documenti servono per essere in regola? | Da verificare |

## Da verificare — Dotazioni di sicurezza obbligatorie

Per navigare entro 6 miglia dalla costa, quali dotazioni sono obbligatorie per legge?
Costo stimato totale?

| Voce | Obbligatorio? | Costo stimato |
|------|---------------|---------------|
| Giubbotti di salvataggio (n. minimo?) | Da verificare | |
| Cime di ormeggio | Da verificare | |
| Kit di primo soccorso | Da verificare | |
| Estintore | Da verificare | |
| Razzi / segnali | Da verificare | |
| Fischietto / tromba | Da verificare | |
| VHF portatile | Da verificare | |
| Ancora e calumo | Da verificare | |

## Da verificare — Accessori per navigazione notturna

Se si esce di notte (alba pesca, rientro tardi):

| Voce | Costo stimato |
|------|---------------|
| Fanali di via (obbligatori?) | |
| Batteria/pannello per fanali | |
| Torcia potente / riflettori | |

## Da verificare — Manutenzione periodica

| Voce | Frequenza | Costo stimato |
|------|-----------|---------------|
| Tagliando motore (olio, filtro, candela) | Annuale / ogni 100 ore | Da verificare |
| Controllo valvole gommone | Annuale | Da verificare |
| Kit riparazione (toppe, colla) | Occasionale | ~30–60 € |
| Sostituzione pompa | Ogni 2-3 anni | ~30–50 € |

## Da verificare — Assicurazione

| Voce | Costo stimato/anno |
|------|-------------------|
| RC obbligatoria per gommone | 100–150 € (stima) |
| Furto/incendio (opzionale) | Da verificare |
| Infortuni (opzionale) | Da verificare |

## Da verificare — Ricambi e usura

| Voce | Durata stimata | Costo |
|------|----------------|-------|
| Elica di ricambio | Variabile | 30–80 € |
| Tanica carburante | 2-3 anni | ~20–30 € |
| Sacca trasporto | 2-3 anni | ~30–50 € |

## Prossimi passi

1. Chiedere a Sbarco di cercare online ogni voce
2. Telefonare a un'agenzia nautica per passaggio proprietà
3. Chiedere preventivo assicurazione RC gommone
4. Verificare normativa dotazioni su fonti ufficiali (Guardia Costiera/MIT)
```

- [ ] **Step 2: Commit**

```bash
git add wiki/concetti/costi-nascosti-gommone.md
git commit -m "docs(wiki): nuova pagina costi-nascosti-gommone con voci da verificare"
```

---

### Task 9: Creare logistica-trasporto.md

**Files:**
- Create: `wiki/concetti/logistica-trasporto.md`

- [ ] **Step 1: Scrivere la pagina**

```markdown
---
title: Logistica e trasporto gommone
type: concetto
updated: 2026-08-10
status: draft
tags: [gommone, logistica, trasporto, custodia, open-questions]
---

# Logistica e trasporto gommone

Domande aperte su come gestire il gommone nel quotidiano.

## Da verificare — Auto

- Quali bestie hanno un'auto in grado di caricare:
  - Gommone piegato (~70 kg, dimensioni sacca ~130×70×40 cm)
  - Motore fuoribordo (~30-50 kg per 9.9-15 CV)
  - Attrezzatura pesca (canne, cassette, vivo)
  - Altro (tanica, pompa, accessori)
- Serve un portapacchi/gancio? O entra tutto nel bagagliaio?

## Da verificare — Custodia

- Chi tiene il gommone durante la settimana?
- Opzioni: garage, cantina, terrazzo coperto, box auto?
- Il gommone piegato è ingombrante anche da fermo
- Va tenuto asciutto e al riparo dal sole per preservare le valvole

## Da verificare — Accesso al mare

- Scivolo o spiaggia libera vicino Ardea/Pomezia?
- Accesso carrabile fino al punto di gonfiaggio?
- Necessari permessi per varare da spiaggia libera?

## Da verificare — Ciclo uscita tipo

Basato su [[concetti/montaggio-gommone]]:

1. Caricare tutto in auto a casa (~15 min)
2. Guidare fino al punto di accesso (~15-30 min)
3. Scaricare, gonfiare, montare motore (~30 min)
4. Uscita (3-6 ore)
5. Rientro: smontare, lavare, sgonfiare, caricare (~45 min)
6. Tornare a casa, scaricare (~15 min)

**Tempo totale accessorio: ~2 ore per ogni uscita.**

## Impatto sulla frequenza

Con 2 ore di preparazione/riordino per uscita:
- Realistico: **1-2 uscite al mese** (weekend)
- In estate: forse 3-4 al mese
- In inverno: 1 al mese (pesca, giornate calme)

## Alternative da esplorare

- Trovare un garage/box vicino al mare per lasciare gommone+motore?
- Noleggio stagionale di un piccolo spazio?

## Prossimi passi

1. Ogni bestia verifichi capacità propria auto
2. Identificare chi ha spazio custodia
3. Provare un'uscita "a secco" (carico/scarico senza andare in acqua)
4. Mappare scivoli e accessi nel raggio di 30 min da Ardea
```

- [ ] **Step 2: Commit**

```bash
git add wiki/concetti/logistica-trasporto.md
git commit -m "docs(wiki): nuova pagina logistica-trasporto gommone"
```

---

### Task 10: Creare scenario-rigido-5-soci.md

**Files:**
- Create: `wiki/sintesi/scenario-rigido-5-soci.md`

- [ ] **Step 1: Scrivere la pagina**

```markdown
---
title: Scenario scafo rigido (5 soci)
type: sintesi
updated: 2026-08-10
status: conditional
tags: [scafo-rigido, scenario, 5-soci]
---

# Scenario scafo rigido — con 5 soci

Scenario futuro, attivabile solo se:
1. Si trovano **almeno 5 soci** disposti a partecipare
2. Si ottengono **preventivi reali** di ormeggio/terra che dimostrino ≤30 €/testa/mese

## Cosa serve

| Voce | Stima |
|------|-------|
| Soci minimi | **5** (3 bestie + 2 nuovi) |
| Budget acquisto | ≤4.500 € (900 €/testa con 5 soci) |
| Mezzo | Gozzo/open/lancia usato, ≤40,8 CV |
| Rimessaggio | Posto barca o terra, canone fisso |
| Costi fissi mensili | Da dimostrare ≤150 €/mese totali (30×5) |

## Perche' 5 soci

Con 3 soci il costo fisso mensile (posto barca o terra + assicurazione) supera quasi sempre i 30 €/testa:

| Voce | Costo mese | /3 bestie | /5 soci |
|------|------------|-----------|---------|
| Posto barca (basso) | 70 € | 23 € | 14 € |
| Posto barca (medio) | 170 € | 57 € | 34 € |
| Cantiere terra (basso) | 35 € | 12 € | 7 € |
| Cantiere terra (medio) | 100 € | 33 € | 20 € |
| Assicurazione RC | 12 € | 4 € | 2,50 € |
| Manutenzione + carburante | 30 € | 10 € | 6 € |

Con 5 soci, anche lo scenario "cantiere terra medio" sta dentro i 30 €/testa/mese.
Con 3 soci, serve un affare vero sul canone.

## Cosa manca per attivare

- [ ] Trovare 2 soci aggiuntivi interessati
- [ ] Preventivi reali: posto barca Anzio/Nettuno × 2 + cantiere terra × 2
- [ ] Verificare se i 2 nuovi soci hanno patente (aprirebbe fascia 40+ CV)
- [ ] Accordo scritto aggiornato per 5 soci

## Vantaggi dello scafo rigido

- Praticità: barca sempre pronta, zero montaggio
- Comfort: spazio, tendalino, stabilità
- Prestigio: esperienza più "nautica"
- Rivendibilità: scafo rigido tiene meglio il valore

## Svantaggi

- Costi fissi più alti e permanenti (si paga anche i mesi che non si usa)
- Vincolo geografico (porto/cantiere fisso)
- Manutenzione più costosa (antifouling, osmosi, scafo)
- Dipendenza da 5 persone (più difficile coordinare)
```

- [ ] **Step 2: Commit**

```bash
git add wiki/sintesi/scenario-rigido-5-soci.md
git commit -m "docs(wiki): scenario scafo rigido con 5 soci"
```

---

### Task 11: Aggiornare index.md e log.md

**Files:**
- Modify: `wiki/index.md`
- Modify: `wiki/log.md`

- [ ] **Step 1: Aggiornare index.md**

Aggiungere nella tabella "Concetti":

```markdown
| [[concetti/costi-nascosti-gommone]] | Costi una tantum e ricorrenti oltre all'acquisto — da verificare |
| [[concetti/logistica-trasporto]] | Auto, custodia, ciclo uscita — da verificare |
| [[concetti/montaggio-gommone]] | Ciclo completo montaggio/smontaggio e fatica operativa |
```

Aggiungere nella tabella "Sintesi":

```markdown
| [[sintesi/scenario-rigido-5-soci]] | Cosa servirebbe per attivare il track scafo rigido |
| [[sintesi/conversazioni-audio-20260809]] | 45 trascrizioni WhatsApp 9 agosto 2026 |
```

Aggiornare frontmatter: `updated: 2026-08-10`

- [ ] **Step 2: Append a log.md**

```markdown
## [2026-08-10] decisione | Gommone primario, budget 2000€, 30€/mese

Dopo le conversazioni del 9 agosto e l'analisi dei costi fissi:
- **Gommone pneumatico** = unica via fattibile con il budget mensile attuale (≤30 €/testa/mese)
- **Scafo rigido** = scenario futuro condizionato a ≥5 soci con preventivi reali
- **Budget acquisto**: ≤2.000 € bundle gommone+motore usato
- **Costi fissi**: ≤30 €/testa/mese (90 €/mese totali) — ampiamente raggiungibile col gommone (~10 €/testa/mese)
- Nuove pagine wiki: `costi-nascosti-gommone`, `logistica-trasporto`, `scenario-rigido-5-soci`
- Pagine aggiornate: overview, must-have, budget, open-questions, track-gommoni, split-costi, requisiti (v2), index
- Restano da verificare: costi reali (passaggio, documenti, dotazioni), logistica (auto, custodia), accordo scritto

## [2026-08-09] ingest | 45 trascrizioni audio WhatsApp

45 messaggi vocali tra le bestie. Temi: costi fissi, gommone vs rigido, danni e split, modelli valutati, regole.
Sintesi completa: [[sintesi/conversazioni-audio-20260809]]
```

- [ ] **Step 3: Commit**

```bash
git add wiki/index.md wiki/log.md
git commit -m "docs(wiki): index aggiornato, log — decisione gommone primario"
```

---

## FASE 2 — Aggiornamento Sito

### Task 12: Aggiornare regole.html

**Files:**
- Modify: `presentazione/regole.html`

- [ ] **Step 1: Modificare card 03 — budget**

Da:
```html
<div class="card-title">03 · Solo usato ≤ 4.500€</div>
<p>Tetto sul mezzo. Stretch minimo solo se è il sogno vero. Riserva lavori a parte.</p>
```
A:
```html
<div class="card-title">03 · Solo usato ≤ 2.000€</div>
<p>Bundle gommone+motore. Stretch minimo solo se affare eccezionale.</p>
```

- [ ] **Step 2: Modificare card 04 — mezzo**

Da:
```html
<div class="card-title">04 · Scafo rigido</div>
<p>Gozzo / open / lancia. Comodo, robusto. <strong style="color:var(--foam)">Tendalino</strong> alzabile (anche aftermarket).</p>
```
A:
```html
<div class="card-title">04 · Gommone trasportabile</div>
<p>Pneumatico smontabile, no RIB. In auto, si gonfia in spiaggia. <strong style="color:var(--foam)">Paiolato alluminio</strong> e chiglia gonfiabile.</p>
```

- [ ] **Step 3: Modificare card 06 — gestione**

Da:
```html
<p>≤ <strong style="color:var(--foam)">1.200€ a testa / anno</strong> = max 3.600€ totali all-in (ormeggio, assi, manutenzione, carburante…).</p>
```
A:
```html
<p>≤ <strong style="color:var(--foam)">30€ a testa / mese</strong> = max 90€ totali (assicurazione, manutenzione, carburante).</p>
```

- [ ] **Step 4: Modificare chip "Al bancone si dice anche no"**

Da:
```html
<span class="chip chip-no">Gommone / RIB</span>
<span class="chip chip-no">Carrello & traino</span>
<span class="chip chip-no">Nuovo di listino</span>
<span class="chip chip-no">Performance a 6</span>
<span class="chip chip-go">Gozzo / open</span>
<span class="chip chip-go">Usato Lazio</span>
<span class="chip chip-go">Tendalino</span>
<span class="chip chip-mid">≤40,8 CV</span>
```
A:
```html
<span class="chip chip-no">Scafo rigido (con 3 soci)</span>
<span class="chip chip-no">Carrello & traino</span>
<span class="chip chip-no">Nuovo di listino</span>
<span class="chip chip-no">Posto barca fisso</span>
<span class="chip chip-go">Gommone pneumatico</span>
<span class="chip chip-go">Usato ≤2.000€</span>
<span class="chip chip-go">Paiolato Al</span>
<span class="chip chip-mid">≤40,8 CV</span>
```

- [ ] **Step 5: Modificare filtri shortlist**

Da:
```html
<h3>Non gommone</h3>
<p>Scafo rigido. Fine della discussione tubolari.</p>
```
A:
```html
<h3>Non RIB, non rigido</h3>
<p>Gommone pneumatico smontabile. Paiolato alluminio o airdeck.</p>
```

Da:
```html
<h3>Posto o terra</h3>
<p>Niente dipendenza dal carrello di nessuno.</p>
```
A:
```html
<h3>Trasporto in auto</h3>
<p>Niente carrello. Gommone+motore nel bagagliaio.</p>
```

- [ ] **Step 6: Commit**

```bash
git add presentazione/regole.html
git commit -m "feat(site): regole allineate a gommone primario, budget 2000€"
```

---

### Task 13: Aggiornare status.html

**Files:**
- Modify: `presentazione/status.html`

- [ ] **Step 1: Modificare board items**

Da:
```html
<strong>Budget ≤4.500€ usato</strong>
<span class="badge badge-done">Fatto</span>
```
A:
```html
<strong>Budget ≤2.000€ bundle</strong>
<span class="badge badge-done">Fatto</span>
```

Da:
```html
<strong>No gommone · no carrello</strong>
<span class="badge badge-done">Fatto</span>
```
A:
```html
<strong>Gommone primario</strong>
<span class="badge badge-done">Deciso</span>
```

Da:
```html
<strong>Rimessaggio A o C</strong>
<span class="badge badge-wip">Aperto</span>
```
A:
```html
<strong>Logistica trasporto</strong>
<span class="badge badge-wip">Da chiarire</span>
```

Aggiungere dopo "Shortlist modelli":
```html
<div class="board-row" data-reveal>
  <strong>Costi reali da verificare</strong>
  <span class="badge badge-wip">Da fare</span>
</div>
```

- [ ] **Step 2: Aggiornare la frase finale**

Da:
```html
Filtri pronti.<br />
Candidati no.<br />
Tocca cacciare — e chiamare i porti.
```
A:
```html
Gommone deciso.<br />
Candidati no.<br />
Tocca cacciare — e verificare i costi.
```

- [ ] **Step 3: Commit**

```bash
git add presentazione/status.html
git commit -m "feat(site): status allineato a gommone primario"
```

---

### Task 14: Aggiornare mosse.html, mercato.html, base.html

**Files:**
- Modify: `presentazione/mosse.html`
- Modify: `presentazione/mercato.html`
- Modify: `presentazione/base.html`

- [ ] **Step 1: mosse.html — aggiungere step gommone**

Dopo la card "Checklist ispezione", aggiungere:
```html
<div class="todo-item" data-reveal>
  <div>
    <h3>Verificare auto e custodia</h3>
    <p>Chi ha spazio in auto per gommone+motore? Chi lo tiene a casa? Serve uno scivolo vicino?</p>
  </div>
</div>
<div class="todo-item" data-reveal>
  <div>
    <h3>Preventivi assicurazione</h3>
    <p>RC gommone per principianti. Un paio di telefonate, 10 minuti.</p>
  </div>
</div>
```

Modificare plus annuncio:
```html
<span class="chip chip-go">Paiolato alluminio</span>
<span class="chip chip-go">Chiglia gonfiabile</span>
<span class="chip chip-go">4 tempi ≤40 CV</span>
<span class="chip chip-go">Bundle gommone+motore</span>
<span class="chip chip-go">Documenti in regola</span>
```

- [ ] **Step 2: mercato.html — allineare a gommone**

Da:
```html
<span class="chip chip-no">Gommoni = fuori brief</span>
<span class="chip chip-go">Gozzi / open / lancia</span>
```
A:
```html
<span class="chip chip-go">Gommoni pneumatici</span>
<span class="chip chip-no">Gozzi / open (solo con 5 soci)</span>
```

Modificare esempi prezzi: invece di gozzi 2.600–5.000€, mostrare esempi gommoni:
```html
<div class="card-title">900€ · Lazio</div>
<p>Gommone 3.60 m, paiolato Al, senza motore — benchmark Argo.</p>

<div class="card-title">1.800€ · Lazio</div>
<p>Bundle gommone 3.50 m + Mercury 9.9 CV 4T — nel budget.</p>

<div class="card-title">2.100€ · stretch</div>
<p>Gommone 3.80 m + Yamaha 15 CV 4T — leggermente sopra, da trattare.</p>
```

Da:
```html
Cacciamo gozzi.<br />Non collezioniamo annunci.
```
A:
```html
Cacciamo gommoni.<br />Non collezioniamo annunci.
```

- [ ] **Step 3: base.html — riscrittura**

Sostituire l'intera sezione `<main>` con:

```html
<main class="page">
  <header class="ph wrap">
    <a class="ph__back" href="./index.html">&larr; Manifesto</a>
    <span class="eyebrow">04 &middot; Dove vive il gommone</span>
    <h1 class="display display-lg">Trasporto</h1>
    <p class="ph__sub">Niente posto barca, niente cantiere. Il gommone viaggia in auto e sta a casa.</p>
  </header>

  <section class="sec wrap">
    <div class="sec-label"><span class="eyebrow">Perche' niente posto barca</span></div>
    <div class="card" data-reveal>
      <div class="card-title">Gommone = niente rimessaggio</div>
      <p>Uno scafo rigido ha bisogno di un posto fisso (acqua o terra) che costa centinaia di euro al mese. Il gommone si sgonfia, si piega e si mette in auto o in cantina. <strong style="color:var(--foam)">Costo rimessaggio: zero.</strong></p>
    </div>
  </section>

  <section class="sec wrap">
    <div class="sec-label"><span class="eyebrow">Cosa serve</span></div>
    <div class="stat-wall">
      <div class="stat" data-reveal>
        <div class="stat__val">1</div>
        <div class="stat__lbl">Auto con bagagliaio capiente</div>
      </div>
      <div class="stat" data-reveal>
        <div class="stat__val">1</div>
        <div class="stat__lbl">Posto asciutto a casa (garage/cantina)</div>
      </div>
      <div class="stat" data-reveal>
        <div class="stat__val">1</div>
        <div class="stat__lbl">Scivolo/spiaggia nel raggio di 30 min</div>
      </div>
    </div>
  </section>

  <section class="sec wrap">
    <div class="sec-label"><span class="eyebrow">Ciclo di un'uscita</span></div>
    <div class="card" data-reveal>
      <p>Carico auto (15 min) &rarr; guida allo scivolo (15-30 min) &rarr; gonfiaggio e montaggio motore (30 min) &rarr; <strong style="color:var(--foam)">uscita!</strong> &rarr; smontaggio, lavaggio, carico (45 min) &rarr; rientro a casa (15 min).</p>
      <p style="margin-top:0.5rem;color:var(--foam-dim);font-size:0.92rem">Tempo accessorio per uscita: ~2 ore. Dettaglio: [[concetti/montaggio-gommone]].</p>
    </div>
  </section>

  <section class="sec wrap">
    <div class="sec-label"><span class="eyebrow">Cosa manca ancora</span></div>
    <div class="card" data-reveal>
      <div class="card-title">Da decidere tra le bestie</div>
      <ul class="risk-list">
        <li>Chi ha l'auto adatta? (gommone 70 kg + motore 30-50 kg + attrezzatura)</li>
        <li>Chi tiene il gommone a casa? (garage, cantina, terrazzo coperto)</li>
        <li>Quale scivolo/spiaggia usare vicino Ardea/Pomezia?</li>
        <li>Quante uscite al mese sono realistiche con questi tempi?</li>
      </ul>
    </div>
  </section>

  <p class="footer-note wrap">Trasporto gommone &middot; Le Bestie</p>
</main>
```

- [ ] **Step 4: Commit**

```bash
git add presentazione/mosse.html presentazione/mercato.html presentazione/base.html
git commit -m "feat(site): mosse, mercato, base allineati a gommone primario"
```

---

## FASE 3 — Sbarco Agentico (Worker Refactor)

### Task 15: Refactor system prompt builder

**Files:**
- Modify: `worker/src/index.js`

**Interfaces:**
- Consumes: KV namespace `SBARCO_KV`, env vars `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`
- Produces: `buildSystemPrompt(kv)` → string, usata da `buildMessages()`

- [ ] **Step 1: Rimuovere SYSTEM_PROMPT costante e creare builder**

Rimuovere le righe 232-259 (SYSTEM_PROMPT) e sostituire con:

```javascript
const WIKI_REPO_RAW = "https://raw.githubusercontent.com/tizianocarpentieri/Barca/main";

const WIKI_PAGES = {
  overview: { path: "wiki/overview.md", cacheTtl: 21600 },
  mustHave: { path: "wiki/preferenze/must-have.md", cacheTtl: 21600 },
  budget: { path: "wiki/preferenze/budget.md", cacheTtl: 21600 },
  openQuestions: { path: "wiki/preferenze/open-questions.md", cacheTtl: 21600 },
  splitCosti: { path: "wiki/preferenze/split-costi.md", cacheTtl: 21600 },
  requisiti: { path: "wiki/sintesi/requisiti-v1.md", cacheTtl: 21600 },
  index: { path: "wiki/index.md", cacheTtl: 3600 },
};

const EMBEDDED_WIKI = {
  montaggio: `{montaggio-gommone.md content}`,
  normativa: `{limiti-senza-patente.md content}`,
};

async function fetchWikiPage(kv, key, pageDef) {
  const cacheKey = `wiki:cache:${key}`;
  try {
    const cached = await kv.get(cacheKey);
    if (cached) return cached;
  } catch {}

  const url = `${WIKI_REPO_RAW}/${pageDef.path}`;
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "Sbarco/1.0" } });
    if (!resp.ok) return `[${key} non disponibile]`;
    const text = await resp.text();
    await kv.put(cacheKey, text, { expirationTtl: pageDef.cacheTtl });
    return text;
  } catch {
    return `[${key} non disponibile]`;
  }
}

async function buildSystemPrompt(kv) {
  const pages = {};
  for (const [key, def] of Object.entries(WIKI_PAGES)) {
    pages[key] = await fetchWikiPage(kv, key, def);
  }

  return `Sei Sbarco, l'assistente del Progetto Barca delle Bestie (Tiziano, Antonio, Peppe).
Rispondi in italiano, tono amichevole e diretto. Sei un membro della crew.
Usa **grassetto** per enfasi, elenchi puntati e testo strutturato.

Usa gli strumenti disponibili quando necessario:
- **search_web**: per cercare prezzi, normative, costi reali, recensioni modelli
- **read_wiki**: per leggere pagine della wiki non incluse nel contesto
- **save_doc**: per salvare confronti, checklist, analisi in documenti scaricabili

STATO PROGETTO:
${pages.overview || "Non disponibile"}

REQUISITI:
${pages.mustHave || "Non disponibile"}

BUDGET:
${pages.budget || "Non disponibile"}

DOMANDE APERTE:
${pages.openQuestions || "Non disponibile"}

REGOLE DANNI E SPLIT:
${pages.splitCosti || "Non disponibile"}

REQUISITI DETTAGLIATI:
${pages.requisiti || "Non disponibile"}

NORMATIVA NO-PATENTE:
${EMBEDDED_WIKI.normativa}

LOGISTICA GOMMONE:
${EMBEDDED_WIKI.montaggio}

REGOLE:
- Se l'utente esprime una preferenza o un vincolo, ricordalo.
- Cita sempre la fonte se presente nella wiki o trovata via web.
- Se non hai dati certi su una domanda, dillo e offri di cercare con search_web.
- Per generare documenti (confronti, checklist, analisi), usa save_doc.
- Non inventare prezzi, modelli o normative.
- Se la domanda riguarda Peppe, Antonio o Tiziano, usa il nome.
- Usa formattazione markdown semplice.`;
}
```

- [ ] **Step 2: Aggiornare buildMessages**

Rimuovere la vecchia funzione `buildMessages` e sostituire con:

```javascript
function buildMessages(systemPrompt, question, memoryFacts, history, summary) {
  const messages = [
    { role: "system", content: systemPrompt },
  ];

  if (memoryFacts.length > 0) {
    const factsText = memoryFacts
      .slice(-MAX_MEMORY_FACTS)
      .map(f => `- [${f.date?.slice(0, 10) || "?"}] ${f.user}: ${f.fact}`)
      .join("\n");
    messages.push({ role: "system", content: `MEMORIA CONDIVISA:\n${factsText}` });
  }

  if (summary) {
    messages.push({ role: "system", content: `RIEPILOGO CONVERSAZIONI PRECEDENTI:\n${summary}` });
  }

  for (const msg of history) {
    messages.push(msg);
  }

  messages.push({ role: "user", content: question });

  return messages;
}
```

- [ ] **Step 3: Commit**

```bash
git add worker/src/index.js
git commit -m "feat(sbarco): system prompt dinamico da wiki via KV cache + GitHub raw"
```

---

### Task 16: Aggiungere tool definitions e tool loop

**Files:**
- Modify: `worker/src/index.js`

- [ ] **Step 1: Definire i tools**

Aggiungere dopo la funzione `buildSystemPrompt`:

```javascript
const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Cerca nel web informazioni su barche, gommoni, motori, prezzi, normative nautiche, costi di manutenzione. Usa quando la wiki non ha dati sufficienti o quando servono prezzi/normative aggiornati.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Query di ricerca in italiano" }
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_wiki",
      description: "Legge una pagina della wiki di progetto. Usa per approfondire modelli, confronti, normative, o qualsiasi pagina non nel contesto base. Passa il percorso relativo dalla root del repo, es. 'wiki/modelli/argo-evo-360.md' o 'wiki/confronti/rimessaggio-abc.md'.",
      parameters: {
        type: "object",
        properties: {
          page: { type: "string", description: "Percorso pagina wiki, es. 'wiki/modelli/argo-evo-360.md'" }
        },
        required: ["page"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_doc",
      description: "Salva un documento (confronto, checklist, analisi, tabella) che l'utente potra' scaricare. Usa quando l'utente chiede di salvare qualcosa o quando generi un'analisi strutturata che vale la pena conservare.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titolo del documento" },
          content: { type: "string", description: "Contenuto in formato markdown" }
        },
        required: ["title", "content"],
        additionalProperties: false,
      },
    },
  },
];
```

- [ ] **Step 2: Implementare esecuzione tools**

```javascript
async function executeSearchWeb(query) {
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  try {
    const resp = await fetch(ddgUrl, {
      headers: { "User-Agent": "Sbarco/1.0 (boat research bot)" },
    });
    const html = await resp.text();
    const results = [];
    const regex = /<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>[\s\S]*?<a class="result__snippet[^"]*">([^<]+)<\/a>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      results.push({
        title: match[2].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
        url: match[1],
        snippet: match[3].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
      });
      if (results.length >= 5) break;
    }
    return results.length > 0
      ? results.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   ${r.url}`).join("\n\n")
      : "Nessun risultato trovato.";
  } catch (err) {
    return `Errore nella ricerca: ${err.message}`;
  }
}

async function executeReadWiki(page) {
  const cleanPage = page.replace(/^\/+/, "").replace(/\.\.\//g, "");
  const url = `${WIKI_REPO_RAW}/${cleanPage}`;
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "Sbarco/1.0" } });
    if (!resp.ok) return `Pagina wiki '${cleanPage}' non trovata (HTTP ${resp.status}).`;
    const text = await resp.text();
    return text.length > 8000 ? text.slice(0, 8000) + "\n\n[... troncato, troppo lungo]" : text;
  } catch (err) {
    return `Errore nel leggere la wiki: ${err.message}`;
  }
}

async function executeTool(toolCall) {
  const { name, arguments: argsStr } = toolCall.function;
  let args = {};
  try {
    args = JSON.parse(argsStr);
  } catch {}

  switch (name) {
    case "search_web":
      return await executeSearchWeb(args.query || "");
    case "read_wiki":
      return await executeReadWiki(args.page || "");
    case "save_doc": {
      return `Documento "${args.title}" salvato con successo.\n\nContenuto:\n${args.content}`;
    }
    default:
      return `Tool sconosciuto: ${name}`;
  }
}
```

- [ ] **Step 3: Implementare tool loop**

```javascript
async function chatWithTools(apiKey, model, messages, maxIterations = 3) {
  const allMessages = [...messages];
  let documents = [];

  for (let i = 0; i < maxIterations; i++) {
    const body = {
      model: model || "deepseek-v4-flash",
      messages: allMessages,
      tools: TOOLS,
      temperature: 0.7,
      max_tokens: 2000,
      extra_body: { thinking: { type: "enabled" } },
    };

    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`DeepSeek HTTP ${resp.status}: ${err.slice(0, 200)}`);
    }

    const data = await resp.json();
    const choice = data.choices[0];
    const message = choice.message;

    allMessages.push(message);

    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const result = await executeTool(toolCall);

        if (toolCall.function.name === "save_doc") {
          const args = JSON.parse(toolCall.function.arguments);
          documents.push({ title: args.title, content: args.content });
        }

        allMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }
    } else {
      return {
        response: message.content,
        documents,
        usage: data.usage || {},
        toolRounds: i,
      };
    }
  }

  return {
    response: allMessages[allMessages.length - 1]?.content || "Non sono riuscito a completare la risposta.",
    documents,
    usage: {},
    toolRounds: maxIterations,
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add worker/src/index.js
git commit -m "feat(sbarco): tool definitions, esecuzione, tool loop (search, wiki, doc)"
```

---

### Task 17: Aggiornare il main handler per usare nuovo sistema

**Files:**
- Modify: `worker/src/index.js`

- [ ] **Step 1: Aggiornare la sezione chat del main handler**

Sostituire la parte da `// 1. Traverse graph` a `// 4. Call DeepSeek` (righe ~519-541) con:

```javascript
// 1. Build dynamic system prompt
const systemPrompt = await buildSystemPrompt(env.SBARCO_KV);

// 2. Load memory + history
const [memoryFacts, history, summary] = await Promise.all([
  getMemory(env.SBARCO_KV),
  getChatHistory(env.SBARCO_KV, userId),
  getSummary(env.SBARCO_KV, userId),
]);

// 3. Build messages (senza graph traversal, il grafo e' nel contesto embedded)
const messages = buildMessages(systemPrompt, question, memoryFacts, history, summary);

// 4. Call DeepSeek with tool loop
const result = await chatWithTools(apiKey, env.DEEPSEEK_MODEL, messages);
```

- [ ] **Step 2: Aggiornare la risposta per includere documents**

Sostituire la costruzione della response (dopo la chiamata API, righe ~579-586) con:

```javascript
const responsePayload = {
  response: result.response,
  subgraphSize: 0,
  remaining: Math.max(0, MAX_DAILY_MESSAGES - newCount),
};

if (result.documents && result.documents.length > 0) {
  responsePayload.documents = result.documents;
}

return new Response(JSON.stringify(responsePayload), { headers: corsHeaders });
```

- [ ] **Step 3: Rimuovere la chiamata a traverseGraph e subgraphToText**

Queste funzioni non vengono piu' chiamate nel flusso principale. Il grafo esiste ancora nel bundle per eventuali futuri usi ma non e' piu' la fonte primaria. Opzionale: commentare con `// DEPRECATED: il grafo ora e' nel sistema prompt embedded, non piu' query-time`.

- [ ] **Step 4: Commit**

```bash
git add worker/src/index.js
git commit -m "feat(sbarco): main handler usa system prompt dinamico + tool loop"
```

---

### Task 18: Aggiornare sbarco.js per download documenti

**Files:**
- Modify: `presentazione/src/js/sbarco.js`

- [ ] **Step 1: Aggiungere logica documenti nella gestione risposta**

Dopo `addMsg("sbarco", data.response);` (riga ~156), aggiungere:

```javascript
if (data.documents && data.documents.length > 0) {
  for (const doc of data.documents) {
    addDocumentMsg(doc);
  }
}
```

- [ ] **Step 2: Aggiungere funzione addDocumentMsg**

Dopo la funzione `capitalize` (riga ~236), aggiungere:

```javascript
function addDocumentMsg(doc) {
  const div = document.createElement("div");
  div.className = "sbarco-msg sbarco-msg--sbarco";

  const body = document.createElement("div");
  body.className = "sbarco-msg__body";
  body.innerHTML = `
    <strong>Documento salvato:</strong> ${escapeHtml(doc.title)}<br>
    <button class="sbarco-doc-btn" data-content="${escapeHtml(doc.content)}" data-title="${escapeHtml(doc.title)}">
      Scarica .md
    </button>
    <button class="sbarco-doc-btn sbarco-doc-btn--txt" data-content="${escapeHtml(doc.content)}" data-title="${escapeHtml(doc.title)}">
      Scarica .txt
    </button>
  `;
  div.appendChild(body);
  msgsEl.appendChild(div);
  msgsEl.scrollTop = msgsEl.scrollHeight;

  setTimeout(() => {
    div.querySelectorAll(".sbarco-doc-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const content = btn.getAttribute("data-content");
        const title = btn.getAttribute("data-title");
        const isTxt = btn.classList.contains("sbarco-doc-btn--txt");
        const ext = isTxt ? "txt" : "md";
        const cleanContent = isTxt
          ? content.replace(/\\*\\*(.+?)\\*\\*/g, "$1").replace(/\\*(.+?)\\*/g, "$1")
          : content;

        const blob = new Blob([cleanContent], { type: "text/plain;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    });
  }, 0);
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
```

- [ ] **Step 3: Aggiungere stile CSS per pulsanti documento**

In `presentazione/src/styles/sbarco.css`, aggiungere:

```css
.sbarco-doc-btn {
  background: var(--sbarco-accent);
  color: var(--sbarco-bg);
  border: none;
  padding: 3px 8px;
  margin-top: 4px;
  margin-right: 4px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  letter-spacing: .04em;
  text-transform: uppercase;
  transition: opacity .15s;
}
.sbarco-doc-btn:hover { opacity: .85; }
.sbarco-doc-btn--txt {
  background: var(--sbarco-surface);
  color: var(--sbarco-text);
  border: 1px solid var(--sbarco-border);
}
```

- [ ] **Step 4: Commit**

```bash
git add presentazione/src/js/sbarco.js presentazione/src/styles/sbarco.css
git commit -m "feat(sbarco): frontend download documenti generati"
```

---

### Task 19: Aggiornare embedded wiki content nel worker

**Files:**
- Modify: `worker/src/index.js`

- [ ] **Step 1: Sostituire i placeholder in EMBEDDED_WIKI**

I contenuti placeholder `{montaggio-gommone.md content}` e `{limiti-senza-patente.md content}` vanno sostituiti con il testo reale dei file. Il contenuto esatto e' gia' presente nei file wiki. Copiarlo come stringa template.

Per `montaggio-gommone.md`: il contenuto e' di ~62 righe (Task 1 di questa fase non lo modifica, e' gia' stato creato). Inserire il testo completo.

Per `limiti-senza-patente.md`: leggere il file e inserirlo.

- [ ] **Step 2: Commit**

```bash
git add worker/src/index.js
git commit -m "feat(sbarco): embed contenuti wiki statici (montaggio, normativa)"
```

---

### Task 20: Verifica finale e lint

**Files:**
- Verify: tutti i file modificati

- [ ] **Step 1: Verificare coerenza wiki**

Leggere `wiki/overview.md`, `wiki/index.md`, `wiki/log.md` e confermare che tutti i link wikilink puntino a pagine esistenti e che i dati siano coerenti tra loro.

- [ ] **Step 2: Verificare sito**

Controllare che nessuna pagina HTML abbia riferimenti residui a "4.500€", "scafo rigido" come primario, "no gommone", "posto barca" come necessita'.

Comando: `rg "4\.500|scafo rigido|no gommone|posto barca" presentazione/ --include="*.html" | grep -v "5 soci\|condizional\|scenario"`

- [ ] **Step 3: Verificare worker**

Controllare che non ci siano riferimenti al vecchio SYSTEM_PROMPT o a traverseGraph nel flusso principale.

- [ ] **Step 4: Build presentazione di test**

```bash
cd presentazione && npm run build
```

Verificare che la build completi senza errori.

- [ ] **Step 5: Commit finale**

```bash
git add -A
git commit -m "chore: verifica finale e pulizia"
```
```

(End of file - total 45 lines)
