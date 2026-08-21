# Design: Nodi — «Telecamera del gesto» (capo chiaro, mobile-first)

Data: 2026-08-21  
Status: approved (brainstorming)  
Scope: `presentazione/nodi.html` + `src/js/nodi*.js` + `src/styles/main.css`; wiki nodi

## Problema

Il trainer 3D dei nodi è gradevole ma non insegna: l'animazione del capo non rende chiaro **dove passa il capo** (quale occhiello infilare, sopra o sotto a cosa) — che è l'unica cosa che conta per rifare il nodo con una cima in mano. In più l'uso reale è **quasi esclusivamente su cellulare**, e oggi stage e bottoni non stanno nella stessa schermata: per premere «Avanti» bisogna scrollare fino a perdere di vista l'animazione.

Feedback utente: «graficamente è carino ma non si capisce un cazzo di come si fanno i nodi» + «i tasti avanti sono terribili». Nessuna mano 3D richiesta: basta che il percorso del capo sia inequivocabile.

## Obiettivi

1. **Impara**: prima di ogni gesto, il **varco** da infilare (occhiello/anello/asola) si illumina e pulsa; la camera si mette di fronte; al momento dell'**incrocio** il gesto rallenta e compare l'etichetta («SOPRA la dormiente», «SOTTO la X», «DIETRO l'albero»).
2. **Mobile**: titolo passo compatto sopra lo stage, **barra controlli sovrapposta in basso allo stage** (◀ Rivedi ▶, ≥44px): animazione e controlli sempre nella stessa viewport, zero scroll per usare il trainer.
3. **Tap sullo stage = avanti** in Impara (il drag resta per orbitare; il codice distingue già tap da drag).
4. **Fai tu**: errore → shake + messaggio esplicito; passo corretto → callout sopra/sotto come rinforzo (1.5s).
5. Bottone **«Lento»** (0.6×) persistito in sessione.
6. Nessuna regressione: gate/cross opzionali nei dati, fallback 2D e WebGL-lost intatti, quiz e catalogo intatti.

## Non-obiettivi (v1)

- Mani/dita 3D stilizzate.
- Micro-passi attivi con scelta sopra/sotto a ogni incrocio (possibile evoluzione futura).
- Nuovi nodi, modifiche al quiz, catalogo 3D.

## Approccio scelto

Annotazioni didattiche **nei dati** (non nel motore): ogni step working può dichiarare `gate` e `cross`. Il motore 3D le usa se ci sono; senza, funziona come oggi. Alternativa scartata: micro-passi spezzati con scelta attiva (approccio B) — 3–4× il lavoro, UX più lenta, da valutare dopo.

## Modello dati (`nodi-data.js`)

```js
// dentro uno step, opzionali:
gate:  { pos: [x,y,z], r: 1.4 }                                  // varco: anello pulsante pre-gesto
cross: { at: 0.55, label: "SOPRA la dormiente", pos: [x,y,z] }   // incrocio: slow-mo + sprite
```

- `gate.pos` in coordinate 3D (unità dei `pts`/`hit3`); `r` raggio dell'anello.
- `cross.at` frazione [0..1] del gesto (in lunghezza curva) in cui avviene l'incrocio; `label` ≤ ~24 caretteri; `pos` dove sta lo sprite.
- Annotati tutti e 6 i nodi dove ha senso (i passi «dormiente/oggetto» non li hanno).
- **2D fallback**: varco come cerchio tratteggiato pulsante (coordinate SVG derivate con l'inversa di `V()` quando possibile, altrimenti omesso) + etichetta cross mostrata nella riga del testo del passo.

## Motore 3D (`nodi-3d.js`)

- **Gate ring**: `TorusGeometry` emissivo buoy, billboard verso camera, pulsazione scala/opacity; visibile da prima del gesto finché la frazione non supera ~0.3, poi fade-out. Un solo ring per step corrente.
- **Camera framing**: se lo step ha `gate`, all'avvio del gesto la camera/transizione (~500ms ease) si porta con target sul gate e offset davanti al piano del gesto; poi il follow esistente prende in carico il capo. Con `reduced` o utente già in orbita manuale: niente riposizionamento.
- **Slow-mo all'incrocio**: il progresso del gesto passa a ~0.35× nella finestra `cross.at ± 0.12` (durata di fatto più lunga solo lì); etichetta sprite riusando `makeLabel`, fade-in/out.
- **Lento globale**: fattore 0.6× su `dur`, toggle in UI, `sessionStorage` (`barca_nodi_slow`).
- Dispose corretti per nuovi geometry/material/texture (pattern esistente).

## Layout mobile (`main.css` + `nodi.js`)

- Struttura trainer: riga passo compatta (eyebrow «Passo 2/4» + titolo) e testo del passo (max 2 righe) **sopra lo stage**; `warn` come chip sotto lo stage.
- **Overlay controlli**: barra fissa dentro il fondo dello stage, bottoni grandi semi-trasparenti: ◀ · Rivedi · ▶ (Impara) / Ricomincia (Fai tu). Il toggle 2D/3D e «Lento» restano in alto a destra.
- Stage: `aspect-ratio` e max-height tarati perché riga passo + stage + overlay entrino in una viewport mobile tipica (~100svh) senza scroll.
- Desktop: stessa struttura (overlay funziona bene anche lì); niente media query doppie se non necessarie.

## Fai tu

- Tap su pallino futuro ≠ corrente → shake + messaggio coach («Serve il pallino acceso, quello dell'incrocio»; se pallino già fatto: «Quello è fatto, ora l'acceso»).
- Passo corretto → callout sopra/sotto (se lo step ha `cross`) per 1.5s come rinforzo.
- Chiusura nodo e flusso quiz invariati.

## Error handling

- `gate`/`cross` assenti o malformati → il motore li ignora (nessun crash, comportamento attuale).
- WebGL assente/lost → fallback 2D esistente (che ora mostra varco/etichetta quando disponibili).
- `reduced motion` → niente pulsazioni/riposizionamenti, animazioni ridotte come oggi.

## Test

- `test/nodi.test.mjs`: nuove validazioni deterministiche sui dati — `cross.at` ∈ [0,1], label non vuota, `gate.pos`/`cross.pos` dentro i bounds del nodo, tipi corretti.
- `test/nav-ui.test.mjs` (pattern regex sui sorgenti): classi CSS della barra overlay e del bottone Lento presenti in `main.css` + usate in `nodi.js`.
- Verifica manuale (io): mobile viewport in dev, tap-avanza, orbita con drag, fallback 2D.
- Comandi: `npm test` e `npx vite build` in `presentazione/`, `node scripts/lint-wiki.mjs` da root.

## Wiki

- Aggiornare `wiki/concetti/nodi-marinareschi.md` (nuova didattica del gesto + layout mobile).
- Entry in `wiki/log.md`: `## [2026-08-21] setup | Nodi: telecamera del gesto…`.
- `wiki/index.md` solo se cambia il catalogo pagine (non cambia).

## Deploy

Push su `main` con modifiche in `presentazione/**` → workflow Pages (test → build base `/Barca/` → publish). Smoke test su https://tizianocarpentieri.github.io/Barca/nodi.html dopo il deploy.
