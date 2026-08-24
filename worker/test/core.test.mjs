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
  assert.equal(__test.detectPdfRequest("Crearmi il pdf dei moli"), true);
  assert.equal(__test.detectPdfRequest("PDF"), true);
  assert.equal(__test.detectPdfRequest("Perche il PDF non funziona?"), false);
});

test("il PDF richiesto resta un compito anche su Riprendi o si", () => {
  const history = [
    { role: "user", content: "Crearmi il pdf dei moli del Lazio" },
    { role: "assistant", content: "Vuoi che prepari il PDF adesso?" },
  ];
  assert.equal(__test.detectPdfIntent("Riprendi", history), true);
  assert.equal(__test.detectPdfIntent("si", history), true);
  assert.equal(__test.detectPdfIntent("ok fallo", history), true);
  assert.equal(__test.detectPdfIntent("Dimmi cosa hai trovato", history), false);
  assert.equal(__test.detectPdfIntent("Prepara il pdf", []), true);
  assert.equal(__test.detectPdfIntent("Riprendi", []), false);
});

test("un elenco di moli o porti deve leggere la wiki, non chiudere a vuoto", () => {
  assert.equal(__test.detectNeedsWikiPage("lista di tutti i moli da Fiumicino a Sabaudia"), true);
  assert.equal(__test.detectNeedsWikiPage("dove tengo la barca a vela, porti e ormeggi"), true);
  assert.equal(__test.detectNeedsWikiPage("Riassumi il piano"), false);
  assert.equal(__test.detectNeedsWikiPage("Ciao"), false);
});

test("riconosce quando l'utente vuole chiudere con il contesto, senza altre ricerche", () => {
  assert.equal(__test.detectSkipResearch("Credo che hai nel contesto sufficienti info per creare il pdf"), true);
  assert.equal(__test.detectSkipResearch("Usa la wiki, non cercare sul web"), true);
  assert.equal(__test.detectSkipResearch("Basta la wiki"), true);
  assert.equal(__test.detectSkipResearch("Cerca online i prezzi attuali"), false);
  assert.equal(__test.detectSkipResearch("Prepara il pdf"), false);
});

test("l'harness non forza la ricerca se l'utente ha detto di usare il contesto", () => {
  assert.equal(__test.chooseRequiredTool({
    researchMode: true,
    skipResearch: true,
    searches: 0,
    webReads: 0,
    minSearches: 2,
    minWebReads: 2,
    pdfRequested: true,
    hasDocument: false,
    modelTriedToFinish: false,
    isLastRound: false,
  }), null);
});

test("se il modello chiede conferma invece del PDF, il giro dopo forza save_doc", () => {
  assert.equal(__test.chooseRequiredTool({
    researchMode: false,
    skipResearch: false,
    searches: 0,
    webReads: 0,
    minSearches: 2,
    minWebReads: 2,
    pdfRequested: true,
    hasDocument: false,
    modelTriedToFinish: true,
    isLastRound: false,
  }), "save_doc");
});

test("il primo round PDF non forza save_doc: prima puo' leggere la wiki", () => {
  assert.equal(__test.chooseRequiredTool({
    researchMode: false,
    skipResearch: false,
    searches: 0,
    webReads: 0,
    minSearches: 2,
    minWebReads: 2,
    pdfRequested: true,
    hasDocument: false,
    modelTriedToFinish: false,
    isLastRound: false,
  }), null);
  assert.equal(__test.chooseRequiredTool({
    researchMode: false,
    pdfRequested: true,
    hasDocument: false,
    isLastRound: true,
  }), "save_doc");
});

test("in ricerca profonda senza skip, i minimi restano search_web poi read_url", () => {
  assert.equal(__test.chooseRequiredTool({
    researchMode: true,
    skipResearch: false,
    searches: 0,
    webReads: 0,
    minSearches: 2,
    minWebReads: 2,
  }), "search_web");
  assert.equal(__test.chooseRequiredTool({
    researchMode: true,
    skipResearch: false,
    searches: 2,
    webReads: 0,
    minSearches: 2,
    minWebReads: 2,
  }), "read_url");
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
  assert.equal(__test.shouldExtractMemory("Voglio sapere quanto costa un gommone"), false);
  assert.equal(__test.shouldExtractMemory("Vogliamo restare sotto i 2000 euro"), true);
});

test("mantiene margini conservativi per l'output visibile", () => {
  assert.equal(__test.outputTokenBudgets.agentStep, 1000);
  assert.equal(__test.outputTokenBudgets.finalResponse, 2600);
  assert.ok(__test.outputTokenBudgets.saveDocStep >= 4000, "save_doc deve stare in un passo dedicato, non nei 1000 token del loop");
  assert.ok(__test.outputTokenBudgets.finalThinking >= 6000, "su Pro il thinking non deve mangiare il tetto della risposta visibile");
});

test("spezza le risposte gia pronte in chunk cadenzati visibili", () => {
  assert.ok(__test.syntheticStreamChars <= 48);
  assert.ok(__test.syntheticStreamDelayMs >= 20);
  const text = "x".repeat(200);
  const chunks = text.match(new RegExp(`[\\s\\S]{1,${__test.syntheticStreamChars}}`, "g"));
  assert.ok(chunks.length >= 4);
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

test("l estrazione memoria usa Flash, non il modello chat ritirato, e la cache wiki e v6", () => {
  assert.equal(__test.memoryExtractModel, "deepseek-v4-flash");
  assert.equal(__test.wikiCacheVersion, "v6");
  assert.doesNotMatch(String(__test.memoryExtractModel), /deepseek-chat/);
});

test("Base usa Flash e Pro usa deepseek-v4-pro; i compari pagano 2 crediti su Pro", () => {
  assert.equal(__test.normalizeChatTier(), "base");
  assert.equal(__test.normalizeChatTier("pro"), "pro");
  assert.equal(__test.normalizeChatTier("FLASH"), null);
  assert.equal(__test.resolveChatModel({ DEEPSEEK_MODEL: "deepseek-v4-flash" }, "base"), "deepseek-v4-flash");
  assert.equal(__test.resolveChatModel({}, "pro"), "deepseek-v4-pro");
  assert.equal(__test.getMessageCost("tiziano", "pro"), 0);
  assert.equal(__test.getMessageCost("antonio", "base"), 1);
  assert.equal(__test.getMessageCost("peppe", "pro"), 2);
  assert.equal(__test.getMessageCost("antonio", "base", "extended"), 3, "ricerca estesa Base = 3 crediti");
  assert.equal(__test.getMessageCost("peppe", "pro", "extended"), 5, "ricerca estesa Pro = 5 crediti");
  assert.equal(__test.getMessageCost("tiziano", "pro", "extended"), 0, "Tiziano resta illimitato anche in estesa");
});

test("ricerca estesa: budget ampi ma sempre delimitati", () => {
  assert.deepEqual(__test.extendedBudgets, {
    rounds: 12,
    searches: 12,
    webReads: 16,
    toolCalls: 48,
    durationMs: 300_000,
    baseCost: 3,
    proCost: 5,
  });
  assert.equal(__test.detectResearchMode("Domanda normale", "extended"), true);
});

test("Pro con un solo credito rimasto viene rifiutato e non scala il contatore", async () => {
  const key = __test.getRateLimitKey("antonio");
  const store = new Map([[key, "4"]]);
  const kv = {
    async get(name) { return store.get(name) ?? null; },
    async put(name, value) { store.set(name, String(value)); },
  };
  const env = { SBARCO_KV: kv, DEEPSEEK_API_KEY: "test-key", ALLOWED_ORIGIN: "*" };
  const denied = await worker.fetch(new Request("https://sbarco.test/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "antonio", question: "Quanto costa l ormeggio?", mode: "auto", tier: "pro" }),
  }), env, {});
  assert.equal(denied.status, 429);
  const body = await denied.json();
  assert.match(body.error, /2 crediti/i);
  assert.equal(body.remaining, 1);
  assert.equal(store.get(key), "4");

  const allowed = await __test.checkRateLimit(kv, "antonio", 1);
  assert.equal(allowed.allowed, true);
  const after = await __test.incrementRateLimit(kv, "antonio", allowed.count, 1);
  assert.equal(after, 5);
  assert.equal(store.get(key), "5");
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
      if (body.stream) {
        assert.ok(body.messages.some(message => message.role === "tool" && /preparato/.test(message.content)));
        return sseText("Documento pronto: usa il tasto Scarica PDF.");
      }
      assert.equal(body.tool_choice, "auto", "il primo giro deve poter leggere la wiki prima di save_doc");
      assert.ok(body.messages.some(message => /save_doc|PDF/i.test(message.content || "")));
      return Response.json({ choices: [{ finish_reason: "tool_calls", message: {
        role: "assistant", content: null, tool_calls: [{
          id: "save-1", type: "function", function: {
            name: "save_doc",
            arguments: JSON.stringify({ title: "Piano Bestie", content: "# Piano Bestie\n\nContenuto completo." }),
          },
        }],
      } }] });
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
    assert.equal(agentCalls, 2, "save_doc poi sintesi, senza giro di conferma");
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
  assert.ok(raw.exp >= Math.floor(Date.now() / 1000) - 5);
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

test("estrae tool call DSML dal contenuto quando mancano i tool_calls strutturati", () => {
  const content = [
    "Verifico la wiki:",
    "<|DSML|function_calls>",
    '<|DSML|invoke name="read_wiki">',
    '<|DSML|parameter name="page" string="true">wiki/modelli/comet-770.md</|DSML|parameter>',
    "</|DSML|invoke>",
    '<|DSML|invoke name="search_web">',
    '<|DSML|parameter name="query" string="false">{"query":"prezzo comet 770"}</|DSML|parameter>',
    "</|DSML|invoke>",
    "</|DSML|function_calls>",
  ].join("\n");
  const parsed = __test.parseToolCallMarkup(content);
  assert.equal(parsed.toolCalls.length, 2);
  assert.equal(parsed.toolCalls[0].function.name, "read_wiki");
  assert.equal(parsed.toolCalls[0].function.arguments, '{"page":"wiki/modelli/comet-770.md"}');
  assert.equal(parsed.toolCalls[1].function.name, "search_web");
  assert.equal(parsed.toolCalls[1].function.arguments, '{"query":"prezzo comet 770"}');
  assert.ok(parsed.toolCalls[0].id && parsed.toolCalls[1].id);
  assert.equal(parsed.text, "Verifico la wiki:");
});

test("estrae anche il formato direct-call senza prefisso DSML", () => {
  const content = [
    "<|tool_calls>",
    '<|invoke name="read_wiki">',
    '<|parameter name="path" string="true">wiki/preferenze/track-gommoni.md</|parameter>',
    "</|invoke>",
    '<|invoke name="read_wiki">',
    '<|parameter name="path" string="true">wiki/mercato/usato-under-4500.md</|parameter>',
    "</|invoke>",
    "</|tool_calls>",
  ].join("\n");
  const parsed = __test.parseToolCallMarkup(content);
  assert.equal(parsed.toolCalls.length, 2);
  assert.equal(parsed.toolCalls[0].function.name, "read_wiki");
  assert.equal(parsed.toolCalls[0].function.arguments, '{"path":"wiki/preferenze/track-gommoni.md"}');
  assert.equal(parsed.toolCalls[1].function.arguments, '{"path":"wiki/mercato/usato-under-4500.md"}');
  assert.equal(parsed.text, "");
});

test("stripToolCallMarkup rimuove blocchi e frammenti DSML e direct-call dal testo visibile", () => {
  assert.equal(
    __test.stripToolCallMarkup("Risposta <|DSML|function_calls>sporcizia</|DSML|function_calls> pulita"),
    "Risposta pulita"
  );
  assert.equal(
    __test.stripToolCallMarkup("Prima <|invoke name=\"read_wiki\"><|parameter name=\"path\" string=\"true\">wiki/x.md</|parameter></|invoke> dopo"),
    "Prima dopo"
  );
  assert.equal(__test.stripToolCallMarkup("Nessun markup qui"), "Nessun markup qui");
});

test("il filtro riga scarta il markup di tool call anche a cavallo di piu righe", () => {
  const filter = __test.createMarkupLineFilter();
  assert.equal(filter("Testo pulito\n"), "Testo pulito\n");
  assert.equal(filter("<|tool_calls>\n"), "");
  assert.equal(filter('<|invoke name="read_wiki">\n'), "");
  assert.equal(filter("wiki/preferenze/track-gommoni.md</|parameter>\n"), "");
  assert.equal(filter("</|invoke>\n"), "");
  assert.equal(filter("</|tool_calls>\n"), "");
  assert.equal(filter("Risposta vera e propria.\n"), "Risposta vera e propria.\n");
});

test("read_wiki accetta anche il parametro path usato dal formato direct-call", async () => {
  const originalFetch = globalThis.fetch;
  const wikiFetches = [];
  globalThis.fetch = async (input) => {
    wikiFetches.push(String(input));
    return new Response("# Pagina track gommoni", { status: 200, headers: { "content-type": "text/markdown" } });
  };
  try {
    const output = await __test.executeTool({
      function: { name: "read_wiki", arguments: '{"path":"wiki/preferenze/track-gommoni.md"}' },
    }, {});
    assert.match(output, /Pagina track gommoni/);
    assert.ok(wikiFetches.some(url => url.includes("wiki/preferenze/track-gommoni.md")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("la sintesi finale filtra il markup di tool call e riprova con testo pulito", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("duckduckgo.com")) {
      return new Response(`<a class="result__a" href="https://example.com/fonte">Fonte ufficiale</a><a class="result__snippet">Dato.</a>`, {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }
    if (url.startsWith("https://example.com/")) {
      return new Response("<main>Dato verificato dalla fonte.</main>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    }
    if (url.includes("api.deepseek.com")) {
      const body = JSON.parse(init.body);
      if (body.stream) {
        const markup = [
          "<|tool_calls>",
          '<|invoke name="read_wiki">',
          '<|parameter name="path" string="true">wiki/preferenze/track-gommoni.md</|parameter>',
          "</|invoke>",
          "</|tool_calls>",
        ].join("\n");
        const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: markup } }] })}\n\ndata: [DONE]\n\n`;
        const encoder = new TextEncoder();
        return new Response(new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(sse));
            controller.close();
          },
        }), { status: 200, headers: { "content-type": "text/event-stream" } });
      }
      if (body.tool_choice === "none") {
        assert.ok(body.messages.some(message => /senza tag/i.test(message.content)));
        return Response.json({
          choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Sintesi finale pulita con le fonti verificate." } }],
          usage: { prompt_tokens: 10, completion_tokens: 6, total_tokens: 16 },
        });
      }
      if (body.tool_choice?.function?.name === "search_web") {
        return Response.json({ choices: [{ finish_reason: "tool_calls", message: {
          role: "assistant", content: null, tool_calls: [
            { id: "s1", type: "function", function: { name: "search_web", arguments: '{"query":"gommoni prezzi"}' } },
            { id: "s2", type: "function", function: { name: "search_web", arguments: '{"query":"gommoni lazio"}' } },
          ],
        } }] });
      }
      if (body.tool_choice?.function?.name === "read_url") {
        return Response.json({ choices: [{ finish_reason: "tool_calls", message: {
          role: "assistant", content: null, tool_calls: [
            { id: "r1", type: "function", function: { name: "read_url", arguments: '{"url":"https://example.com/fonte"}' } },
            { id: "r2", type: "function", function: { name: "read_url", arguments: '{"url":"https://example.com/fonte2"}' } },
          ],
        } }] });
      }
      return Response.json({
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "" } }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
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
      body: JSON.stringify({ userId: "peppe", question: "Cerca online i prezzi attuali dei gommoni", mode: "deep" }),
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
    assert.match(body, /Sintesi finale pulita con le fonti verificate/);
    assert.match(body, /"done":true/);
    // Il markup non deve mai raggiungere i token visibili (le metriche meta
    // possono citare i finish_reason "tool_calls": si controlla solo il testo).
    const visibleTokens = body
      .split("\n")
      .filter(line => line.startsWith("data: "))
      .map(line => JSON.parse(line.slice(6)))
      .filter(payload => payload && typeof payload.token === "string")
      .map(payload => payload.token)
      .join("\n");
    assert.doesNotMatch(visibleTokens, /tool_calls|invoke|parameter|<\|/);
    assert.doesNotMatch(body, /"error"/);
    await Promise.all(background);
  } finally {
    globalThis.fetch = originalFetch;
  }
});


test("i tool call DSML nel contenuto vengono eseguiti in silenzio e mai mostrati all utente", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  const wikiFetches = [];
  let agentCalls = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      wikiFetches.push(url);
      return new Response("# Pagina Comet 770", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("api.deepseek.com")) {
      agentCalls += 1;
      const body = JSON.parse(init.body);
      if (agentCalls === 1) {
        const dsml = [
          "<|DSML|function_calls>",
          '<|DSML|invoke name="read_wiki">',
          '<|DSML|parameter name="page" string="true">wiki/modelli/comet-770.md</|DSML|parameter>',
          "</|DSML|invoke>",
          "</|DSML|function_calls>",
        ].join("\n");
        return Response.json({ choices: [{ finish_reason: "tool_calls", message: { role: "assistant", content: dsml } }] });
      }
      assert.ok(
        body.messages.some(message => message.role === "tool" && /Pagina Comet 770/.test(message.content)),
        "il risultato dello strumento DSML deve tornare al modello"
      );
      return Response.json({
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Risposta dalla wiki del Comet 770." } }],
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
      body: JSON.stringify({ userId: "peppe", question: "Cosa dice la wiki del Comet 770?", mode: "auto" }),
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
    assert.ok(
      wikiFetches.some(url => url.includes("wiki/modelli/comet-770.md")),
      "il tool read_wiki DSML deve essere eseguito davvero"
    );
    assert.match(body, /Risposta dalla wiki del Comet 770/);
    assert.match(body, /"toolSequence":\["read_wiki"\]/);
    assert.match(body, /"done":true/);
    assert.doesNotMatch(body, /DSML|function_calls|invoke|parameter/);
    assert.doesNotMatch(body, /"error"/);
    await Promise.all(background);
    assert.equal(agentCalls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
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

test("stripToolCallMarkup preserva gli a-capo del testo visibile", () => {
  const content = [
    "## Conclusione",
    "",
    "- punto uno",
    "- punto due",
    "",
    "<|tool_calls>",
    '<|invoke name="read_wiki">',
    '<|parameter name="path" string="true">wiki/x.md</|parameter>',
    "</|invoke>",
    "</|tool_calls>",
    "",
    "Fonte: https://example.com/fonte",
  ].join("\n");
  const clean = __test.stripToolCallMarkup(content);
  assert.match(clean, /^## Conclusione\n\n- punto uno\n- punto due/);
  assert.match(clean, /Fonte: https:\/\/example\.com\/fonte$/);
  assert.doesNotMatch(clean, /tool_calls|invoke|parameter/);
  assert.ok(clean.includes("\n"), "il markdown sanitizzato conserva gli a-capo");
});

test("stripToolCallMarkup rimuove i blocchi think, anche non chiusi", () => {
  assert.equal(__test.stripToolCallMarkup("<think>ragiono\nsu tutto</think>\nRisposta."), "Risposta.");
  assert.equal(__test.stripToolCallMarkup("<think>ragionamento che non finisce mai\nRisposta?"), "");
  assert.equal(__test.stripToolCallMarkup("Prima.\n<think>x</think>\nDopo."), "Prima.\n\nDopo.");
  assert.equal(__test.stripToolCallMarkup("Solo <think>inline</think> testo."), "Solo testo.");
});

test("stripToolCallMarkup rimuove anche il markup con pipe fullwidth", () => {
  assert.equal(
    __test.stripToolCallMarkup("Risposta <｜tool▁calls｜>sporca</｜tool▁calls｜> pulita"),
    "Risposta pulita"
  );
  assert.equal(__test.stripToolCallMarkup("Vedi <｜end｜>tag orfano<｜/end｜> resto."), "Vedi tag orfano resto.");
});

test("il filtro riga scarta anche i blocchi think su piu righe", () => {
  const filter = __test.createMarkupLineFilter();
  assert.equal(filter("Testo pulito\n"), "Testo pulito\n");
  assert.equal(filter("<think>\n"), "");
  assert.equal(filter("ragionamento interno\n"), "");
  assert.equal(filter("</think>\n"), "");
  assert.equal(filter("Risposta vera.\n"), "Risposta vera.\n");
});

test("save_doc sanifica titolo e contenuto mantenendo gli a-capo", async () => {
  const documents = [];
  const output = await __test.executeTool({
    function: {
      name: "save_doc",
      arguments: JSON.stringify({
        title: "Piano <think>boh</think> Bestie",
        content: "## Titolo\n\n- punto uno\n<|tool_calls>sporco</|tool_calls>\n- punto due",
      }),
    },
  }, { documents });
  assert.equal(documents[0].title, "Piano Bestie");
  assert.equal(documents[0].content, "## Titolo\n\n- punto uno\n\n- punto due");
  assert.match(output, /Documento "Piano Bestie" preparato/);
});

test("Pro risponde sempre con la sintesi thinking e strema il ragionamento", async () => {
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
      const body = JSON.parse(init.body);
      if (body.response_format) {
        return Response.json({ choices: [{ message: { content: '{"facts":[]}' } }] });
      }
      agentCalls += 1;
      if (!body.stream) {
        assert.equal(body.thinking.type, "disabled");
        assert.equal("reasoning_effort" in body, false);
        return Response.json({
          choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Bozza preliminare del piano." } }],
          usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
        });
      }
      assert.equal(body.thinking.type, "enabled");
      assert.equal(body.reasoning_effort, "high");
      assert.equal(body.tool_choice, "none");
      const encoder = new TextEncoder();
      const frames = [
        { choices: [{ delta: { reasoning_content: "Verifico budget e lunghezza del gommone." } }] },
        { choices: [{ delta: { content: "## Conclusione\n\nIl piano regge: bundle entro **2.000 euro** con motore da 15 CV.\n\nFonte: wiki/sintesi/contesto-sbarco.md" } }] },
        { choices: [{ delta: {} }], usage: { prompt_tokens: 20, completion_tokens: 30, total_tokens: 50 } },
      ].map(event => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n";
      return new Response(new ReadableStream({
        start(controller) { controller.enqueue(encoder.encode(frames)); controller.close(); },
      }), { status: 200, headers: { "content-type": "text/event-stream" } });
    }
    throw new Error(`Fetch inatteso: ${url}`);
  };

  try {
    const kv = {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, String(value)); },
    };
    const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "peppe", question: "Riassumi il piano", mode: "auto", tier: "pro" }),
    }), {
      SBARCO_KV: kv,
      DEEPSEEK_API_KEY: "test-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      DEEPSEEK_MODEL_PRO: "deepseek-v4-pro",
      ALLOWED_ORIGIN: "*",
      TIZIANO_PASSKEY_TEST_BYPASS: "true",
    }, {
      waitUntil(promise) { background.push(promise); },
    });

    const body = await response.text();
    assert.match(body, /"reasoning":"Verifico budget e lunghezza del gommone\."/);
    assert.match(body, /Il piano regge: bundle entro \*\*2\.000 euro\*\*/);
    assert.match(body, /"thinking":"on"/);
    assert.match(body, /"tier":"pro"/);
    assert.match(body, /Sbarco sta riflettendo a fondo/);
    assert.doesNotMatch(body, /Bozza preliminare del piano/);
    assert.doesNotMatch(body, /"error"/);
    await Promise.all(background);
    assert.equal(agentCalls, 2, "round agente + sola sintesi thinking su Pro");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("se il provider rifiuta il thinking la sintesi Pro degrada senza errori", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  let synthesisCalls = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("api.deepseek.com")) {
      const body = JSON.parse(init.body);
      if (body.response_format) {
        return Response.json({ choices: [{ message: { content: '{"facts":[]}' } }] });
      }
      if (!body.stream) {
        return Response.json({
          choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Bozza preliminare." } }],
          usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 },
        });
      }
      synthesisCalls += 1;
      if (synthesisCalls === 1) {
        assert.equal(body.thinking.type, "enabled");
        return new Response(JSON.stringify({ error: "thinking non compatibile con la chiamata" }), { status: 400 });
      }
      assert.equal(body.thinking.type, "disabled");
      assert.equal("reasoning_effort" in body, false);
      const encoder = new TextEncoder();
      const frames = [
        { choices: [{ delta: { content: "## Conclusione\n\nRisposta di fallback senza thinking, comunque completa e ben formattata.\n\nFonte: wiki" } }] },
        { choices: [{ delta: {} }], usage: { prompt_tokens: 15, completion_tokens: 20, total_tokens: 35 } },
      ].map(event => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n";
      return new Response(new ReadableStream({
        start(controller) { controller.enqueue(encoder.encode(frames)); controller.close(); },
      }), { status: 200, headers: { "content-type": "text/event-stream" } });
    }
    throw new Error(`Fetch inatteso: ${url}`);
  };

  try {
    const kv = {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, String(value)); },
    };
    const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "peppe", question: "Riassumi il piano", mode: "auto", tier: "pro" }),
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
    assert.match(body, /Risposta di fallback senza thinking/);
    assert.match(body, /"thinking":"fallback"/);
    assert.doesNotMatch(body, /"reasoning"/);
    assert.doesNotMatch(body, /"error"/);
    await Promise.all(background);
    assert.equal(synthesisCalls, 2, "un solo tentativo thinking poi il fallback");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("retry DeepSeek: 500 transitori non uccidono la chat", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  let agentCalls = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("api.deepseek.com")) {
      agentCalls += 1;
      if (agentCalls <= 2) return new Response("errore temporaneo", { status: 500 });
      return Response.json({
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Risposta arrivata dopo due errori transitori." } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
    }
    throw new Error(`Fetch inatteso: ${url}`);
  };

  try {
    const kv = {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, String(value)); },
    };
    const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "peppe", question: "Riassumi il piano", mode: "auto" }),
    }), {
      SBARCO_KV: kv,
      DEEPSEEK_API_KEY: "test-key",
      ALLOWED_ORIGIN: "*",
      TIZIANO_PASSKEY_TEST_BYPASS: "true",
    }, {
      waitUntil(promise) { background.push(promise); },
    });

    const body = await response.text();
    assert.match(body, /Risposta arrivata dopo due errori transitori/);
    assert.match(body, /"done":true/);
    assert.doesNotMatch(body, /"error"/);
    await Promise.all(background);
    assert.equal(agentCalls, 3, "tentativo + due retry con backoff");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("errore di sistema rimborsa il credito, il cancel utente no", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  const rateKey = __test.getRateLimitKey("antonio");
  store.set(rateKey, "2");
  let agentCalls = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("api.deepseek.com")) {
      agentCalls += 1;
      return new Response("sovraccarico", { status: 503 });
    }
    throw new Error(`Fetch inatteso: ${url}`);
  };

  try {
    const kv = {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, String(value)); },
    };
    const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "antonio", question: "Riassumi il piano", mode: "auto" }),
    }), {
      SBARCO_KV: kv,
      DEEPSEEK_API_KEY: "test-key",
      ALLOWED_ORIGIN: "*",
      TIZIANO_PASSKEY_TEST_BYPASS: "true",
    }, {
      waitUntil(promise) { background.push(promise); },
    });

    const body = await response.text();
    assert.match(body, /"code":"agent_error"/);
    assert.match(body, /"done":true/);
    await Promise.all(background);
    assert.equal(agentCalls, 6, "retry del passo + retry della sintesi, poi errore");
    assert.equal(store.get(rateKey), "2", "il credito scalato viene rimborsato sull'errore di sistema");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("read_wiki usa la cache KV e tronca a righe intere dalla testa", async () => {
  const originalFetch = globalThis.fetch;
  const kv = mockKv();
  let fetches = 0;
  const page = "# Pagina test\n" + "Contenuto utile. ".repeat(2000);
  globalThis.fetch = async () => {
    fetches += 1;
    return new Response(page, { status: 200, headers: { "content-type": "text/markdown" } });
  };
  try {
    const call = () => __test.executeTool({
      function: { name: "read_wiki", arguments: '{"page":"wiki/preferenze/track-gommoni.md"}' },
    }, { kv });
    const first = await call();
    const second = await call();
    assert.equal(fetches, 1, "la seconda lettura viene servita dalla cache KV");
    assert.match(first, /^# Pagina test/);
    assert.match(first, /\[\.\.\. troncato, pagina troppo lunga\]/);
    assert.equal(second, first);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("search_web usa la cache KV e conta le ricerche a vuoto", async () => {
  const originalFetch = globalThis.fetch;
  const kv = mockKv();
  let ddgCalls = 0;
  globalThis.fetch = async () => {
    ddgCalls += 1;
    return new Response(
      `<a class="result__a" href="https://example.com/x">Fonte X</a><a class="result__snippet">Dato.</a>`,
      { status: 200, headers: { "content-type": "text/html" } }
    );
  };
  try {
    const state = { searches: 0, searchesEmpty: 0 };
    const call = () => __test.executeTool({
      function: { name: "search_web", arguments: '{"query":"gommone lazio"}' },
    }, { kv, state });
    const first = await call();
    const second = await call();
    assert.equal(ddgCalls, 1, "la seconda ricerca identica viene servita dalla cache KV");
    assert.match(first, /example\.com\/x/);
    assert.equal(second, first);
    assert.equal(state.searchesEmpty, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("il budget sui tool result sostituisce i messaggi più vecchi", () => {
  const messages = [
    { role: "system", content: "s" },
    { role: "tool", tool_call_id: "1", content: "a".repeat(500) },
    { role: "tool", tool_call_id: "2", content: "b".repeat(500) },
    { role: "tool", tool_call_id: "3", content: "c".repeat(500) },
  ];
  __test.applyToolResultBudget(messages, 700);
  assert.match(messages[1].content, /omesso per budget/);
  assert.match(messages[2].content, /omesso per budget/);
  assert.equal(messages[3].content, "c".repeat(500), "i risultati più recenti restano integri");

  const small = [
    { role: "tool", tool_call_id: "1", content: "piccolo" },
    { role: "tool", tool_call_id: "2", content: "altro" },
  ];
  __test.applyToolResultBudget(small, 1000);
  assert.equal(small[0].content, "piccolo", "sotto budget non si tocca nulla");
  assert.equal(small[1].content, "altro");
});

test("trimHeadWholeLines tiene la testa su righe intere", () => {
  const text = "riga uno\nriga due\nriga tre";
  const trimmed = __test.trimHeadWholeLines(text, 18);
  assert.equal(trimmed, "riga uno\nriga due");
});

test("decrementRateLimit non va sotto zero e ignora gli unlimited", async () => {
  const kv = mockKv();
  const key = __test.getRateLimitKey("antonio");
  await __test.incrementRateLimit(kv, "antonio", null, 1);
  await __test.incrementRateLimit(kv, "antonio", null, 1);
  assert.equal(await kv.get(key), "2");
  await __test.decrementRateLimit(kv, "antonio", 1);
  assert.equal(await kv.get(key), "1");
  await __test.decrementRateLimit(kv, "antonio", 5);
  assert.equal(await kv.get(key), "0");
  await __test.decrementRateLimit(kv, "tiziano", 1);
});

test("confronto codice enroll a tempo costante", async () => {
  assert.equal(await __test.constantTimeSecretEqual("codice", "codice"), true);
  assert.equal(await __test.constantTimeSecretEqual("codice", "CODICE"), false);
  assert.equal(await __test.constantTimeSecretEqual("", "x"), false);
  assert.equal(await __test.constantTimeSecretEqual("x", ""), false);
});

test("rate limit passkey per IP: 5 challenge e 10 enroll al minuto", async () => {
  const kv = mockKv();
  const req = ip => new Request("https://sbarco.test/api/passkey/challenge", { headers: { "CF-Connecting-IP": ip } });
  for (let i = 0; i < 5; i += 1) assert.equal(await __test.checkAuthRateLimit(kv, req("1.2.3.4"), "challenge", 5), true);
  assert.equal(await __test.checkAuthRateLimit(kv, req("1.2.3.4"), "challenge", 5), false);
  assert.equal(await __test.checkAuthRateLimit(kv, req("5.6.7.8"), "challenge", 5), true, "un altro IP ha il suo contatore");
  for (let i = 0; i < 10; i += 1) assert.equal(await __test.checkAuthRateLimit(kv, req("1.2.3.4"), "enroll", 10), true);
  assert.equal(await __test.checkAuthRateLimit(kv, req("1.2.3.4"), "enroll", 10), false);
});

test("enroll passkey solo via POST con codice nel body, e rate limit", async () => {
  const env = {
    SBARCO_KV: mockKv(),
    ALLOWED_ORIGIN: "https://tizianocarpentieri.github.io",
    TIZIANO_ENROLLMENT_CODE: "codice-segreto",
  };
  const post = code => worker.fetch(new Request("https://sbarco.test/api/passkey/challenge", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "9.9.9.9" },
    body: JSON.stringify({ purpose: "enroll", code }),
  }), env, {});

  // GET non espone più l'enroll (niente codice negli URL/log)
  const getEnroll = await worker.fetch(new Request("https://sbarco.test/api/passkey/challenge?purpose=enroll&code=codice-segreto"), env, {});
  assert.equal(getEnroll.status, 401);

  // Codice errato → 401
  const bad = await post("sbagliato");
  assert.equal(bad.status, 401);
  assert.match((await bad.json()).error, /non valido/i);

  // Codice giusto → 200 con le opzioni di creazione
  const good = await post("codice-segreto");
  assert.equal(good.status, 200);
  const payload = await good.json();
  assert.ok(payload.challenge);
  assert.equal(payload.user.name, "tiziano");
  assert.equal(payload.rp.id, "tizianocarpentieri.github.io");

  // Rate limit: dopo 10 tentativi (1 riuscito + 9 errati) l'undicesimo è bloccato
  for (let i = 0; i < 9; i += 1) await post("sbagliato");
  const blocked = await post("codice-segreto");
  assert.equal(blocked.status, 401);
  assert.match((await blocked.json()).error, /Troppi tentativi/i);
});

test("la session Tiziano non riscrive KV finché resta più di 1/3 del TTL", async () => {
  const base = mockKv();
  const writesByKey = new Map();
  const kv = {
    get: base.get,
    delete: base.delete,
    async put(key, value, opts = {}) {
      writesByKey.set(key, (writesByKey.get(key) || 0) + 1);
      return base.put(key, value, opts);
    },
  };
  const env = { SBARCO_KV: kv };
  const issued = await __test.issueTizianoSession(env);
  const hash = await __test.sha256Base64Url(issued.sessionToken);
  const sessionKey = `auth:tiziano:session:${hash}`;
  const writesAfterIssue = writesByKey.get(sessionKey) || 0;

  // Verifica immediata: nessuna scrittura aggiuntiva (restano >2/3 del TTL)
  const verified = await __test.verifyTizianoSession(issued.sessionToken, env);
  assert.equal(verified.expiresAt, issued.expiresAt);
  assert.equal(writesByKey.get(sessionKey) || 0, writesAfterIssue, "nessun renew immediato");

  // Con meno di 1/3 di TTL residuo la sessione si rinnova e scrive KV
  await base.put(sessionKey, JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300, createdAt: new Date().toISOString() }));
  const renewed = await __test.verifyTizianoSession(issued.sessionToken, env);
  assert.ok(renewed.expiresAt > Date.now() + 25 * 60 * 1000, "il rinnovo riporta la sessione a 30 minuti");
  assert.equal(writesByKey.get(sessionKey) || 0, writesAfterIssue + 1, "renew scritto una sola volta");
});

test("ricerca estesa: parte con meno crediti del costo e consuma solo il residuo", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  const rateKey = __test.getRateLimitKey("antonio");
  store.set(rateKey, "3"); // rimangono 2 crediti su 5: costo estesa Base = 3
  let agentCalls = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("api.deepseek.com")) {
      agentCalls += 1;
      return Response.json({
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Censimento completato con fonti verificate." } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      });
    }
    throw new Error(`Fetch inatteso: ${url}`);
  };

  try {
    const kv = {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, String(value)); },
    };
    const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "antonio", question: "Censimento dei porti del litorale", mode: "extended" }),
    }), {
      SBARCO_KV: kv,
      DEEPSEEK_API_KEY: "test-key",
      ALLOWED_ORIGIN: "*",
      TIZIANO_PASSKEY_TEST_BYPASS: "true",
    }, {
      waitUntil(promise) { background.push(promise); },
    });

    const body = await response.text();
    assert.match(body, /"mode":"extended"/);
    assert.match(body, /"rounds":12/);
    assert.match(body, /Censimento completato con fonti verificate/);
    assert.match(body, /"done":true/);
    assert.doesNotMatch(body, /"error"/);
    await Promise.all(background);
    assert.equal(agentCalls, 12, "l'estesa usa fino a 12 round agente");
    assert.equal(store.get(rateKey), "5", "consuma min(costo, residuo) = 2 crediti e non blocca la richiesta");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("ricerca estesa con zero crediti viene rifiutata prima di partire", async () => {
  const store = new Map([[__test.getRateLimitKey("peppe"), "5"]]);
  const kv = {
    async get(key) { return store.get(key) ?? null; },
    async put(key, value) { store.set(key, String(value)); },
  };
  const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "peppe", question: "Censimento dei porti", mode: "extended" }),
  }), { SBARCO_KV: kv, DEEPSEEK_API_KEY: "test-key", ALLOWED_ORIGIN: "*", TIZIANO_PASSKEY_TEST_BYPASS: "true" }, {});
  assert.equal(response.status, 429);
  const body = await response.json();
  assert.match(body.error, /Limite giornaliero/i);
  assert.equal(store.get(__test.getRateLimitKey("peppe")), "5");
});

function sseText(text) {
  const encoder = new TextEncoder();
  const frames = [
    { choices: [{ delta: { content: text } }] },
    { choices: [{ delta: {} }], usage: { prompt_tokens: 8, completion_tokens: 12, total_tokens: 20 } },
  ].map(event => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n";
  return new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(frames));
      controller.close();
    },
  }), { status: 200, headers: { "content-type": "text/event-stream" } });
}

test("se il modello chiede conferma del PDF l'harness forza save_doc al giro dopo", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  const toolChoices = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("api.deepseek.com")) {
      const body = JSON.parse(init.body);
      if (body.stream) return sseText("## Conclusione\n\nPDF pronto con i moli della wiki.");
      toolChoices.push(body.tool_choice);
      if (body.tool_choice?.function?.name === "save_doc") {
        assert.ok(body.max_tokens >= 4000, "save_doc non deve stare nei 1000 token del loop");
        return Response.json({ choices: [{ finish_reason: "tool_calls", message: {
          role: "assistant", content: null, tool_calls: [{
            id: "save-forced", type: "function", function: {
              name: "save_doc",
              arguments: JSON.stringify({ title: "Moli Lazio", content: "| Porto | Comune |\n| Fiumicino | Fiumicino |" }),
            },
          }],
        } }] });
      }
      return Response.json({
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Vuoi che prepari il PDF adesso?" } }],
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
      body: JSON.stringify({ userId: "tiziano", question: "Prepara il pdf del piano attuale", mode: "auto" }),
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
    assert.match(body, /"documents":\[\{"title":"Moli Lazio"/);
    assert.doesNotMatch(body, /"error"/);
    assert.equal(toolChoices[0], "auto");
    assert.equal(toolChoices[1].function.name, "save_doc");
    await Promise.all(background);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deep + contesto basta: non forza search_web e consegna il PDF", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  const toolChoices = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("duckduckgo.com")) {
      throw new Error("search_web non deve partire quando l'utente ha detto di usare il contesto");
    }
    if (url.includes("api.deepseek.com")) {
      const body = JSON.parse(init.body);
      if (body.stream) return sseText("## Conclusione\n\nConsegno dalla wiki, senza nuove ricerche.");
      toolChoices.push(body.tool_choice);
      if (body.tool_choice?.function?.name === "save_doc") {
        return Response.json({ choices: [{ finish_reason: "tool_calls", message: {
          role: "assistant", content: null, tool_calls: [{
            id: "save-ctx", type: "function", function: {
              name: "save_doc",
              arguments: JSON.stringify({ title: "Porti wiki", content: "Tabella dalla wiki." }),
            },
          }],
        } }] });
      }
      return Response.json({
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Posso fare il PDF se vuoi." } }],
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
      body: JSON.stringify({
        userId: "tiziano",
        question: "Credo che hai nel contesto sufficienti info per creare il pdf",
        mode: "deep",
      }),
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
    assert.equal(toolChoices[0], "auto");
    assert.ok(toolChoices.every(choice => choice?.function?.name !== "search_web"));
    assert.match(body, /"documents":\[\{"title":"Porti wiki"/);
    assert.doesNotMatch(body, /"error"/);
    await Promise.all(background);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("un passo agente 503 non abortisce: si va alla sintesi con quello che c'e'", async () => {
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
      const body = JSON.parse(init.body || "{}");
      if (body.stream) {
        return sseText("## Conclusione\n\nConsegno comunque dalla wiki dopo un passo fallito.");
      }
      return new Response("sovraccarico", { status: 503 });
    }
    throw new Error(`Fetch inatteso: ${url}`);
  };

  try {
    const kv = {
      async get(key) { return store.get(key) ?? null; },
      async put(key, value) { store.set(key, String(value)); },
    };
    const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: "tiziano", question: "Riassumi il piano", mode: "auto" }),
    }), {
      SBARCO_KV: kv,
      DEEPSEEK_API_KEY: "test-key",
      ALLOWED_ORIGIN: "*",
      TIZIANO_PASSKEY_TEST_BYPASS: "true",
    }, {
      waitUntil(promise) { background.push(promise); },
    });
    const body = await response.text();
    assert.match(body, /Consegno comunque dalla wiki/);
    assert.doesNotMatch(body, /"error"/);
    assert.doesNotMatch(body, /La ricerca si e' interrotta/);
    assert.ok(agentCalls >= 4, "retry del passo + sintesi");
    await Promise.all(background);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Riprendi dopo una richiesta PDF mantiene il compito documento", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  store.set("chat:tiziano", JSON.stringify([
    { role: "user", content: "Crearmi il pdf di tutti i moli da Fiumicino a Sabaudia" },
    { role: "assistant", content: "Vuoi che prepari il PDF adesso?" },
  ]));
  const background = [];
  const toolChoices = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("api.deepseek.com")) {
      const body = JSON.parse(init.body);
      if (body.stream) return sseText("## Conclusione\n\nDocumento dei moli pronto.");
      toolChoices.push(body.tool_choice);
      if (body.tool_choice?.function?.name === "save_doc") {
        return Response.json({ choices: [{ finish_reason: "tool_calls", message: {
          role: "assistant", content: null, tool_calls: [{
            id: "save-resume", type: "function", function: {
              name: "save_doc",
              arguments: JSON.stringify({ title: "Moli ripresi", content: "Tabella." }),
            },
          }],
        } }] });
      }
      return Response.json({
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Riprendo. Vuoi il PDF?" } }],
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
      body: JSON.stringify({ userId: "tiziano", question: "Riprendi", mode: "auto" }),
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
    assert.match(body, /"pdfRequested":true/);
    assert.match(body, /"documents":\[\{"title":"Moli ripresi"/);
    assert.ok(toolChoices.some(choice => choice?.function?.name === "save_doc"));
    await Promise.all(background);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Pro su un elenco moli non esce dal loop senza read_wiki", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  let wikiReads = 0;
  let sawWikiNudge = false;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      if (url.includes("porti-fiumicino-sabaudia")) wikiReads += 1;
      return new Response("# Porti\n| Porto | Comune |\n| Fiumicino | Fiumicino |", {
        status: 200,
        headers: { "content-type": "text/markdown" },
      });
    }
    if (url.includes("api.deepseek.com")) {
      const body = JSON.parse(init.body);
      if (body.stream) {
        assert.ok(sawWikiNudge, "la sintesi deve arrivare dopo il nudge wiki");
        return sseText("## Conclusione\n\nElenco moli dalla wiki, raggruppati per comune.");
      }
      if (body.messages.some(message => /Non chiudere\. Devi leggere la wiki/i.test(message.content || ""))) {
        sawWikiNudge = true;
        return Response.json({ choices: [{ finish_reason: "tool_calls", message: {
          role: "assistant", content: null, tool_calls: [{
            id: "wiki-1", type: "function", function: {
              name: "read_wiki",
              arguments: JSON.stringify({ page: "wiki/documenti/porti-fiumicino-sabaudia.md" }),
            },
          }],
        } }] });
      }
      return Response.json({
        choices: [{ finish_reason: "stop", message: {
          role: "assistant",
          content: "In questa sessione non ho potuto aprire la wiki. Vuoi che ci riprovi?",
        } }],
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
      body: JSON.stringify({
        userId: "tiziano",
        question: "Voglio la lista di tutti i moli da Fiumicino a Sabaudia per la barca a vela",
        mode: "auto",
        tier: "pro",
      }),
    }), {
      SBARCO_KV: kv,
      DEEPSEEK_API_KEY: "test-key",
      DEEPSEEK_MODEL: "deepseek-v4-flash",
      DEEPSEEK_MODEL_PRO: "deepseek-v4-pro",
      ALLOWED_ORIGIN: "*",
      TIZIANO_PASSKEY_TEST_BYPASS: "true",
    }, {
      waitUntil(promise) { background.push(promise); },
    });
    const body = await response.text();
    assert.match(body, /Elenco moli dalla wiki/);
    assert.doesNotMatch(body, /non ho potuto aprire la wiki/);
    assert.ok(wikiReads >= 1);
    assert.match(body, /"read_wiki"/);
    await Promise.all(background);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("se la sintesi Pro viene tagliata, continua senza ripetere", async () => {
  const originalFetch = globalThis.fetch;
  const store = new Map();
  const background = [];
  let streams = 0;
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      return new Response("# Contesto test", { status: 200, headers: { "content-type": "text/markdown" } });
    }
    if (url.includes("api.deepseek.com")) {
      const body = JSON.parse(init.body);
      if (!body.stream) {
        return Response.json({
          choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Bozza." } }],
        });
      }
      streams += 1;
      const encoder = new TextEncoder();
      if (streams === 1) {
        const frames = [
          { choices: [{ delta: { reasoning_content: "Devo elencare tutti i porti." } }] },
          { choices: [{ delta: { content: "## Cosa\n\nTabella incompleta" } }] },
          { choices: [{ finish_reason: "length", delta: {} }], usage: { prompt_tokens: 10, completion_tokens: 2600, total_tokens: 2610 } },
        ].map(event => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n";
        return new Response(new ReadableStream({
          start(controller) { controller.enqueue(encoder.encode(frames)); controller.close(); },
        }), { status: 200, headers: { "content-type": "text/event-stream" } });
      }
      assert.equal(body.thinking.type, "disabled");
      assert.ok(body.messages.some(message => /tagliata|Continua/i.test(message.content || "")));
      const frames = [
        { choices: [{ delta: { content: " | Porto | Comune |\n| Anzio | Anzio |" } }] },
        { choices: [{ finish_reason: "stop", delta: {} }] },
      ].map(event => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n";
      return new Response(new ReadableStream({
        start(controller) { controller.enqueue(encoder.encode(frames)); controller.close(); },
      }), { status: 200, headers: { "content-type": "text/event-stream" } });
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
      body: JSON.stringify({ userId: "peppe", question: "Riassumi il piano", mode: "auto", tier: "pro" }),
    }), {
      SBARCO_KV: kv,
      DEEPSEEK_API_KEY: "test-key",
      DEEPSEEK_MODEL_PRO: "deepseek-v4-pro",
      ALLOWED_ORIGIN: "*",
      TIZIANO_PASSKEY_TEST_BYPASS: "true",
    }, {
      waitUntil(promise) { background.push(promise); },
    });
    const body = await response.text();
    assert.match(body, /Tabella incompleta/);
    assert.match(body, /Anzio/);
    assert.equal(streams, 2);
    assert.doesNotMatch(body, /"error"/);
    await Promise.all(background);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("JSON tool troncato spiega di riprovare save_doc compatto", async () => {
  const documents = [];
  const output = await __test.executeTool({
    function: { name: "save_doc", arguments: '{"title":"Moli Lazio","content":' },
  }, { documents });
  assert.equal(documents.length, 0);
  assert.match(output, /troncat|malformato|compatte/i);
});

test("modalita' sconosciuta: 400 esplicito", async () => {
  const response = await worker.fetch(new Request("https://sbarco.test/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId: "antonio", question: "Ciao", mode: "foo" }),
  }), { SBARCO_KV: null, DEEPSEEK_API_KEY: "test-key", ALLOWED_ORIGIN: "*", TIZIANO_PASSKEY_TEST_BYPASS: "true" }, {});
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.match(body.error, /auto, deep o extended/i);
});
