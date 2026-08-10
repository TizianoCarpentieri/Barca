# Design: Allineamento Wiki + Sito + Sbarco Agentico

Data: 2026-08-10
Status: approved

## Contesto

Dopo 45 trascrizioni audio del 9 agosto 2026, la direzione del progetto Barca e' cambiata radicalmente rispetto a quanto documentato nella wiki (ferma al 5 agosto). Il sito mostra dati obsoleti. Sbarco (il chatbot) ha un system prompt hardcoded, non fa ricerche web, e non usa la wiki come fonte.

## Nuova direzione (da conversazioni 9 agosto + allineamento 10 agosto)

| Asse | Prima | Dopo |
|------|-------|------|
| Mezzo primario | Dual track rigidi/gommoni | **Gommone pneumatico smontabile** (unica via fattibile) |
| Scafo rigido | Preferito per praticita' | Desiderio, ma realistico solo con 5 soci e preventivi reali |
| Budget acquisto | <=4.500 EUR (rigidi) + 970 EUR ref gommone | **<=2.000 EUR bundle** gommone+motore usato |
| Costi fissi | <=1.200 EUR/testa/anno | **<=30 EUR/testa/mese** (90 EUR/mese totali) |
| Carrello | Escluso per rigidi | Gommone in auto, niente carrello |
| Rimessaggio | Posto barca o terra | Non applicabile (gommone a casa) |

## Tre aree di intervento

---

## 1. Revisione Wiki

Source of truth. Ogni modifica si propaga a sito e Sbarco.

### File da modificare

| File | Azione |
|------|--------|
| `wiki/overview.md` | Riscrivere: gommone come primario, rigido scenario 5 soci. Tetto mensile 30 EUR/testa. Stato e next steps allineati. |
| `wiki/preferenze/must-have.md` | Track A (rigidi): declassato a `status: conditional`. Track B (gommoni): promosso a primario con budget 2.000 EUR bundle. Aggiungere tetto mensile 30 EUR/testa. |
| `wiki/preferenze/budget.md` | Nuova sezione "Scenario gommone primario" con costi reali. Scenario rigido spostato in fondo come condizionato. Tetto 90 EUR/mese. |
| `wiki/preferenze/open-questions.md` | Chiudere item decisi. Nuove open: auto adatte, chi tiene il gommone, costi reali da verificare. |
| `wiki/preferenze/track-gommoni.md` | Da "parallelo" a **primario**. Aggiungere sezione open questions logistiche. |
| `wiki/preferenze/split-costi.md` | Ricalcolare con nuovo tetto 90 EUR/mese totali. |
| `wiki/sintesi/requisiti-v1.md` | Gommone = piano A. Rigido = piano B con 5 soci. Filtri aggiornati. |
| `wiki/index.md` | Aggiungere pagine mancanti: split-costi, montaggio-gommone, conversazioni-audio-20260809. |
| `wiki/log.md` | Append: conversazioni 9 ago, cambio direzione gommone primario. |

### Nuove pagine

| File | Contenuto |
|------|-----------|
| `wiki/concetti/costi-nascosti-gommone.md` | Sezioni "Da verificare" per: manutenzione gommone, passaggio proprieta', tagliando motore, documenti obbligatori, dotazioni sicurezza, accessori notturni, prodotti per norma. |
| `wiki/concetti/logistica-trasporto.md` | Sezioni "Da verificare" per: chi ha auto adatta, dove si tiene durante la settimana, ciclo uscita tipo. |
| `wiki/sintesi/scenario-rigido-5-soci.md` | Cosa servirebbe: 5 soci, preventivi reali, costi/mese a testa. |

### Principi
- Le pagine `costi-nascosti-gommone.md` e `logistica-trasporto.md` nascono con sezioni `## Da verificare` — Sbarco ne e' cosciente e informera' le bestie che servono dati reali.
- Ogni modifica che contraddice un dato precedente va marcata e loggata.
- Frontmatter YAML: aggiornare `updated` e `status` (deprecated per dati superati).

---

## 2. Aggiornamento Sito (`presentazione/`)

### File da modificare

| File | Cambi |
|------|-------|
| `regole.html` | Card 04: "Scafo rigido" -> "Gommone trasportabile". Chip: "Gommone / RIB" da `chip-no` a `chip-go`, "Gozzo / open" da `chip-go` a `chip-no`. Budget: "<=4.500 EUR" -> "<=2.000 EUR bundle". Testo filtri: togliere "Non gommone", aggiungere criteri gommone. |
| `status.html` | "Budget <=4.500EUR usato" -> "Budget <=2.000EUR bundle". "No gommone" -> "Gommone primario". "Rimessaggio A o C" -> scenario semplificato. |
| `mosse.html` | Aggiungere step: verificare auto, definire custodia gommone, preventivi assicurazione. Plus annuncio: "Paiolato alluminio", "Chiglia gonfiabile". Togliere riferimenti a posto barca. |
| `mercato.html` | Chip "Gommoni = fuori brief" -> "Gommoni = target". "Cacciamo gozzi" -> aggiornare. Prezzi esempio: allineare a fascia 1.000-2.000 EUR gommoni+motori. |
| `base.html` | Riscrittura completa: non piu' "Dove vive la barca / posto vs terra" ma "Trasporto e custodia gommone" — auto adatte, dove si tiene, ciclo uscita. |
| `equipaggio.html` | Verificato: non contiene riferimenti obsoleti a scafo rigido. Nessuna modifica necessaria. |

### File NON toccati
- `annunci.html`, `gommoni.html`, `motori.html`, `accessori.html` — feed live con filtri in script JS. Aggiornamento filtri in sessione separata se necessario.
- `priorita.html` — contenuto ancora valido (pesca > giri > bagno), non menziona tipo scafo.

---

## 3. Sbarco Agentico (Worker Refactor)

Refactor incrementale di `worker/src/index.js` con pulizia parti obsolete.

### 3.1 System Prompt Dinamico

Non piu' stringa hardcoded. Il worker compone il prompt a ogni richiesta:

**Fonti embeddate a build-time** (nel bundle del worker):
- `wiki/concetti/montaggio-gommone.md`
- `wiki/normativa/limiti-senza-patente.md`
- `graph.json` (201 nodi, 235 archi)

**Fonti fetchate a runtime con cache KV** (TTL 6 ore):
- `wiki/overview.md`
- `wiki/preferenze/must-have.md`
- `wiki/preferenze/budget.md`
- `wiki/preferenze/open-questions.md`
- `wiki/preferenze/split-costi.md`
- `wiki/sintesi/requisiti-v1.md`
- `wiki/index.md` (TTL 1 ora)

**Fonti runtime senza cache** (sempre fresche):
- Memoria KV (fatti estratti dalle conversazioni)
- Chat history utente
- Ultime 5 entry di `wiki/log.md`

Template del prompt:

```
Sei Sbarco, assistente del Progetto Barca (Tiziano, Antonio, Peppe).
Rispondi in italiano, tono amichevole e diretto.

STATO PROGETTO:
{overview.md}

REQUISITI:
{must-have.md}

BUDGET:
{budget.md}

DOMANDE APERTE:
{open-questions.md}

REGOLE DANNI E SPLIT:
{split-costi.md}

REQUISITI DETTAGLIATI:
{requisiti-v1.md}

NORMATIVA NO-PATENTE:
{limiti-senza-patente.md}

LOGISTICA GOMMONE:
{montaggio-gommone.md}

MEMORIA CONDIVISA:
{memory_facts}

REGOLE:
- Cita sempre la fonte (wiki o web).
- Se non hai dati certi su una domanda, dillo e offri di cercare.
- Per domande su costi/normative/modelli non presenti in wiki, usa search_web.
- Per generare documenti (confronti, checklist, analisi), usa save_doc.
- Non inventare prezzi o normative.
- Usa markdown: **grassetto**, elenchi, tabelle.
- Risposte concise ma complete.
```

### 3.2 Strumenti (Tools)

Definizioni OpenAI function calling per DeepSeek:

**`search_web`**
```json
{
  "name": "search_web",
  "description": "Cerca nel web informazioni su barche, gommoni, motori, prezzi, normative nautiche, costi di manutenzione. Usa quando la wiki non ha dati sufficienti o quando servono prezzi/normative aggiornati.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Query di ricerca in italiano"
      }
    },
    "required": ["query"]
  }
}
```
Implementazione: DuckDuckGo HTML (come l'attuale `/api/search`), restituisce titolo + snippet + URL dei primi 5 risultati.

**`read_wiki`**
```json
{
  "name": "read_wiki",
  "description": "Legge una pagina della wiki di progetto (markdown). Usa per approfondire modelli, confronti, normative, o qualsiasi pagina non inclusa nel contesto base.",
  "parameters": {
    "type": "object",
    "properties": {
      "page": {
        "type": "string",
        "description": "Percorso della pagina wiki, es. 'wiki/modelli/argo-evo-360.md' o 'wiki/confronti/rimessaggio-abc.md'"
      }
    },
    "required": ["page"]
  }
}
```
Implementazione: fetch da `https://raw.githubusercontent.com/tizianocarpentieri/Barca/main/{page}` con cache KV opzionale.

**`save_doc`**
```json
{
  "name": "save_doc",
  "description": "Salva un documento (confronto, checklist, analisi, tabella) in formato markdown. L'utente potra' scaricarlo.",
  "parameters": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "description": "Titolo del documento"
      },
      "content": {
        "type": "string",
        "description": "Contenuto in formato markdown"
      }
    },
    "required": ["title", "content"]
  }
}
```
Implementazione: il worker restituisce il contenuto in un campo `document`. Il frontend (`sbarco.js`) mostra un pulsante "Scarica" che attiva il download via `/api/export`.

### 3.3 Tool Loop

```
1. Componi system prompt (wiki cache + memoria + grafo)
2. Invia a DeepSeek V4 Flash con tools
3. Se model risponde con tool_calls:
   a. Esegui ogni tool chiamato (in parallelo se indipendenti)
   b. Aggiungi risultati come messaggi role=tool
   c. Re-invia al modello
   d. Ripeti fino a risposta finale o max 3 iterazioni
4. Estrai fatti dalla conversazione -> memoria KV (esistente)
5. Restituisci risposta (+ eventuale documento generato)
```

### 3.4 Modello

```yaml
model: deepseek-v4-flash
thinking: {type: "enabled"}
reasoning_effort: "medium"
max_tokens: 2000
temperature: 0.7
```

URL API: `https://api.deepseek.com/v1/chat/completions` (stesso endpoint, cambia model name)

### 3.5 Cosa rimane invariato

- Rate limiter (3 msg/giorno, temporaneo)
- Memoria KV (getMemory, addMemory, extractMemoryIfNeeded)
- Chat history e summary (getChatHistory, setChatHistory, maybeSummarize)
- Endpoint `/api/health`, `/api/search` (integrato come tool ma endpoint mantenuto), `/api/export`
- Validazione utenti (tiziano, antonio, peppe)
- Debug buffer e `/debug`

### 3.6 Cosa viene rimosso/pulito

- `SYSTEM_PROMPT` costante hardcoded → sostituito da builder dinamico
- `traverseGraph()` — la logica grafo resta ma come tool opzionale, non come unica fonte
- `subgraphToText()` — semplificato, il grafo diventa contesto supplementare non primario
- `buildMessages()` — riscritto per supportare system prompt dinamico e tool messages

### 3.7 Frontend (`sbarco.js`)

Modifiche:
- Aggiungere pulsante "Scarica documento" quando la risposta contiene `document`
- Gestione risposte piu' lunghe (scroll fluido, gia' presente)

---

## Ordine di esecuzione

1. **Wiki** — fondazione, tutto il resto dipende da qui
2. **Sito** — riflette la wiki aggiornata
3. **Sbarco** — refactor worker + test
