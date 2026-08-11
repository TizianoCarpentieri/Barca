import assert from "node:assert/strict";
import test from "node:test";
import worker, { __test } from "../src/index.js";

test("riconosce la ricerca profonda esplicita o semantica", () => {
  assert.equal(__test.detectResearchMode("Come siamo messi col budget?"), false);
  assert.equal(__test.detectResearchMode("Cerca online i prezzi attuali"), true);
  assert.equal(__test.detectResearchMode("Domanda normale", "deep"), true);
});

test("riconosce una richiesta esplicita di PDF senza confonderla con una domanda tecnica", () => {
  assert.equal(__test.detectPdfRequest("Preparami un PDF della risposta precedente"), true);
  assert.equal(__test.detectPdfRequest("Me lo fai in pdf?"), true);
  assert.equal(__test.detectPdfRequest("Puoi darmi il pdf?"), true);
  assert.equal(__test.detectPdfRequest("Trasformalo in PDF"), true);
  assert.equal(__test.detectPdfRequest("PDF"), true);
  assert.equal(__test.detectPdfRequest("Perche il PDF non funziona?"), false);
});

test("crea un documento di fallback solo se save_doc non ha prodotto nulla", () => {
  const documents = [];
  assert.equal(__test.ensureRequestedPdfDocument(true, documents, "# Analisi\nContenuto completo"), true);
  assert.deepEqual(documents, [{ title: "Documento richiesto a Sbarco", content: "# Analisi\nContenuto completo" }]);
  assert.equal(__test.ensureRequestedPdfDocument(true, documents, "Altro"), false);
  assert.equal(documents.length, 1);
});

test("blocca URL locali e protocolli non web", () => {
  assert.equal(__test.isSafePublicUrl("https://example.com/info"), true);
  assert.equal(__test.isSafePublicUrl("http://127.0.0.1/admin"), false);
  assert.equal(__test.isSafePublicUrl("http://192.168.1.10"), false);
  assert.equal(__test.isSafePublicUrl("http://2130706433/admin"), false);
  assert.equal(__test.isSafePublicUrl("http://[::ffff:127.0.0.1]/admin"), false);
  assert.equal(__test.isSafePublicUrl("file:///etc/passwd"), false);
});

test("estrae e normalizza risultati DuckDuckGo", () => {
  const html = `
    <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fguida">Guida &amp; prezzi</a>
    <a class="result__snippet">Una fonte &quot;utile&quot;.</a>`;
  const results = __test.parseDuckDuckGoResults(html);
  assert.equal(results.length, 1);
  assert.equal(results[0].url, "https://example.com/guida");
  assert.equal(results[0].title, "Guida & prezzi");
});

test("scarta i vecchi summary privi di contenuto", () => {
  assert.equal(__test.sanitizeSummary("2 messaggi precedenti. ... poi altri 2 messaggi."), "");
  assert.match(__test.sanitizeSummary("Utente: budget massimo 2000 euro"), /budget massimo/);
});

test("compatta memoria e cronologia senza duplicare temi", () => {
  const memory = __test.compactMemoryFacts([
    { key: "budget-acquisto", fact: "Budget 4.500 euro" },
    { fact: "Peschiamo soprattutto a canna" },
    { key: "budget-acquisto", fact: "Budget 2.000 euro" },
  ]);
  assert.equal(memory.length, 2);
  assert.equal(memory.at(-1).fact, "Budget 2.000 euro");

  const history = Array.from({ length: 12 }, (_, index) => ({
    role: index % 2 ? "assistant" : "user",
    content: `messaggio-${index} ` + "x".repeat(2000),
  }));
  const compacted = __test.compactHistory(history);
  assert.ok(compacted.recent.length <= 8);
  assert.ok(compacted.evicted.length > 0);
  assert.ok(compacted.recent.reduce((sum, item) => sum + item.content.length, 0) <= 9000);
});

test("estrae memoria solo da preferenze esplicite", () => {
  assert.equal(__test.shouldExtractMemory("Preferiamo un motore 15 CV quattro tempi"), true);
  assert.equal(__test.shouldExtractMemory("Quanto costa oggi un motore 15 CV?"), false);
  assert.equal(__test.shouldExtractMemory("Riassumi il piano"), false);
});

test("mantiene margini conservativi per l'output visibile", () => {
  assert.deepEqual(__test.outputTokenBudgets, {
    agentStep: 1000,
    finalResponse: 2600,
  });
});

test("applica la quota illimitata a Tiziano e cinque utilizzi agli altri", () => {
  assert.deepEqual(__test.getDailyQuota("tiziano"), { unlimited: true, max: null });
  assert.deepEqual(__test.getDailyQuota("antonio"), { unlimited: false, max: 5 });
  assert.deepEqual(__test.getDailyQuota("peppe"), { unlimited: false, max: 5 });
  assert.equal(__test.getRemainingToday("tiziano", 999), null);
  assert.equal(__test.getRemainingToday("antonio", 2), 3);
  assert.equal(__test.getRomeDateKey(new Date("2026-08-11T22:30:00Z")), "2026-08-12");
  assert.equal(
    __test.getRateLimitKey("antonio", "2026-08-11"),
    `rate:${__test.rateLimitPolicyVersion}:antonio:2026-08-11`
  );
});

test("la policy v2 azzera i vecchi conteggi e rende esplicita la quota", async () => {
  const today = new Date().toISOString().slice(0, 10);
  const store = new Map([[`rate:antonio:${today}`, "4"]]);
  const kv = {
    async get(key) { return store.get(key) ?? null; },
    async put(key, value) { store.set(key, value); },
  };

  const antonioResponse = await worker.fetch(new Request("https://sbarco.test/api/status?userId=antonio"), {
    SBARCO_KV: kv,
    ALLOWED_ORIGIN: "*",
  }, {});
  assert.deepEqual(await antonioResponse.json(), {
    status: "ok",
    userId: "antonio",
    max: 5,
    used: 0,
    remaining: 5,
    unlimited: false,
    policyVersion: __test.rateLimitPolicyVersion,
  });

  const tizianoResponse = await worker.fetch(new Request("https://sbarco.test/api/status?userId=tiziano"), {
    SBARCO_KV: kv,
    ALLOWED_ORIGIN: "*",
    TIZIANO_PASSKEY_TEST_BYPASS: "true",
  }, {});
  assert.deepEqual(await tizianoResponse.json(), {
    status: "ok",
    userId: "tiziano",
    max: null,
    used: 0,
    remaining: null,
    unlimited: true,
    policyVersion: __test.rateLimitPolicyVersion,
  });
});

test("ricompone frame SSE CRLF e ultimo frame senza newline", () => {
  const first = __test.drainSSEFrames('data: {"token":"ciao"}\r\n\r\ndata: {"done":true');
  assert.deepEqual(first.data, ['{"token":"ciao"}']);
  const last = __test.drainSSEFrames(first.rest + "}", true);
  assert.deepEqual(last.data, ['{"done":true}']);
});

test("rifiuta origin estranee e ritira gli endpoint legacy", async () => {
  const env = { ALLOWED_ORIGIN: "https://tizianocarpentieri.github.io" };
  const forbidden = await worker.fetch(new Request("https://sbarco.test/api/status?userId=tiziano", {
    headers: { Origin: "https://example.com" },
  }), env, {});
  assert.equal(forbidden.status, 403);

  const retired = await worker.fetch(new Request("https://sbarco.test/api/search", {
    method: "POST",
    headers: { Origin: "https://tizianocarpentieri.github.io" },
  }), env, {});
  assert.equal(retired.status, 410);
});

test("il debug espone metriche ma non conversazioni o fatti", async () => {
  const store = new Map([
    ["memory:project", JSON.stringify([{ fact: "dato privato" }])],
    ["chat:tiziano", JSON.stringify([{ role: "user", content: "domanda privata" }])],
    ["chat:tiziano:summary", "Utente: riepilogo privato"],
    ["debug:events", JSON.stringify([{ ts: "2026-08-10T00:00:00Z", user: "tiziano", question: "domanda privata", firstTokenMs: 123 }])],
  ]);
  const kv = {
    async get(key) { return store.get(key) ?? null; },
    async put(key, value) { store.set(key, value); },
  };
  const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "tiziano", question: "/debug" }),
  }), { SBARCO_KV: kv, DEEPSEEK_API_KEY: "test", ALLOWED_ORIGIN: "*", TIZIANO_PASSKEY_TEST_BYPASS: "true" }, {});
  const report = await response.json();
  const serialized = JSON.stringify(report);
  assert.equal(response.status, 200);
  assert.equal(report.memory.count, 1);
  assert.equal(report.debugBuffer[0].firstTokenMs, 123);
  assert.doesNotMatch(serialized, /dato privato|domanda privata|riepilogo privato/);
});

test("lo stream rapido invia stato, testo e done senza seconda chiamata", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  let agentCalls = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("api.deepseek.com")) {
      agentCalls += 1;
      const body = JSON.parse(init.body);
      if (body.response_format) {
        return Response.json({ choices: [{ message: { content: '{"facts":[]}' } }] });
      }
      assert.match(body.messages[0].content, /UTENTE ATTIVO: Peppe/);
      return Response.json({
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Risposta rapida verificata. " + "Dettaglio utile. ".repeat(14) } }],
        usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
      });
    }
    throw new Error(`Fetch inatteso: ${url}`);
  };

  try {
    const kv = {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, value); },
    };
    const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "peppe", question: "Riassumi il piano", mode: "auto" }),
    }), {
      SBARCO_KV: kv,
      DEEPSEEK_API_KEY: "test-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      ALLOWED_ORIGIN: "*",
      TIZIANO_PASSKEY_TEST_BYPASS: "true",
    }, {
      waitUntil(promise) { background.push(promise); },
    });

    assert.match(response.headers.get("content-type"), /text\/event-stream/);
    const body = await response.text();
    assert.match(body, /Sbarco consulta la wiki delle Bestie/);
    assert.match(body, /Risposta rapida verificata/);
    assert.ok((body.match(/"token":/g) || []).length >= 3, "la risposta rapida viene cadenzata in piu' frame");
    assert.match(body, /"done":true/);
    assert.doesNotMatch(body, /"error"/);
    await Promise.all(background);
    assert.equal(agentCalls, 1, "nessuna chiamata memoria per una domanda priva di preferenze");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("una richiesta PDF forza save_doc ed emette il documento per il tasto download", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  let agentCalls = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("api.deepseek.com")) {
      agentCalls += 1;
      const body = JSON.parse(init.body);
      if (agentCalls === 1) {
        assert.equal(body.tool_choice.function.name, "save_doc");
        return Response.json({ choices: [{ finish_reason: "tool_calls", message: {
          role: "assistant", content: null, tool_calls: [{
            id: "save-1", type: "function", function: {
              name: "save_doc",
              arguments: JSON.stringify({ title: "Piano Bestie", content: "# Piano Bestie\n\nContenuto completo." }),
            },
          }],
        } }] });
      }
      assert.equal(body.tool_choice, "auto");
      assert.ok(body.messages.some(message => message.role === "tool" && /preparato/.test(message.content)));
      return Response.json({
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Documento pronto: usa il tasto Scarica PDF." } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
    }
    throw new Error(`Fetch inatteso: ${url}`);
  };

  try {
    const kv = {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, value); },
    };
    const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "tiziano", question: "Preparami un PDF del piano attuale", mode: "auto" }),
    }), {
      SBARCO_KV: kv,
      DEEPSEEK_API_KEY: "test-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      ALLOWED_ORIGIN: "*",
      TIZIANO_PASSKEY_TEST_BYPASS: "true",
    }, {
      waitUntil(promise) { background.push(promise); },
    });

    const body = await response.text();
    assert.match(body, /"documents":\[\{"title":"Piano Bestie"/);
    assert.match(body, /"toolSequence":\["save_doc"\]/);
    assert.match(body, /"documentsCreated":1/);
    assert.match(body, /"done":true/);
    await Promise.all(background);
    assert.equal(agentCalls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("la deep research usa fonti e termina sempre con testo", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  let agentCalls = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("duckduckgo.com")) {
      return new Response(`
        <a class="result__a" href="https://example.com/fonte">Fonte ufficiale</a>
        <a class="result__snippet">Dato aggiornato.</a>`,
      { status: 200, headers: { "content-type": "text/html" } });
    }
    if (url.startsWith("https://example.com/")) {
      return new Response("<main>Prezzo verificato: 100 euro nel 2026.</main>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }
    if (url.includes("api.deepseek.com")) {
      agentCalls += 1;
      const body = JSON.parse(init.body);
      if (body.response_format) {
        return Response.json({ choices: [{ message: { content: '{"facts":[]}' } }] });
      }
      if (agentCalls === 1) {
        assert.equal(body.tool_choice.function.name, "search_web");
        assert.equal(body.thinking.type, "disabled");
        assert.equal("reasoning_effort" in body, false);
        return Response.json({ choices: [{ finish_reason: "tool_calls", message: {
          role: "assistant", content: null, tool_calls: [
            { id: "search-1", type: "function", function: { name: "search_web", arguments: '{"query":"prezzo uno"}' } },
            { id: "search-2", type: "function", function: { name: "search_web", arguments: '{"query":"prezzo due"}' } },
          ],
        } }] });
      }
      if (agentCalls === 2) {
        assert.equal(body.tool_choice.function.name, "read_url");
        assert.equal(body.thinking.type, "disabled");
        assert.equal("reasoning_effort" in body, false);
        return Response.json({ choices: [{ finish_reason: "tool_calls", message: {
          role: "assistant", content: null, tool_calls: [
            { id: "read-1", type: "function", function: { name: "read_url", arguments: '{"url":"https://example.com/fonte-a"}' } },
            { id: "read-2", type: "function", function: { name: "read_url", arguments: '{"url":"https://example.com/fonte-b"}' } },
          ],
        } }] });
      }
      assert.equal(body.tool_choice, "auto");
      assert.equal(body.thinking.type, "disabled");
      assert.equal("reasoning_effort" in body, false);
      assert.ok(body.messages.filter(message => message.role === "assistant").every(message => message.content != null));
      return Response.json({
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Sintesi finale con due fonti verificate." } }],
        usage: { prompt_tokens: 20, completion_tokens: 8, total_tokens: 28 },
      });
    }
    throw new Error(`Fetch inatteso: ${url}`);
  };

  try {
    const kv = {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, value); },
    };
    const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "tiziano", question: "Ricerca prezzi attuali", mode: "deep" }),
    }), {
      SBARCO_KV: kv,
      DEEPSEEK_API_KEY: "test-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      ALLOWED_ORIGIN: "*",
      TIZIANO_PASSKEY_TEST_BYPASS: "true",
    }, {
      waitUntil(promise) { background.push(promise); },
    });

    const body = await response.text();
    assert.match(body, /Sbarco getta le reti nel web/);
    assert.match(body, /Sbarco legge una fonte senza fidarsi sulla parola/);
    assert.match(body, /Sintesi finale con due fonti verificate/);
    assert.match(body, /"searches":2/);
    assert.match(body, /"sourcesRead":2/);
    assert.match(body, /"done":true/);
    assert.doesNotMatch(body, /"error"/);
    await Promise.all(background);
    assert.equal(agentCalls, 3, "tre round agente senza estrazione memoria superflua");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
