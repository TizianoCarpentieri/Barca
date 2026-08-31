import projectGraph from "../graph.json" with { type: "json" };

const STOP_WORDS = new Set([
  "alla", "alle", "anche", "come", "con", "cosa", "dalla", "dei", "del", "delle", "dello",
  "degli", "della", "dove", "fare", "fatto", "hanno", "nella", "nelle", "non",
  "per", "piu", "quale", "quali", "quello", "questa", "questo", "sono", "sulla",
  "sulle", "tra", "una", "uno", "vorrei", "voglio", "pdf", "documento", "documenti",
  "prepara", "preparami", "crea", "creami", "fammi", "genera", "risposta", "analisi",
  "riassumi", "attuale",
]);
const QUERY_EXPANSIONS = {
  piano: ["stato", "requisiti", "decisione", "priorita", "overview"],
  situazione: ["stato", "overview", "decisione"],
  costi: ["budget", "spesa", "tco", "prospetto"],
  rischio: ["rischi", "criticita", "ispezionare"],
  rischi: ["rischio", "criticita", "ispezionare"],
  comprare: ["acquisto", "shortlist", "candidati"],
};

export function normalizeGraphText(value = "") {
  return String(value)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokensFor(value = "") {
  return [...new Set(normalizeGraphText(value).split(" ")
    .filter(token => token.length >= 3 && !STOP_WORDS.has(token)))];
}

const GRAPH_NODES = Array.isArray(projectGraph?.nodes) ? projectGraph.nodes : [];
const GRAPH_LINKS = Array.isArray(projectGraph?.links) ? projectGraph.links : [];
const NODE_BY_ID = new Map(GRAPH_NODES.map(node => [String(node.id), node]));
const ADJACENCY = new Map();
const TOKEN_FREQUENCY = new Map();

for (const node of GRAPH_NODES) {
  const tokens = tokensFor(`${node.label || ""} ${node.source_file || ""}`);
  node.__runtimeTokens = tokens;
  for (const token of tokens) TOKEN_FREQUENCY.set(token, (TOKEN_FREQUENCY.get(token) || 0) + 1);
}

for (const link of GRAPH_LINKS) {
  const source = String(link?.source?.id || link?.source || "");
  const target = String(link?.target?.id || link?.target || "");
  if (!NODE_BY_ID.has(source) || !NODE_BY_ID.has(target)) continue;
  if (!ADJACENCY.has(source)) ADJACENCY.set(source, []);
  if (!ADJACENCY.has(target)) ADJACENCY.set(target, []);
  ADJACENCY.get(source).push({ nodeId: target, link });
  ADJACENCY.get(target).push({ nodeId: source, link });
}

function idf(token) {
  return Math.log((GRAPH_NODES.length + 1) / ((TOKEN_FREQUENCY.get(token) || 0) + 1)) + 1;
}

function nodeScore(node, queryTokens, normalizedQuestion) {
  const label = normalizeGraphText(node.label || "");
  const source = normalizeGraphText(node.source_file || "");
  let score = label && normalizedQuestion.includes(label) ? 5 : 0;
  for (const token of queryTokens) {
    if (node.__runtimeTokens?.includes(token)) score += idf(token);
    else if (label.includes(token)) score += idf(token) * 0.7;
    else if (source.includes(token)) score += idf(token) * 0.35;
  }
  const asksAboutSbarco = /\b(sbarco|worker|bot|chat)\b/.test(normalizedQuestion);
  if (!asksAboutSbarco && /\b(sbarco|worker)\b/.test(source)) score *= 0.12;
  return score;
}

function cleanRuntimeNode(node, score = 0, via = null) {
  return {
    id: String(node.id),
    label: String(node.label || node.id),
    type: String(node.file_type || "concept"),
    sourceFile: String(node.source_file || ""),
    sourceLocation: String(node.source_location || ""),
    score: Math.round(score * 100) / 100,
    via,
  };
}

export function queryProjectGraph(question, { nodeLimit = 10, pageLimit = 5, charLimit = 5_500 } = {}) {
  const normalizedQuestion = normalizeGraphText(question);
  const baseTokens = tokensFor(question);
  const queryTokens = [...new Set([
    ...baseTokens,
    ...baseTokens.flatMap(token => QUERY_EXPANSIONS[token] || []),
  ].filter(token => TOKEN_FREQUENCY.has(token)))];
  if (!normalizedQuestion || queryTokens.length === 0 || GRAPH_NODES.length === 0) {
    return { matched: false, queryTokens, nodes: [], pages: [], text: "" };
  }

  const seeds = GRAPH_NODES
    .map(node => ({ node, score: nodeScore(node, queryTokens, normalizedQuestion) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(3, Math.min(nodeLimit, 6)));

  if (seeds.length === 0) return { matched: false, queryTokens, nodes: [], pages: [], text: "" };

  const candidates = new Map();
  for (const seed of seeds) {
    candidates.set(String(seed.node.id), cleanRuntimeNode(seed.node, seed.score));
    for (const edge of ADJACENCY.get(String(seed.node.id)) || []) {
      const neighbor = NODE_BY_ID.get(edge.nodeId);
      if (!neighbor) continue;
      const score = seed.score * 0.34 + nodeScore(neighbor, queryTokens, normalizedQuestion) * 0.66;
      const existing = candidates.get(edge.nodeId);
      if (!existing || score > existing.score) {
        candidates.set(edge.nodeId, cleanRuntimeNode(neighbor, score, {
          label: seed.node.label,
          relation: String(edge.link.relation || "connected"),
          confidence: String(edge.link.confidence || ""),
        }));
      }
    }
  }

  const nodes = [...candidates.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, nodeLimit);
  const pageScores = new Map();
  for (const node of nodes) {
    const page = node.sourceFile.replace(/\\/g, "/");
    if (!page.startsWith("wiki/") || !page.endsWith(".md") || page.endsWith("wiki/log.md")) continue;
    // Una pagina molto lunga non deve vincere solo perche' contiene molti nodi
    // vicini. Il miglior match rappresenta meglio l'intento della domanda.
    pageScores.set(page, Math.max(pageScores.get(page) || 0, node.score));
  }
  const pages = [...pageScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, pageLimit)
    .map(([path, score]) => ({ path, score: Math.round(score * 100) / 100 }));

  const lines = [
    "GRAFO GRAPHIFY DEL PROGETTO (indice di navigazione, non prova fattuale):",
    `Query espansa deterministicamente: ${queryTokens.join(", ")}`,
  ];
  for (const node of nodes) {
    const edge = node.via ? `; via ${node.via.relation} da ${node.via.label}` : "";
    lines.push(`- ${node.label} -> ${node.sourceFile}${node.sourceLocation ? `:${node.sourceLocation}` : ""}${edge}`);
  }
  if (pages.length > 0) lines.push(`Pagine wiki candidate: ${pages.map(page => page.path).join(", ")}`);
  lines.push("Per sostenere un claim apri la pagina wiki: le etichette del grafo servono solo a trovare il percorso.");

  return {
    matched: true,
    queryTokens,
    nodes,
    pages,
    text: lines.join("\n").slice(0, charLimit),
  };
}

export const PROJECT_GRAPH_STATS = Object.freeze({
  nodes: GRAPH_NODES.length,
  links: GRAPH_LINKS.length,
});
