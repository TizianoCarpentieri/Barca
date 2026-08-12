# Sbarco Session Token Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dopo una sola passkey (QR+impronta), Tiziano usa Sbarco per 30 minuti sliding senza ripetere WebAuthn a ogni messaggio.

**Architecture:** Il Worker verifica prima `X-Tiziano-Session` (token opaco in KV, hash SHA-256, TTL 30′ sliding). Se assente/invalido, verifica la passkey come oggi e **emette** una nuova session negli header di risposta. Il client salva token+expires in `localStorage` e li riusa finché validi, con un retry passkey su 401.

**Tech Stack:** Cloudflare Worker + KV, WebAuthn esistente, vanilla JS in `presentazione/src/js/sbarco.js`, `node:test` nel worker.

**Spec:** `docs/superpowers/specs/2026-08-12-sbarco-session-token-design.md`

## Global Constraints

- Session TTL: **1800 secondi** (30 min), sliding a ogni verify ok
- KV key prefix: `auth:tiziano:session:` + sha256(token) base64url
- Request header session: `X-Tiziano-Session`
- Request header passkey (invariato): `X-Tiziano-Passkey`
- Response headers: `X-Tiziano-Session-Token`, `X-Tiziano-Session-Expires` (unix **ms**)
- CORS: Allow-Headers include entrambi gli header request; Expose-Headers include i due response
- `expiresAt` client = stesso valore unix ms del server
- Multi-session: ogni issue crea una chiave; non invalidare le altre
- `TIZIANO_PASSKEY_TEST_BYPASS=true` salta passkey **e** non richiede session (test esistenti restano verdi)
- No bottone Blocca in v1
- Italiano in wiki/README; commit atomici per task
- Non toccare quote Antonio/Peppe né enrollment code

## File Structure

```
worker/src/index.js                 # MODIFY: session issue/verify + auth unificata + CORS + status/chat
worker/test/core.test.mjs           # MODIFY: test session unit + /api/status con session
presentazione/src/js/sbarco.js      # MODIFY: localStorage session, auth headers, retry, capture response headers
worker/README.md                    # MODIFY: documenta session 30′
wiki/concetti/architettura-sbarco.md # MODIFY: protezioni runtime
wiki/log.md                         # MODIFY: append
wiki/index.md                       # MODIFY solo se serve (di solito no)
```

Nessun file nuovo obbligatorio. Helper session restano in `index.js` accanto alla passkey (stesso dominio auth).

---

### Task 1: Helper session Worker + test unitari

**Files:**
- Modify: `worker/src/index.js` (blocco passkey ~54–185 e export `__test` ~1668)
- Modify: `worker/test/core.test.mjs`

**Interfaces:**
- Produces:
  - `SESSION_TTL_SEC = 1800`
  - `SESSION_KV_TTL_SEC = 2100`
  - `SESSION_KEY_PREFIX = "auth:tiziano:session:"`
  - `async function sha256Base64Url(text: string): Promise<string>`
  - `async function issueTizianoSession(env): Promise<{ sessionToken: string, expiresAt: number }>`  
    (`expiresAt` = unix ms)
  - `async function verifyTizianoSession(token: string, env): Promise<{ sessionToken: string, expiresAt: number }>`  
    throws se assente/scaduta
  - `function sessionResponseHeaders(session: { sessionToken, expiresAt } | null): Record<string,string>`
  - `async function verifyTizianoAuth(request, env): Promise<{ session: { sessionToken, expiresAt } | null }>`  
    bypass → `{ session: null }`; session ok → `{ session }` rinnovata; passkey ok → issue e `{ session }`; else throw
- Consumes: `bytesToBase64Url`, `sha256`, `verifyTizianoAssertion`, `SBARCO_KV`

- [ ] **Step 1: Scrivi i test che falliscono**

Aggiungi in fondo a `worker/test/core.test.mjs` (prima della fine file):

```js
function mockKv(initial = []) {
  const store = new Map(initial);
  return {
    store,
    async get(key) { return store.get(key) ?? null; },
    async put(key, value, opts = {}) {
      store.set(key, value);
      store.set(`${key}__meta`, JSON.stringify(opts || {}));
    },
    async delete(key) { store.delete(key); },
  };
}

test("issue + verify session Tiziano con sliding TTL", async () => {
  const kv = mockKv();
  const env = { SBARCO_KV: kv };
  const issued = await __test.issueTizianoSession(env);
  assert.equal(typeof issued.sessionToken, "string");
  assert.ok(issued.sessionToken.length >= 32);
  assert.ok(issued.expiresAt > Date.now());

  const verified = await __test.verifyTizianoSession(issued.sessionToken, env);
  assert.equal(verified.sessionToken, issued.sessionToken);
  assert.ok(verified.expiresAt >= issued.expiresAt);

  const hash = await __test.sha256Base64Url(issued.sessionToken);
  const raw = JSON.parse(await kv.get(`auth:tiziano:session:${hash}`));
  assert.ok(raw.exp * 1000 <= verified.expiresAt + 1000);
  assert.ok(raw.exp * 1000 >= Date.now() / 1000 - 5);
});

test("session scaduta o assente viene rifiutata", async () => {
  const kv = mockKv();
  const env = { SBARCO_KV: kv };
  await assert.rejects(() => __test.verifyTizianoSession("token-inesistente", env), /sessione/i);

  const issued = await __test.issueTizianoSession(env);
  const hash = await __test.sha256Base64Url(issued.sessionToken);
  const key = `auth:tiziano:session:${hash}`;
  await kv.put(key, JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 10, createdAt: new Date().toISOString() }));
  await assert.rejects(() => __test.verifyTizianoSession(issued.sessionToken, env), /scaduta|sessione/i);
});

test("verifyTizianoAuth: bypass, session header, mancanza credenziali", async () => {
  const kv = mockKv();
  const bypass = await __test.verifyTizianoAuth(
    new Request("https://sbarco.test/api/status"),
    { SBARCO_KV: kv, TIZIANO_PASSKEY_TEST_BYPASS: "true" }
  );
  assert.equal(bypass.session, null);

  const issued = await __test.issueTizianoSession({ SBARCO_KV: kv });
  const ok = await __test.verifyTizianoAuth(
    new Request("https://sbarco.test/api/status", {
      headers: { "X-Tiziano-Session": issued.sessionToken },
    }),
    { SBARCO_KV: kv }
  );
  assert.ok(ok.session?.sessionToken);
  assert.equal(ok.session.sessionToken, issued.sessionToken);

  await assert.rejects(
    () => __test.verifyTizianoAuth(new Request("https://sbarco.test/api/status"), { SBARCO_KV: kv }),
    /Galaxy|passkey|Conferma/i
  );
});

test("sessionResponseHeaders espone token ed expires", () => {
  const headers = __test.sessionResponseHeaders({ sessionToken: "abc", expiresAt: 1700000000000 });
  assert.equal(headers["X-Tiziano-Session-Token"], "abc");
  assert.equal(headers["X-Tiziano-Session-Expires"], "1700000000000");
  assert.deepEqual(__test.sessionResponseHeaders(null), {});
});
```

- [ ] **Step 2: Esegui i test — devono fallire**

Run:

```bash
cd worker
npm test
```

Expected: FAIL — `__test.issueTizianoSession` (o simili) undefined.

- [ ] **Step 3: Implementa gli helper in `worker/src/index.js`**

Subito dopo le costanti passkey esistenti (`PASSKEY_CHALLENGE_TTL`), aggiungi:

```js
const SESSION_TTL_SEC = 1800;
const SESSION_KV_TTL_SEC = 2100;
const SESSION_KEY_PREFIX = "auth:tiziano:session:";

async function sha256Base64Url(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  return bytesToBase64Url(await sha256(bytes));
}

function sessionResponseHeaders(session) {
  if (!session?.sessionToken || !session?.expiresAt) return {};
  return {
    "X-Tiziano-Session-Token": session.sessionToken,
    "X-Tiziano-Session-Expires": String(session.expiresAt),
  };
}

async function issueTizianoSession(env) {
  if (!env.SBARCO_KV) throw new Error("Archivio sessioni non disponibile");
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const sessionToken = bytesToBase64Url(raw);
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const expiresAt = exp * 1000;
  const hash = await sha256Base64Url(sessionToken);
  await env.SBARCO_KV.put(
    `${SESSION_KEY_PREFIX}${hash}`,
    JSON.stringify({ exp, createdAt: new Date().toISOString() }),
    { expirationTtl: SESSION_KV_TTL_SEC }
  );
  return { sessionToken, expiresAt };
}

async function verifyTizianoSession(token, env) {
  if (!token || !env.SBARCO_KV) throw new Error("Sessione Tiziano assente");
  const hash = await sha256Base64Url(token);
  const key = `${SESSION_KEY_PREFIX}${hash}`;
  const raw = await env.SBARCO_KV.get(key);
  if (!raw) throw new Error("Sessione Tiziano non valida o scaduta");
  const data = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  if (!data.exp || data.exp <= now) {
    await env.SBARCO_KV.delete(key);
    throw new Error("Sessione Tiziano scaduta");
  }
  const exp = now + SESSION_TTL_SEC;
  await env.SBARCO_KV.put(
    key,
    JSON.stringify({ ...data, exp }),
    { expirationTtl: SESSION_KV_TTL_SEC }
  );
  return { sessionToken: token, expiresAt: exp * 1000 };
}

async function verifyTizianoAuth(request, env) {
  if (env.TIZIANO_PASSKEY_TEST_BYPASS === "true") return { session: null };

  const sessionHeader = request.headers.get("X-Tiziano-Session");
  if (sessionHeader) {
    try {
      const session = await verifyTizianoSession(sessionHeader, env);
      return { session };
    } catch {
      // fallback passkey sotto
    }
  }

  await verifyTizianoAssertion(request, env);
  const session = await issueTizianoSession(env);
  return { session };
}
```

Esporta in `__test`:

```js
export const __test = {
  // ...esistenti
  sha256Base64Url,
  issueTizianoSession,
  verifyTizianoSession,
  verifyTizianoAuth,
  sessionResponseHeaders,
  sessionTtlSec: SESSION_TTL_SEC,
};
```

Nota: `verifyTizianoAssertion` resta invariata nella logica crypto. Non chiamarla se bypass è già gestito in `verifyTizianoAuth` (oggi il bypass è dentro `verifyTizianoAssertion` — lascialo lì pure, ridondanza ok).

- [ ] **Step 4: Esegui i test — devono passare**

```bash
cd worker
npm test
```

Expected: PASS (tutti i test, inclusi i nuovi).

- [ ] **Step 5: Commit**

```bash
git add worker/src/index.js worker/test/core.test.mjs
git commit -m "feat(worker): session token helper per Tiziano dopo passkey"
```

---

### Task 2: Integra auth unificata in status/chat + CORS

**Files:**
- Modify: `worker/src/index.js` (CORS ~1426–1440, status ~1504–1523, chat ~1546–1548 e header SSE ~1610)
- Modify: `worker/test/core.test.mjs`

**Interfaces:**
- Consumes: `verifyTizianoAuth`, `sessionResponseHeaders`
- Produces: `/api/status` e `/api/chat` accettano `X-Tiziano-Session`; rispondono con header session quando emessa/rinnovata

- [ ] **Step 1: Test di integrazione status con session**

Aggiungi:

```js
test("GET /api/status accetta X-Tiziano-Session e rinnova header", async () => {
  const kv = mockKv();
  const env = { SBARCO_KV: kv, ALLOWED_ORIGIN: "https://tizianocarpentieri.github.io" };
  const issued = await __test.issueTizianoSession(env);
  const response = await worker.fetch(new Request("https://sbarco.test/api/status?userId=tiziano", {
    headers: {
      Origin: "https://tizianocarpentieri.github.io",
      "X-Tiziano-Session": issued.sessionToken,
    },
  }), env, {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.unlimited, true);
  assert.equal(response.headers.get("X-Tiziano-Session-Token"), issued.sessionToken);
  assert.ok(Number(response.headers.get("X-Tiziano-Session-Expires")) > Date.now());
});

test("GET /api/status senza auth torna 401 passkeyRequired", async () => {
  const kv = mockKv();
  const response = await worker.fetch(new Request("https://sbarco.test/api/status?userId=tiziano", {
    headers: { Origin: "https://tizianocarpentieri.github.io" },
  }), { SBARCO_KV: kv, ALLOWED_ORIGIN: "https://tizianocarpentieri.github.io" }, {});
  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.passkeyRequired, true);
});

test("OPTIONS espone Allow-Headers session e Expose-Headers token", async () => {
  const response = await worker.fetch(new Request("https://sbarco.test/api/status", {
    method: "OPTIONS",
    headers: { Origin: "https://tizianocarpentieri.github.io" },
  }), { ALLOWED_ORIGIN: "https://tizianocarpentieri.github.io" }, {});
  assert.equal(response.status, 204);
  const allow = response.headers.get("Access-Control-Allow-Headers") || "";
  assert.match(allow, /X-Tiziano-Session/i);
  assert.match(allow, /X-Tiziano-Passkey/i);
  const expose = response.headers.get("Access-Control-Expose-Headers") || "";
  assert.match(expose, /X-Tiziano-Session-Token/i);
  assert.match(expose, /X-Tiziano-Session-Expires/i);
});
```

- [ ] **Step 2: Run — fail finché CORS/status non integrati**

```bash
cd worker
npm test
```

- [ ] **Step 3: Aggiorna CORS**

Sostituisci i blocchi header CORS (sia OPTIONS sia `corsHeaders`) con:

```js
const corsHeaders = {
  "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Tiziano-Passkey, X-Tiziano-Session",
  "Access-Control-Expose-Headers": "X-Tiziano-Session-Token, X-Tiziano-Session-Expires",
};
```

Usa lo **stesso** set sia nella risposta OPTIONS sia in `corsHeaders` runtime (evita drift). Se OPTIONS oggi duplica i campi inline, unifica.

- [ ] **Step 4: Sostituisci verify su status e chat**

**Status** — al posto di `verifyTizianoAssertion`:

```js
if (userId === "tiziano") {
  try {
    const auth = await verifyTizianoAuth(request, env);
    const rate = await checkRateLimit(env.SBARCO_KV, userId);
    const quota = getDailyQuota(userId);
    return new Response(JSON.stringify({
      status: "ok",
      userId,
      max: quota.max,
      used: rate.count,
      remaining: getRemainingToday(userId, rate.count),
      unlimited: quota.unlimited,
      policyVersion: RATE_LIMIT_POLICY_VERSION,
    }), { headers: { ...corsHeaders, ...sessionResponseHeaders(auth.session) } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, passkeyRequired: true }), {
      status: 401,
      headers: corsHeaders,
    });
  }
}
// ramo non-tiziano invariato sotto
```

Attenzione: oggi status ha un solo return dopo l’if tiziano. Refactor in modo che **solo tiziano** passi da `verifyTizianoAuth`; antonio/peppe restano senza auth extra.

**Chat** — al posto del try/catch su `verifyTizianoAssertion`:

```js
let tizianoSession = null;
if (userId === "tiziano") {
  try {
    const auth = await verifyTizianoAuth(request, env);
    tizianoSession = auth.session;
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, passkeyRequired: true }), {
      status: 401,
      headers: corsHeaders,
    });
  }
}
```

Su **ogni** Response di successo della chat per tiziano (SSE headers, JSON `/debug`, ecc.) merge:

```js
headers: { ...corsHeaders, ...sessionResponseHeaders(tizianoSession), /* content-type ecc. */ }
```

Per SSE, gli header session devono essere sulla Response iniziale dello stream (stesso punto dove già si spargono `corsHeaders` + `Content-Type: text/event-stream`).

Se una chat rinnova la session via header session in ingresso, `verifyTizianoAuth` restituisce già session rinnovata: attaccala uguale così il client aggiorna `expiresAt`.

- [ ] **Step 5: Run test**

```bash
cd worker
npm test
```

Expected: PASS.

- [ ] **Step 6: Syntax check + commit**

```bash
cd worker
npm run check
git add worker/src/index.js worker/test/core.test.mjs
git commit -m "feat(worker): status/chat accettano session Tiziano e la espongono in header"
```

---

### Task 3: Client — localStorage session, header, retry

**Files:**
- Modify: `presentazione/src/js/sbarco.js`

**Interfaces:**
- Consumes: response headers `X-Tiziano-Session-Token`, `X-Tiziano-Session-Expires`
- Produces: request header `X-Tiziano-Session` quando token locale valido; altrimenti passkey come oggi
- Storage key: `barca_tiziano_session` = `{"token":"...","expiresAt":1700000000000}`
- Skew client: considera scaduta se `expiresAt <= Date.now() + 30_000`

- [ ] **Step 1: Costanti e helper storage** (dopo `LS_KEY`)

```js
const LS_TIZIANO_SESSION = "barca_tiziano_session";
const SESSION_SKEW_MS = 30_000;

function readTizianoSession() {
  try {
    const raw = localStorage.getItem(LS_TIZIANO_SESSION);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.token || !data?.expiresAt) return null;
    if (Number(data.expiresAt) <= Date.now() + SESSION_SKEW_MS) return null;
    return { token: String(data.token), expiresAt: Number(data.expiresAt) };
  } catch {
    return null;
  }
}

function writeTizianoSession(token, expiresAt) {
  if (!token || !expiresAt) return;
  localStorage.setItem(LS_TIZIANO_SESSION, JSON.stringify({
    token: String(token),
    expiresAt: Number(expiresAt),
  }));
}

function clearTizianoSession() {
  localStorage.removeItem(LS_TIZIANO_SESSION);
}

function captureTizianoSessionFromResponse(resp) {
  const token = resp.headers.get("X-Tiziano-Session-Token");
  const expires = resp.headers.get("X-Tiziano-Session-Expires");
  if (token && expires) writeTizianoSession(token, Number(expires));
}
```

- [ ] **Step 2: Sostituisci `getTizianoPasskeyHeaders` usage con auth unificata**

Rinomina concettualmente: tieni `getTizianoPasskeyHeaders` per il solo WebAuthn. Aggiungi:

```js
async function getTizianoAuthHeaders() {
  const existing = readTizianoSession();
  if (existing) return { "X-Tiziano-Session": existing.token };
  return getTizianoPasskeyHeaders();
}

async function fetchTiziano(url, options = {}) {
  const build = async (forcePasskey) => {
    const auth = forcePasskey
      ? await getTizianoPasskeyHeaders()
      : await getTizianoAuthHeaders();
    return fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), ...auth },
    });
  };

  let usedSession = Boolean(readTizianoSession()) && true;
  // forcePasskey=false prima
  let resp = await build(false);
  if (resp.status === 401 && readTizianoSession()) {
    clearTizianoSession();
    resp = await build(true);
  } else if (resp.status === 401) {
    // già passkey fallita o assente: lascia gestire al caller
  }
  captureTizianoSessionFromResponse(resp);
  return resp;
}
```

Semplifica `fetchTiziano` senza variabile morta:

```js
async function fetchTiziano(url, options = {}) {
  const withAuth = async (forcePasskey) => {
    const auth = forcePasskey || !readTizianoSession()
      ? await getTizianoPasskeyHeaders()
      : { "X-Tiziano-Session": readTizianoSession().token };
    return fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), ...auth },
    });
  };

  let resp = await withAuth(false);
  if (resp.status === 401) {
    const hadSession = Boolean(localStorage.getItem(LS_TIZIANO_SESSION));
    clearTizianoSession();
    if (hadSession) resp = await withAuth(true);
  }
  captureTizianoSessionFromResponse(resp);
  return resp;
}
```

- [ ] **Step 3: Usa `fetchTiziano` in `refreshStatus` e `send`**

**refreshStatus:**

```js
async function refreshStatus() {
  if (!currentUser) return;
  const requestedUser = currentUser;
  try {
    const resp = currentUser === "tiziano"
      ? await fetchTiziano(`${SBARCO_WORKER}/api/status?userId=${encodeURIComponent(requestedUser)}`)
      : await fetch(`${SBARCO_WORKER}/api/status?userId=${encodeURIComponent(requestedUser)}`);
    if (!resp.ok) return;
    const data = await resp.json();
    if (currentUser === requestedUser && (data.unlimited || data.remaining !== undefined)) {
      updateCounter(data.remaining, data.unlimited);
    }
  } catch {}
}
```

**send** — sostituisci blocco headers:

```js
const resp = currentUser === "tiziano"
  ? await fetchTiziano(`${SBARCO_WORKER}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser, question: text, mode: deepMode ? "deep" : "auto" }),
      signal: activeController.signal,
    })
  : await fetch(`${SBARCO_WORKER}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser, question: text, mode: deepMode ? "deep" : "auto" }),
      signal: activeController.signal,
    });
```

Importante: `captureTizianoSessionFromResponse` gira **prima** di leggere il body/stream — già garantito da `fetchTiziano` subito dopo il fetch.

- [ ] **Step 4: Build presentazione**

```bash
cd presentazione
npm test
npm run build
```

Expected: test esistenti PASS; build ok.

- [ ] **Step 5: Commit**

```bash
git add presentazione/src/js/sbarco.js
git commit -m "feat(sbarco): riusa session Tiziano 30m senza riprompt passkey"
```

---

### Task 4: Documentazione wiki + README

**Files:**
- Modify: `worker/README.md` (sezione 2b passkey)
- Modify: `wiki/concetti/architettura-sbarco.md` (Protezioni runtime)
- Modify: `wiki/log.md` (append)

- [ ] **Step 1: README**

Dopo il paragrafo sulla passkey, aggiungi:

```markdown
Dopo la **prima** verifica passkey riuscita, il Worker emette una **session**
opaca (`X-Tiziano-Session`) valida **30 minuti** con rinnovo a ogni uso
(sliding). Il browser la conserva in `localStorage` (`barca_tiziano_session`).
Finché la session è valida non serve un nuovo QR/impronta. Scaduta o revocata
in KV (`auth:tiziano:session:*`), si ripete una sola passkey.
```

- [ ] **Step 2: Architettura wiki**

In `## Protezioni runtime`, aggiorna il bullet Tiziano:

```markdown
- L'identità `tiziano` richiede una **passkey platform** per lo sblocco iniziale
  (WebAuthn + biometria/PIN del Galaxy). Dopo la verifica il Worker emette una
  **session token** (header `X-Tiziano-Session`, TTL 30 minuti sliding, hash in
  KV). Chat e status accettano la session al posto di una nuova asserzione
  passkey; a scadenza si ripete una sola conferma biometrica. Il selettore del
  browser non costituisce autenticazione.
```

- [ ] **Step 3: Log**

Append in `wiki/log.md`:

```markdown
## [2026-08-12] sbarco | session token Tiziano 30m

Dopo una passkey, Sbarco emette session sliding 30′ (header + localStorage)
per evitare QR/impronta a ogni messaggio su Mac. Spec:
`docs/superpowers/specs/2026-08-12-sbarco-session-token-design.md`.
```

- [ ] **Step 4: Lint wiki (se disponibile)**

```bash
node scripts/lint-wiki.mjs
```

Expected: exit 0 o solo warning preesistenti non introdotti da queste edit.

- [ ] **Step 5: Commit**

```bash
git add worker/README.md wiki/concetti/architettura-sbarco.md wiki/log.md
git commit -m "docs: documenta session Tiziano 30m su Sbarco"
```

---

### Task 5: Verifica end-to-end e deploy

**Files:** nessuno di codice se tutto già committato; deploy worker + pages secondo workflow repo.

- [ ] **Step 1: Suite completa locale**

```bash
cd worker
npm test
npm run check
cd ../presentazione
npm test
npm run build
node ../scripts/lint-wiki.mjs
```

Expected: tutto verde.

- [ ] **Step 2: Deploy worker**

```bash
cd worker
npm run deploy
```

- [ ] **Step 3: Deploy/presentazione** (come da prassi repo: push main → Pages, o script esistente)

Assicurati che il bundle con il nuovo `sbarco.js` sia online sulla stessa `ALLOWED_ORIGIN`.

- [ ] **Step 4: Smoke manuale Mac (accettazione spec)**

Checklist:

1. Apri il sito su Mac, seleziona **Tiziano** → **un** QR + impronta sul Galaxy.
2. Invia messaggio 1 → ok, **senza** secondo QR.
3. Invia messaggio 2 → ok, **senza** QR.
4. Refresh pagina → seleziona di nuovo Tiziano se serve → status/chat **senza** QR.
5. In DevTools Application → Local Storage: chiave `barca_tiziano_session` presente.
6. Cancella `barca_tiziano_session` → prossima azione richiede di nuovo passkey.
7. Antonio/Peppe: invariati (nessun QR).

- [ ] **Step 5: Commit vuoto non serve**; se smoke trova bug, fix + commit mirato.

Opzionale dopo deploy:

```bash
graphify update .
```

solo se il repo lo richiede post-modifica sostanziale (AGENTS.md).

---

## Self-Review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| 30 min sliding session | Task 1 (`SESSION_TTL_SEC`, verify put) |
| Sopravvive refresh (localStorage) | Task 3 |
| Multi-device sessions | Task 1 issue senza delete altre |
| Fallback passkey su 401 | Task 3 `fetchTiziano` |
| Header response token/expires + CORS expose | Task 2 |
| status + chat | Task 2 |
| SSE headers not body | Task 2 |
| Bypass test invariato | Task 1 `verifyTizianoAuth` |
| Docs wiki/README | Task 4 |
| Acceptance smoke Mac | Task 5 |
| No lock button / no cookie | rispettato (non in plan) |

Nessun placeholder TBD. Nomi header/storage allineati tra task.
