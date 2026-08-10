import assert from "node:assert/strict";
import test from "node:test";
import worker, { __test } from "../src/index.js";

test("riconosce la ricerca profonda esplicita o semantica", () => {
  assert.equal(__test.detectResearchMode("Come siamo messi col budget?"), false);
  assert.equal(__test.detectResearchMode("Cerca online i prezzi attuali"), true);
  assert.equal(__test.detectResearchMode("Domanda normale", "deep"), true);
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
        choices: [{ finish_reason: "stop", message: { role: "assistant", content: "Risposta rapida verificata." } }],
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
    assert.match(body, /"done":true/);
    assert.doesNotMatch(body, /"error"/);
    await Promise.all(background);
    assert.equal(agentCalls, 2, "una chiamata risposta + una estrazione memoria in background");
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
    assert.equal(agentCalls, 4, "tre round agente + estrazione memoria");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
