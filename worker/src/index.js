import graphData from "../graph.json" with { type: "json" };

const MAX_HISTORY = 8;
const MAX_MEMORY_FACTS = 15;
const MAX_SUMMARY_LENGTH = 300;
const MAX_DAILY_MESSAGES = 3;
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
  montaggio: `# Montaggio e logistica gommone

## Ciclo completo di un'uscita

### Preparazione (carico)
1. Caricare gommone piegato in auto (~70 kg)
2. Caricare motore fuoribordo separatamente
3. Caricare accessori (pompa, tanica, attrezzatura pesca)

### Arrivo in spiaggia/scivolo
4. Scaricare tutto
5. Gonfiare il gommone con pompa (10-15 minuti)
6. Montare il paiolato (se in sezioni)
7. Montare il motore sullo specchio di poppa
8. Collegare tanica carburante

### Rientro
9. Tirare il gommone fuori dall'acqua
10. Lavare con pompa per togliere sabbia/sale
11. Sgonfiare completamente
12. Smontare paiolato
13. Ripiegare e rimettere in sacca
14. Ricaricare tutto in auto

## Criticita'
- Peso (70 kg): movimentazione in 2 persone minima
- Tempo per ciclo completo: 30-45 min solo montaggio/smontaggio
- Sabbia: difficile da rimuovere completamente, abrasiva
- Fatica: accumulo a ogni uscita, specie d'estate
- Spazio auto: gommone + motore + attrezzatura = bagagliaio pieno

## Confronto con scafo rigido
- Gommone: 30-45 min per partenza, 30-45 min per rientro
- Scafo rigido in porto: 5 min per partenza, 5 min per rientro

Verdetto: il gommone e' economicamente vantaggioso ma operativamente pesante.`,

  normativa: `# Limiti navigazione senza patente (IT)

Per restare senza patente in Italia (diporto):
- Potenza motore: <= 30 kW (40,8 CV) - fonte MIT
- Cilindrata: sotto le soglie per tipo motore (es. 750 cc 2T)
- Distanza (mare): entro 6 miglia dalla costa
- Moto d'acqua: patente sempre richiesta

Se nessuno ha la patente, la shortlist si restringe a natanti/imbarcazioni leggere con motorizzazione entro soglia e uscite costiere.
Se almeno uno prende la patente A (anche solo entro 12 miglia), si apre un mercato molto piu' adatto a pesca + 6 pax + divertimento.`,
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

// ── Tool definitions ──────────────────────────────────────────────

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

// ── Tool execution ────────────────────────────────────────────────

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
  try { args = JSON.parse(argsStr); } catch {}

  switch (name) {
    case "search_web":
      return await executeSearchWeb(args.query || "");
    case "read_wiki":
      return await executeReadWiki(args.page || "");
    case "save_doc":
      return `Documento "${args.title}" salvato con successo.\n\nContenuto:\n${args.content}`;
    default:
      return `Tool sconosciuto: ${name}`;
  }
}

// ── Tool loop ─────────────────────────────────────────────────────

async function chatWithTools(apiKey, model, messages, maxIterations = 3) {
  const allMessages = [...messages];
  const documents = [];

  for (let i = 0; i < maxIterations; i++) {
    const body = {
      model: model || "deepseek-v4-flash",
      messages: allMessages,
      tools: TOOLS,
      temperature: 0.7,
      max_tokens: 8000,
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
    const message = data.choices[0].message;
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

// ── Rate limiter ─────────────────────────────────────────────────

async function checkRateLimit(kv, userId) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `rate:${userId}:${today}`;
  try {
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw) : 0;
    return { count, key, allowed: count < MAX_DAILY_MESSAGES };
  } catch {
    return { count: 0, key, allowed: true };
  }
}

async function incrementRateLimit(kv, userId) {
  const today = new Date().toISOString().slice(0, 10);
  const key = `rate:${userId}:${today}`;
  try {
    const raw = await kv.get(key);
    const count = raw ? parseInt(raw) : 0;
    const newCount = count + 1;
    // TTL: expire tomorrow at midnight UTC
    const tomorrow = new Date();
    tomorrow.setUTCHours(24, 0, 0, 0);
    const ttl = Math.floor((tomorrow.getTime() - Date.now()) / 1000);
    await kv.put(key, String(newCount), { expirationTtl: ttl });
    return newCount;
  } catch {
    return 999; // fail-open on error
  }
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

        // Rate limit check
        if (env.SBARCO_KV) {
          const rate = await checkRateLimit(env.SBARCO_KV, userId);
          if (!rate.allowed) {
            return new Response(
              JSON.stringify({
                error: `Limite giornaliero raggiunto (${MAX_DAILY_MESSAGES}/${MAX_DAILY_MESSAGES} msg). Torna domani!`,
                remaining: 0,
              }),
              { status: 429, headers: corsHeaders }
            );
          }
        }

        // 1. Load memory + history + system prompt
        const [memoryFacts, history, summary, systemPrompt] = await Promise.all([
          getMemory(env.SBARCO_KV),
          getChatHistory(env.SBARCO_KV, userId),
          getSummary(env.SBARCO_KV, userId),
          buildSystemPrompt(env.SBARCO_KV),
        ]);

        // 2. Build messages
        const messages = buildMessages(
          systemPrompt,
          question,
          memoryFacts,
          history,
          summary
        );

        // 3. Call DeepSeek with tool loop
        const result = await chatWithTools(apiKey, env.DEEPSEEK_MODEL, messages);

        // 4. Save to history
        const newHistory = [
          ...history,
          { role: "user", content: question },
          { role: "assistant", content: result.response },
        ];
        await setChatHistory(env.SBARCO_KV, userId, newHistory);

        // 5. Summarize if too long
        await maybeSummarize(env.SBARCO_KV, userId, newHistory);

        // 6. Extract memory (async, don't await)
        env.SBARCO_KV && extractMemoryIfNeeded(
          apiKey,
          env.DEEPSEEK_MODEL,
          question,
          result.response,
          env.SBARCO_KV,
          userId
        );

        // 7. Log to debug buffer
        DEBUG_BUFFER.push({
          ts: new Date().toISOString(),
          user: userId,
          question: question.slice(0, 100),
          toolRounds: result.toolRounds || 0,
          documents: result.documents?.length || 0,
          promptTokens: result.usage?.prompt_tokens,
          responseTokens: result.usage?.completion_tokens,
          elapsedMs: Date.now() - startTime,
        });
        if (DEBUG_BUFFER.length > 100) DEBUG_BUFFER.shift();

        // 8. Increment rate limit
        const newCount = env.SBARCO_KV ? await incrementRateLimit(env.SBARCO_KV, userId) : 0;

        const responsePayload = {
          response: result.response,
          remaining: Math.max(0, MAX_DAILY_MESSAGES - newCount),
        };

        if (result.documents && result.documents.length > 0) {
          responsePayload.documents = result.documents;
        }

        return new Response(
          JSON.stringify(responsePayload),
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

    // ── Web search endpoint ─────────────────────────────────────
    if (url.pathname === "/api/search" && request.method === "POST") {
      try {
        const body = await request.json();
        const { userId, query } = body;
        if (!userId || !VALID_USERS.includes(userId)) {
          return new Response(
            JSON.stringify({ error: "userId non valido." }),
            { status: 400, headers: corsHeaders }
          );
        }
        if (!query || query.trim().length < 3) {
          return new Response(
            JSON.stringify({ error: "Query di ricerca troppo corta." }),
            { status: 400, headers: corsHeaders }
          );
        }

        // Rate limit
        if (env.SBARCO_KV) {
          const rate = await checkRateLimit(env.SBARCO_KV, userId);
          if (!rate.allowed) {
            return new Response(
              JSON.stringify({ error: `Limite giornaliero raggiunto (${MAX_DAILY_MESSAGES}/${MAX_DAILY_MESSAGES} msg).` }),
              { status: 429, headers: corsHeaders }
            );
          }
        }

        // Fetch from DuckDuckGo HTML (no API key needed)
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const ddgResp = await fetch(ddgUrl, {
          headers: { "User-Agent": "Sbarco/1.0 (boat research bot)" },
        });
        const html = await ddgResp.text();

        // Extract result snippets
        const results = [];
        const snippetRegex = /<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>[\s\S]*?<a class="result__snippet[^"]*">([^<]+)<\/a>/gi;
        let match;
        while ((match = snippetRegex.exec(html)) !== null) {
          results.push({
            title: match[2].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
            url: match[1],
            snippet: match[3].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
          });
          if (results.length >= 5) break;
        }

        // Increment rate limit
        const newCount = env.SBARCO_KV ? await incrementRateLimit(env.SBARCO_KV, userId) : 0;

        return new Response(
          JSON.stringify({
            query,
            results,
            remaining: Math.max(0, MAX_DAILY_MESSAGES - newCount),
          }),
          { headers: corsHeaders }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Ricerca web fallita: " + err.message }),
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // ── Document export endpoint ────────────────────────────────
    if (url.pathname === "/api/export" && request.method === "POST") {
      try {
        const body = await request.json();
        const { userId, format, content } = body;
        if (!userId || !VALID_USERS.includes(userId)) {
          return new Response(
            JSON.stringify({ error: "userId non valido." }),
            { status: 400, headers: corsHeaders }
          );
        }
        if (!content) {
          return new Response(
            JSON.stringify({ error: "Contenuto mancante." }),
            { status: 400, headers: corsHeaders }
          );
        }

        const fmt = format || "md";
        let mimeType, fileContent;
        if (fmt === "md" || fmt === "markdown") {
          mimeType = "text/markdown; charset=utf-8";
          fileContent = content;
        } else if (fmt === "txt") {
          mimeType = "text/plain; charset=utf-8";
          fileContent = content.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
        } else {
          mimeType = "text/plain; charset=utf-8";
          fileContent = content;
        }

        const fileName = `sbarco-${userId}-${new Date().toISOString().slice(0, 10)}.${fmt}`;
        return new Response(fileContent, {
          headers: {
            ...corsHeaders,
            "Content-Type": mimeType,
            "Content-Disposition": `attachment; filename="${fileName}"`,
          },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Export fallito: " + err.message }),
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
