import graphData from "../graph.json" with { type: "json" };

const MAX_HISTORY = 8;
const MAX_MEMORY_FACTS = 15;
const MAX_SUMMARY_LENGTH = 300;
const VALID_USERS = ["tiziano", "antonio", "peppe"];

// ── Graph traversal ─────────────────────────────────────────────

function normalizeLabel(label) {
  return label
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function findNodes(query, max = 20) {
  const tokens = normalizeLabel(query).split(" ").filter(t => t.length >= 3);
  const scored = [];

  for (const node of graphData.nodes) {
    const nl = normalizeLabel(node.label);
    let score = 0;
    for (const token of tokens) {
      if (nl.includes(token)) score += token.length;
      // bonus for exact match on important fields
      if (node.file_type && normalizeLabel(node.file_type).includes(token)) score += 2;
    }
    // boost models and key concepts
    if (node.file_type === "model" || node.file_type === "modello") score += 5;
    if (node.file_type === "constraint") score += 3;
    if (node.file_type === "preference" || node.file_type === "preferenza") score += 3;

    if (score > 0) scored.push({ node, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max).map(s => s.node);
}

function bfsFrom(startNodeId, depth = 2) {
  const visited = new Set();
  const queue = [[startNodeId, 0]];
  const subNodes = [];
  const subEdges = [];

  while (queue.length > 0) {
    const [currentId, d] = queue.shift();
    if (visited.has(currentId) || d > depth) continue;
    visited.add(currentId);

    const node = graphData.nodes.find(n => n.id === currentId);
    if (node) subNodes.push(node);

    for (const edge of graphData.links) {
      if (edge.source === currentId && !visited.has(edge.target)) {
        queue.push([edge.target, d + 1]);
        subEdges.push(edge);
      } else if (edge.target === currentId && !visited.has(edge.source)) {
        queue.push([edge.source, d + 1]);
        subEdges.push(edge);
      }
    }
  }
  return { nodes: subNodes, edges: subEdges };
}

function traverseGraph(question) {
  // Extract model mentions
  const modelNames = [];
  const lower = question.toLowerCase();
  for (const node of graphData.nodes) {
    if (
      (node.file_type === "model" || node.file_type === "modello") &&
      node.label.length > 3 &&
      lower.includes(normalizeLabel(node.label))
    ) {
      modelNames.push(node);
    }
  }

  if (modelNames.length > 0) {
    // Deep dive on mentioned model(s)
    const allNodes = new Map();
    const allEdges = [];
    const seenEdgeKeys = new Set();

    for (const model of modelNames) {
      const sub = bfsFrom(model.id, 3);
      for (const n of sub.nodes) allNodes.set(n.id, n);
      for (const e of sub.edges) {
        const key = `${e.source}|${e.target}|${e.relation}`;
        if (!seenEdgeKeys.has(key)) {
          seenEdgeKeys.add(key);
          allEdges.push(e);
        }
      }
    }
    return { nodes: [...allNodes.values()], edges: allEdges, focused: true };
  }

  // General query: find matching nodes + 2-hop expansion
  const matched = findNodes(question, 10);
  if (matched.length === 0) {
    return { nodes: [], edges: [], focused: false, empty: true };
  }

  const allNodes = new Map();
  const allEdges = [];
  const seenEdgeKeys = new Set();

  for (const node of matched) {
    allNodes.set(node.id, node);
    const sub = bfsFrom(node.id, 1);  // 1-hop from each match
    for (const n of sub.nodes) allNodes.set(n.id, n);
    for (const e of sub.edges) {
      const key = `${e.source}|${e.target}|${e.relation}`;
      if (!seenEdgeKeys.has(key)) {
        seenEdgeKeys.add(key);
        allEdges.push(e);
      }
    }
  }
  return { nodes: [...allNodes.values()], edges: allEdges, focused: false };
}

function subgraphToText(subgraph) {
  if (subgraph.empty) return "[Nessuna informazione trovata nel grafo.]";
  if (!subgraph.nodes || subgraph.nodes.length === 0) return "";

  const lines = [];
  const byType = {};
  for (const n of subgraph.nodes) {
    const t = n.file_type || "info";
    if (!byType[t]) byType[t] = [];
    byType[t].push(n);
  }

  for (const [type, nodes] of Object.entries(byType)) {
    if (nodes.length === 1) {
      lines.push(`- [${type}] ${nodes[0].label}`);
    } else {
      lines.push(`- [${type}] ${nodes.map(n => n.label).join(" | ")}`);
    }
  }

  // Add edges summary
  if (subgraph.edges && subgraph.edges.length > 0) {
    const rels = {};
    for (const e of subgraph.edges) {
      const r = e.relation;
      rels[r] = (rels[r] || 0) + 1;
    }
    lines.push(`\nRelazioni: ${Object.entries(rels).map(([k, v]) => `${k}(${v})`).join(", ")}`);
  }

  return lines.join("\n");
}

// ── Memory (KV) ──────────────────────────────────────────────────

async function getMemory(kv) {
  try {
    const raw = await kv.get("memory:project");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function addMemory(kv, fact) {
  const mem = await getMemory(kv);
  mem.push(fact);
  // Keep last 50 facts
  const trimmed = mem.slice(-50);
  await kv.put("memory:project", JSON.stringify(trimmed));
}

async function getChatHistory(kv, userId) {
  try {
    const raw = await kv.get(`chat:${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function setChatHistory(kv, userId, history) {
  await kv.put(`chat:${userId}`, JSON.stringify(history));
}

async function getSummary(kv, userId) {
  return (await kv.get(`chat:${userId}:summary`)) || "";
}

async function setSummary(kv, userId, summary) {
  await kv.put(`chat:${userId}:summary`, summary.slice(0, MAX_SUMMARY_LENGTH * 2));
}

// ── DeepSeek API ─────────────────────────────────────────────────

async function callDeepSeek(apiKey, model, messages, env) {
  const url = "https://api.deepseek.com/v1/chat/completions";

  const body = {
    model: model || "deepseek-chat",
    messages,
    temperature: 0.7,
    max_tokens: 600,
  };

  const resp = await fetch(url, {
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
  return {
    content: data.choices[0].message.content,
    usage: data.usage || {},
  };
}

// ── Prompt builder ───────────────────────────────────────────────

const SYSTEM_PROMPT = `Sei Sbarco, l'assistente del Progetto Barca delle Bestie (Tiziano, Antonio, Peppe).
Rispondi in italiano, tono amichevole e diretto. Sei un membro della crew.

CONTESTO PROGETTO:
- Budget max: 4.500€ usato (track rigidi); gommone benchmark Argo-Evo 360 a 970€ nuovo
- Nessuno ha la patente nautica → limite 40,8 CV, entro 6 miglia
- Base: Ardea/Pomezia, mare Tirreno laziale (Anzio, Circeo, Fiumicino)
- Dual track: scafi rigidi (gozzo/open) + gommoni pneumatici + motori fuoribordo
- Priorità: pesca a canna (#1), giri costa (#2), bagno (#3)
- 3 persone comode per pesca, fino a 6 per uscite sociali
- Gestione: ≤1.200€/testa/anno (3.600€ totali)

REGOLE:
- Se un utente esprime una preferenza o un vincolo, ricordalo.
- Cita sempre la fonte se presente nel grafo (es. "Secondo i requisiti v1...").
- Se non hai abbastanza informazioni, dillo sinceramente.
- Non inventare prezzi, modelli o normative.
- Se la domanda riguarda Peppe, Antonio o Tiziano, usa il nome.`;

function buildMessages(userId, question, subgraphText, memoryFacts, history, summary) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Inject shared memory
  if (memoryFacts.length > 0) {
    const factsText = memoryFacts
      .slice(-MAX_MEMORY_FACTS)
      .map(f => `- [${f.date?.slice(0, 10) || "?"}] ${f.user}: ${f.fact}`)
      .join("\n");
    messages.push({
      role: "system",
      content: `MEMORIA CONDIVISA DELLE BESTIE:\n${factsText}`,
    });
  }

  // Inject summary (old messages)
  if (summary) {
    messages.push({
      role: "system",
      content: `RIEPILOGO CONVERSAZIONI PRECEDENTI (${userId}):\n${summary}`,
    });
  }

  // Inject subgraph
  if (subgraphText) {
    messages.push({
      role: "system",
      content: `INFORMAZIONI DAL GRAFO DI PROGETTO:\n${subgraphText}`,
    });
  }

  // Recent history
  for (const msg of history) {
    messages.push(msg);
  }

  // Current question
  messages.push({ role: "user", content: question });

  return messages;
}

// ── Memory extraction ────────────────────────────────────────────

async function extractMemoryIfNeeded(apiKey, model, userMessage, assistantResponse, kv, userId) {
  const extractPrompt = [
    {
      role: "system",
      content: `Analizza questa coppia messaggio-risposta del Progetto Barca. 
Se l'utente ha espresso una preferenza, un vincolo, un'opinione o una decisione sui seguenti temi, estraila come fatto:
- modelli di barca/gommone
- motori (CV, marca, 2T/4T)
- budget o costi
- preferenze su materiali, dimensioni, capienza
- zona operativa o rimessaggio
- patente nautica
- pesca o uso

Rispondi SOLO con un JSON array di fatti (vuoto se niente da salvare):
[{"fact": "stringa concisa in italiano", "tags": ["tag1"]}]

NON includere altro testo.`,
    },
    {
      role: "user",
      content: `User: ${userMessage}\n\nAssistant: ${assistantResponse}`,
    },
  ];

  try {
    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || "deepseek-chat",
        messages: extractPrompt,
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!resp.ok) return;
    const data = await resp.json();
    const text = data.choices[0].message.content;

    // Try to parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return;
    const facts = JSON.parse(jsonMatch[0]);

    for (const fact of facts) {
      if (fact.fact && fact.fact.length > 5) {
        await addMemory(kv, {
          user: userId,
          date: new Date().toISOString(),
          fact: fact.fact,
          tags: fact.tags || [],
        });
      }
    }
  } catch {
    // Silent — memory extraction is best-effort
  }
}

// ── Summarization ────────────────────────────────────────────────

async function maybeSummarize(kv, userId, history) {
  if (history.length <= MAX_HISTORY) return;

  const oldMessages = history.slice(0, history.length - MAX_HISTORY);
  const existingSummary = await getSummary(kv, userId);

  // We'd need an LLM call to summarize, but for now just keep a date reference
  const newSummary = existingSummary
    ? `${existingSummary} ... poi altri ${oldMessages.length} messaggi.`
    : ` ${oldMessages.length} messaggi precedenti.`;

  await setSummary(kv, userId, newSummary);

  // Keep only recent
  await setChatHistory(kv, userId, history.slice(-MAX_HISTORY));
}

// ── Debug log ────────────────────────────────────────────────────

const DEBUG_BUFFER = []; // in-memory (lost on cold start, but fine for dev)

async function getDebugReport(kv) {
  const memory = await getMemory(kv);
  const chats = {};
  for (const uid of VALID_USERS) {
    const h = await getChatHistory(kv, uid);
    const s = await getSummary(kv, uid);
    if (h.length > 0 || s) {
      chats[uid] = { historyLen: h.length, summary: s };
    }
  }

  return {
    generated: new Date().toISOString(),
    debugBuffer: DEBUG_BUFFER.slice(-50),
    memory: {
      count: memory.length,
      recent: memory.slice(-10),
    },
    chats,
  };
}

// ── Main handler ─────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Content-Type": "application/json",
    };

    // ── Chat endpoint ──────────────────────────────────────────
    if (url.pathname === "/api/chat" && request.method === "POST") {
      try {
        const body = await request.json();
        const { userId, question } = body;

        if (!userId || !VALID_USERS.includes(userId)) {
          return new Response(
            JSON.stringify({ error: "userId non valido. Usa: tiziano, antonio, peppe" }),
            { status: 400, headers: corsHeaders }
          );
        }

        if (!question || question.trim().length < 2) {
          return new Response(
            JSON.stringify({ error: "Domanda troppo corta." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const startTime = Date.now();
        const apiKey = env.DEEPSEEK_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "API key non configurata." }),
            { status: 500, headers: corsHeaders }
          );
        }

        // Check for /debug
        if (question.trim().toLowerCase() === "/debug" && userId === "tiziano") {
          const report = await getDebugReport(env.SBARCO_KV);
          return new Response(JSON.stringify(report, null, 2), { headers: corsHeaders });
        }

        // 1. Traverse graph
        const subgraph = traverseGraph(question);
        const subgraphText = subgraphToText(subgraph);

        // 2. Load memory + history
        const [memoryFacts, history, summary] = await Promise.all([
          getMemory(env.SBARCO_KV),
          getChatHistory(env.SBARCO_KV, userId),
          getSummary(env.SBARCO_KV, userId),
        ]);

        // 3. Build messages
        const messages = buildMessages(
          userId,
          question,
          subgraphText,
          memoryFacts,
          history,
          summary
        );

        // 4. Call DeepSeek
        const result = await callDeepSeek(apiKey, env.DEEPSEEK_MODEL, messages, env);

        // 5. Save to history
        const newHistory = [
          ...history,
          { role: "user", content: question },
          { role: "assistant", content: result.content },
        ];
        await setChatHistory(env.SBARCO_KV, userId, newHistory);

        // 6. Summarize if too long
        await maybeSummarize(env.SBARCO_KV, userId, newHistory);

        // 7. Extract memory (async, don't await)
        env.SBARCO_KV && extractMemoryIfNeeded(
          apiKey,
          env.DEEPSEEK_MODEL,
          question,
          result.content,
          env.SBARCO_KV,
          userId
        );

        // 8. Log to debug buffer
        DEBUG_BUFFER.push({
          ts: new Date().toISOString(),
          user: userId,
          question: question.slice(0, 100),
          subgraphNodes: subgraph.nodes?.length || 0,
          promptTokens: result.usage?.prompt_tokens,
          responseTokens: result.usage?.completion_tokens,
          elapsedMs: Date.now() - startTime,
        });
        if (DEBUG_BUFFER.length > 100) DEBUG_BUFFER.shift();

        return new Response(
          JSON.stringify({
            response: result.content,
            subgraphSize: subgraph.nodes?.length || 0,
          }),
          { headers: corsHeaders }
        );

      } catch (err) {
        DEBUG_BUFFER.push({
          ts: new Date().toISOString(),
          error: err.message,
        });
        return new Response(
          JSON.stringify({ error: "Errore interno. Tiziano può usare /debug per i dettagli." }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // ── Health check ───────────────────────────────────────────
    if (url.pathname === "/api/health" || url.pathname.endsWith("/api/health")) {
      return new Response(
        JSON.stringify({
          status: "ok",
          graphNodes: graphData.nodes?.length || 0,
          graphEdges: graphData.links?.length || 0,
        }),
        { headers: corsHeaders }
      );
    }

    // ── Debug: echo URL info (GET only) ────────────────────────
    if (url.pathname === "/api/debug-url" && request.method === "GET") {
      return new Response(
        JSON.stringify({
          pathname: url.pathname,
          href: url.href,
          host: url.host,
          method: request.method,
        }),
        { headers: corsHeaders }
      );
    }

    return new Response("Sbarco API — usa POST /api/chat", { status: 404, headers: corsHeaders });
  },
};
