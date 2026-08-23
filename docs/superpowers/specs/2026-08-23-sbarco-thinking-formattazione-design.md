# Sbarco — thinking su Pro e formattazione dell'output (design)

Data: 2026-08-23
Status: approved (approccio A confermato in chat)
Ambito: `worker/src/index.js`, `presentazione/src/js/sbarco.js`, `presentazione/src/styles/sbarco.css`, wiki di progetto.

## Problema

1. **Muro di testo**: `stripToolCallMarkup` collassava `\s+` in spazio singolo, quindi ogni
   risposta finale nata in un round agente (percorso diretto, frequente su Pro) perdeva tutti
   gli a-capo → output senza formattazione, anche nei PDF derivati (`save_doc` / fallback PDF).
2. **Markup tecnico visibile**: il filtro copriva solo DSML ASCII `<|…|>` e solo sulla sintesi
   in streaming; varianti (pipe fullwidth `｜`, blocchi `<think>`, markup nel percorso
   candidate/documenti) potevano raggiungere la chat.
3. Il thinking DeepSeek era disattivato ovunque (fix storico per l'incompatibilità V4
   `tool_choice` + thinking nel loop agente), ma l'utente lo vuole attivo su Pro.

## Soluzione (approccio A)

### Worker

- `stripToolCallMarkup` riscritta: **preserva i newline**; rimuove blocchi appaiati
  `<|tag>…</|tag>` (anche pipe fullwidth U+FF5C / U+2581), tag orfani, blocchi
  `<think>…</think>` (se non chiuso, tutto ciò che segue è scartato); collassa solo spazi/tab
  intra-riga; max una riga vuota consecutiva.
- `createMarkupLineFilter` (streaming) esteso alle stesse varianti + `<think>`.
- **Thinking su Pro**: i round con strumenti restano non-thinking (vincolo V4); su Pro il
  candidate del loop non è più accettato come risposta finale — si passa sempre alla sintesi
  in streaming con `thinking: {type:"enabled"}` + `reasoning_effort: "high"`
  (`tool_choice: "none"`, compatibile). Base invariato.
- **Fallback**: se il provider rifiuta il thinking (HTTP 400/422), un solo retry senza
  thinking; metriche `thinking: "on" | "off" | "fallback"`.
- `reasoning_content` in streaming → nuovo evento SSE `{reasoning: "…"}` (retrocompatibile);
  `firstTokenMs` parte al primo output visibile (ragionamento incluso).
- `save_doc`: titolo e contenuto sanitizzati (newline preservati) → PDF strutturati.
- Prompt: contratto anti muro di testo nel system prompt e nel messaggio di sintesi.
- Versione worker `2.3.2 → 2.4.0`. Budget round/`max_tokens` invariati (regola AGENTS.md §7).

### Client

- `handleStream`: al primo evento `reasoning` nasce il messaggio con blocco
  `<details class="sbarco-reasoning">` aperto ("Come ho ragionato", plain text escaped,
  scrollabile); al primo token della risposta si richiude; riapribile.
- Meta row: chip `thinking` quando `meta.thinking === "on"`.
- CSS dedicato con token esistenti; rispetto di `prefers-reduced-motion`.

## Costi accettati

- Risposta Pro = round agente + sintesi thinking (+1 chiamata, +5–15 s).
- Il ragionamento consuma token provider a parte (non tocca il tetto dei 2.600 visibili).

## Verifica

- Test worker 42/42 (newline preservati, think/fullwidth, save_doc, sintesi Pro con
  reasoning, fallback 400).
- Test presentazione 36/36 (blocco ragionamento, chip, CSS).
- `node --check`, `vite build`, `lint-wiki`, smoke post-deploy (`/api/health` versione,
  domanda rapida e profonda da UI).
