# Design: Sessione Tiziano dopo passkey (meno QR/impronta)

Data: 2026-08-12  
Status: approved (brainstorming)  
Scope: auth Sbarco per identità `tiziano` su browser desktop (es. Mac) e mobile

## Problema

Oggi ogni chiamata autenticata di Tiziano (`/api/status`, `/api/chat`, e in pratica ogni iterazione di chat) richiede una **nuova asserzione WebAuthn** completa:

- Client: `getTizianoPasskeyHeaders()` in `presentazione/src/js/sbarco.js` esegue sempre `navigator.credentials.get(...)`.
- Worker: `verifyTizianoAssertion()` in `worker/src/index.js` consuma una challenge monouso e verifica la firma passkey a ogni request.

La passkey è **platform sul Galaxy**. Su Mac il browser usa il trasporto hybrid (QR + conferma biometrica sul telefono). Risultato: **QR + impronta a ogni messaggio** — corretto sul piano della prova d’identità, inutilizzabile sul piano UX.

Vincolo di prodotto: la passkey resta l’unica prova che “Tiziano” non sia solo la voce del menu; non si abbassa il barriere d’ingresso, si evita solo di ripeterla a ogni round di chat.

## Obiettivi

1. Dopo **una** conferma passkey riuscita, lo stesso browser può usare Sbarco come Tiziano per **30 minuti** senza nuovo QR/impronta.
2. **Sliding TTL**: ogni request autenticata con session valida rinnova la scadenza di +30 minuti dall’istante della request.
3. La sessione **sopravvive al refresh** e alla **chiusura/riapertura del tab** entro la finestra (stesso origin Pages).
4. **Multi-device**: Mac e telefono possono avere sessioni indipendenti contemporanee.
5. Scadenza o session invalida → fallback automatico alla passkey (stesso UX di oggi, una volta).

## Non-obiettivi (v1)

- Bottone UI “Blocca / esci da Tiziano” (facile add-on; non richiesto).
- Cookie httpOnly cross-site.
- Session per Antonio/Peppe (non usano passkey).
- Cambio del modello di enrollment Galaxy / enrollment code.
- SSO o passkey sync iCloud/Google come sostituto della session.

## Approccio scelto

**Session token opaco emesso dal Worker dopo verifica passkey**, conservato in KV con TTL, inviato dal client come header dedicato. Alternativa scartata: riusare l’asserzione WebAuthn in cache (inutile: challenge monouso). Cookie cross-origin scartato per complessità CORS tra GitHub Pages e `*.workers.dev`.

## Flusso

```text
Utente seleziona "Tiziano"
  → client legge localStorage barca_tiziano_session
  → se token presente e expiresAt > now:
        header X-Tiziano-Session: <token>
  → else:
        flusso passkey attuale (challenge → get → X-Tiziano-Passkey)
        Worker verifica passkey
        Worker crea session, restituisce sessionToken + expiresAt
        client salva in localStorage

/api/status e /api/chat (userId=tiziano)
  → verifyTizianoAuth(request):
        1) X-Tiziano-Session valido? → OK, sliding +30'
        2) else X-Tiziano-Passkey valido? → OK, emetti session (body o header risposta)
        3) else 401 { passkeyRequired: true, error }

401 su session (sconosciuta/scaduta)
  → client cancella localStorage e ritenta una volta con passkey
```

Selezionare Tiziano non deve più innescare **due** passkey consecutive (status all’ingresso + primo invio): al massimo una passkey, poi solo session.

## Componenti

### Worker (`worker/src/index.js`)

| Pezzo | Dettaglio |
|-------|-----------|
| Costanti | `SESSION_TTL_SEC = 1800` (30 min); prefisso KV `auth:tiziano:session:` |
| Token | 32 byte random, encoding base64url; in KV si salva solo **SHA-256(token)** come suffisso chiave |
| Valore KV | `{ exp: <unix sec>, createdAt: <iso> }` con `expirationTtl` KV ≥ TTL (+ piccolo margine, es. 2100 s) |
| `verifyTizianoSession(header, env)` | Lookup hash, `exp > now`, poi `put` con nuovo `exp = now+1800` (sliding) |
| `issueTizianoSession(env)` | Genera token, scrive KV, ritorna `{ sessionToken, expiresAt }` (expiresAt ISO o unix ms, una convenzione sola) |
| `verifyTizianoAuth(request, env)` | Unifica session-then-passkey; su successo ritorna `{ ok, session? }` da attaccare sempre come **response headers** |
| Endpoint | Nessun endpoint pubblico “login” in v1: emissione **inline** su status/chat. Header risposta fissi: `X-Tiziano-Session-Token`, `X-Tiziano-Session-Expires` (unix ms). Esposti anche in `Access-Control-Expose-Headers` |
| SSE `/api/chat` | Stessi header sulla Response SSE **prima** dello stream; mai nel body eventi |
| Bypass test | `TIZIANO_PASSKEY_TEST_BYPASS` continua a saltare passkey; in quel modo non serve session nei test automatici esistenti, oppure i test possono mandare session mock se aggiunti |

**Risposta session su chat SSE:** preferire **response headers** così non si tocca il protocollo eventi. Il client legge gli header dopo `fetch`, prima di consumare lo stream.

**Più sessioni:** ogni `issue` crea una nuova chiave KV; non si invalidano le altre. Nessun limite stretto in v1 (uso personale; eventuale cap dopo).

### Client (`presentazione/src/js/sbarco.js`)

| Pezzo | Dettaglio |
|-------|-----------|
| Storage | `localStorage` key `barca_tiziano_session` = JSON `{ token, expiresAt }` |
| `getTizianoAuthHeaders()` | Se session non scaduta (con piccolo skew, es. 30 s di anticipo) → `{ "X-Tiziano-Session": token }`; else passkey headers come oggi |
| Persistenza | Dopo status/chat, se la response espone token/expires → salva/aggiorna localStorage (copre sia primo unlock sia sliding lato client allineato al server) |
| Retry | Su 401 con session: clear storage, una retry con passkey; se fallisce di nuovo, errore utente |
| User switch | Lasciando Tiziano non è obbligatorio cancellare la session (riutilizzabile al ritorno entro TTL); opzionale clear per igiene — **v1: non cancellare** al cambio utente nel select |
| Messaggi errore | Se manca WebAuthn e non c’è session: messaggio attuale sul Galaxy resta valido su device senza passkey e senza session pregressa |

### Documentazione / wiki

- Aggiornare `worker/README.md` (sezione passkey): dopo la prima firma si ottiene una session 30′ sliding.
- Aggiornare `wiki/concetti/architettura-sbarco.md` protezioni runtime.
- Log wiki se si tocca il concetto in sessione di deploy.

### Test

- Unit worker: issue → verify session ok; exp passato → fail; sliding aggiorna exp; passkey path ancora emette session; header session assente + passkey assente → 401.
- Client: se non c’è harness browser completo, smoke manuale documentato: Mac → una passkey → N messaggi senza QR entro 30′; dopo clear storage → di nuovo passkey.
- Non indebolire i test passkey esistenti.

## Sicurezza

| Controllo | Comportamento |
|-----------|----------------|
| Prova d’identità | Solo passkey platform già enrollata (invariato) |
| Token | Opaco, alta entropia; KV memorizza hash, non il secret in chiaro come chiave leggibile da listing banale del raw token |
| TTL | Server-side obbligatorio; client `expiresAt` è solo ottimizzazione UX |
| Origin | CORS/`ALLOWED_ORIGIN` invariati; session inutile da origin non ammesse sulle API protette |
| XSS | Token in `localStorage` è rubabile da XSS sulla origin Pages — accettato per v1 (sito statico controllato); mitigazione futura = cookie httpOnly se si unifica dominio |
| Furto token | Finestra max ~30′ sliding finché l’attaccante non fa request; no refresh token a lunga vita |
| Revoca | Non in v1 UI; operativamente: cancellare chiavi `auth:tiziano:session:*` in KV o aspettare TTL |

## Casi limite

- **Orologio client storto:** decisione auth solo su `exp` server; client usa expiresAt solo per evitare round trip inutili.
- **Due tab Mac:** stessa localStorage → stessa session; sliding da entrambe ok.
- **Enrollment prima volta:** invariato (codice + create); subito dopo, assert + issue session.
- **Passkey header e session header insieme:** preferire session se valida; se session invalida e passkey presente, accettare passkey e re-issue.
- **Status 401 silenzioso oggi:** `refreshStatus` inghiotte errori; con session, status deve comunque poter salvare il token emesso e, in caso di fallimento passkey, non lasciare l’UI in stato “Tiziano” falso se si vuole rigorosi — **v1:** comportamento status resta best-effort, ma dopo unlock riuscito il counter ∞ si aggiorna senza riprompt.

## Criteri di accettazione

1. Su Mac, come Tiziano: **un** ciclo QR+impronta all’ingresso (o al primo status/chat), poi almeno un secondo messaggio e un refresh status **senza** nuovo QR entro la finestra.
2. Refresh pagina entro 30′: resta Tiziano operativo senza passkey.
3. Dopo scadenza server (o token cancellato in KV): la prossima azione richiede di nuovo passkey; poi di nuovo session.
4. Antonio/Peppe invariati.
5. Test worker passkey/session verdi; deploy worker + build presentazione.

## File toccati (previsti)

- `worker/src/index.js` — session issue/verify, integrazione status/chat
- `worker/test/core.test.mjs` — casi session
- `presentazione/src/js/sbarco.js` — storage + header + retry
- `worker/README.md`
- `wiki/concetti/architettura-sbarco.md`
- eventuale `wiki/log.md` / `wiki/sintesi/contesto-sbarco.md` se utile al bot

## Decisioni chiuse in brainstorming

| Domanda | Scelta |
|---------|--------|
| Durata | 30 minuti |
| Sliding vs fisso | Sliding (+30′ a ogni uso valido) |
| Persistenza | localStorage (refresh + riapertura tab) |
| Approccio | Session token server-side multi-device |
| Lock manuale UI | Non in v1 |
