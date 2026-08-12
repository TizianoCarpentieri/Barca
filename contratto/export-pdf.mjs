#!/usr/bin/env node
/**
 * Export bozza patto + prospetto costi → PDF A4 (documento ufficiale).
 *
 * Usage:
 *   npm run pdf
 *   npm run pdf -- --bozza
 *   npm run pdf -- --prospetto
 *   npm run pdf -- --out ./export
 *   npm run pdf -- --qa          # fixture corta in export/_qa/ (verifica layout)
 *   npm run pdf -- --html-only   # solo HTML intermedia (debug)
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;

const DOCS = {
  bozza: {
    id: "bozza",
    source: "bozza-patto-v1.md",
    kicker: "Le Bestie — gestione condivisa",
    defaultTitle: "Patto di gestione condivisa",
    badge: "Bozza di lavoro",
    outfile: "patto-le-bestie.pdf",
  },
  prospetto: {
    id: "prospetto",
    source: "prospetto-costi-a-norma.md",
    kicker: "Le Bestie — cantiere conformità",
    defaultTitle: "Prospetto costi a norma",
    badge: "Documento vivo",
    outfile: "prospetto-costi-a-norma.pdf",
  },
  mappa: {
    id: "mappa",
    // HTML grafico pre-buildato da build-mappa-varo.mjs
    sourceHtml: path.join("export", "mappa-punti-varo-lazio.html"),
    buildScript: "build-mappa-varo.mjs",
    kicker: "Le Bestie — cantiere conformità",
    defaultTitle: "Mappa punti di varo",
    badge: "Documento vivo",
    outfile: "mappa-punti-varo-lazio.pdf",
  },
};

const QA_FIXTURE = `# Fixture QA export PDF

**Versione:** QA · **Data:** 2026-08-11

> Callout legale di prova: in caso di contrasto con norme imperative, prevale la legge.

## Tabella a 2 colonne

| Voce | Valore |
|------|--------|
| Bundle max | ≤ 2.000 € |
| Split | 1/N |

## Tabella a 4 colonne (legibilità)

| Scenario | €/anno | Fonte | Note |
|----------|--------|-------|------|
| RC gommone piccolo | 60–100 | broker | range di mercato |
| RC + furto motore | 150–350 | listini | opzionale |
| Tagliando 9.9–15 CV | 80–180 | officina | non obbligo legge |

## Tabella a 5 colonne

| # | Nome | Ruolo | Contatto | Stato |
|---|------|--------|----------|--------|
| 1 | Tiziano | Socio | [DA DECIDERE] | attivo |
| 2 | Antonio | Socio | [DA DECIDERE] | attivo |
| 3 | Peppe | Socio | [DA DECIDERE] | attivo |

### Elenco e codice

- Punto A con **grassetto** e \`codice inline\`
- Punto B con formula \`Rimborso = max(0, QuotaLorda − D_i)\`

\`\`\`
(1) DepT = min(cap_t, t × r)
(2) ValoreBase = P × (1 − DepT)
\`\`\`

#### Sottosezione

Testo corpo serif a corpo ridotto, adatto a stampa bianco puro senza spreco toner di fondo.
`;

function parseArgs(argv) {
  const args = {
    bozza: false,
    prospetto: false,
    mappa: false,
    qa: false,
    htmlOnly: false,
    out: path.join(ROOT, "export"),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--bozza") args.bozza = true;
    else if (a === "--prospetto") args.prospetto = true;
    else if (a === "--mappa") args.mappa = true;
    else if (a === "--qa") args.qa = true;
    else if (a === "--html-only") args.htmlOnly = true;
    else if (a === "--out") args.out = path.resolve(argv[++i] || args.out);
    else if (a === "--help" || a === "-h") args.help = true;
  }
  if (!args.bozza && !args.prospetto && !args.mappa && !args.qa) {
    args.bozza = true;
    args.prospetto = true;
    args.mappa = true;
  }
  return args;
}

function extractMeta(md, conf) {
  const meta = {
    title: conf.defaultTitle,
    version: null,
    date: null,
    extra: [],
  };

  const h1 = md.match(/^#\s+(.+)$/m);
  if (h1) meta.title = h1[1].replace(/\r$/, "").trim();

  const version =
    md.match(/\*\*Versione:\*\*\s*(.+)/i) ||
    md.match(/^Versione:\s*(.+)$/im);
  if (version) meta.version = cleanMeta(version[1]);

  const date =
    md.match(/\*\*Data:\*\*\s*(.+)/i) ||
    md.match(/\*\*Aggiornato:\*\*\s*(.+)/i) ||
    md.match(/\*\*Audit normativo:\*\*\s*(.+)/i) ||
    md.match(/^Data:\s*(.+)$/im);
  if (date) meta.date = cleanMeta(date[1]);

  return meta;
}

function cleanMeta(s) {
  return String(s)
    .replace(/\*\*/g, "")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function enhanceHtml(html) {
  // Wrap tables for page-break control + column class
  return html.replace(/<table([\s\S]*?)<\/table>/gi, (full) => {
    const headerCells = (full.match(/<th\b/gi) || []).length;
    const firstRowCells = (full.match(/<tr[\s\S]*?<\/tr>/i)?.[0].match(/<t[dh]\b/gi) || [])
      .length;
    const cols = Math.max(headerCells, firstRowCells, 1);
    const cls = cols >= 4 ? ` cols-${Math.min(cols, 6)}` : "";
    const withClass = full.replace(
      /<table\b([^>]*)>/i,
      `<table class="doc-table${cls}"$1>`
    );
    return `<div class="table-wrap">${withClass}</div>`;
  });
}

function buildDocumentHtml({ conf, meta, bodyHtml, css }) {
  const metaBits = [];
  if (meta.version) metaBits.push(`<span><strong>Versione</strong> ${esc(meta.version)}</span>`);
  if (meta.date) metaBits.push(`<span><strong>Data</strong> ${esc(meta.date)}</span>`);
  metaBits.push(`<span class="badge">${esc(conf.badge)}</span>`);

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>${esc(meta.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400;1,7..72,600&family=Source+Code+Pro:wght@400;500&family=Source+Sans+3:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
  <style>${css}</style>
</head>
<body>
  <article class="doc">
    <header class="masthead">
      <p class="masthead-kicker">${esc(conf.kicker)}</p>
      <h1>${esc(meta.title)}</h1>
      <div class="masthead-meta">${metaBits.join("\n")}</div>
    </header>
    <main class="content">
${bodyHtml}
    </main>
    <footer class="footer-note">
      Documento generato dal cantiere contratto · uso interno tra le Parti · non costituisce consulenza legale professionale.
    </footer>
  </article>
</body>
</html>`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripFirstH1(md) {
  // Title lives in masthead; avoid duplicate H1 in body (CRLF-safe)
  return md.replace(/^#\s+[^\n\r]+(?:\r?\n)+/, "");
}

/** Remove only changelog sections from the PDF body, wherever they appear. */
function stripChangelog(md) {
  const lines = String(md).split(/\r?\n/);
  const out = [];
  let skipping = false;
  let changelogLevel = 0;

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    const headingText = heading
      ? heading[2].replace(/[*_`]/g, "").trim()
      : "";

    if (!skipping && heading && /^changelog(?:\s+bozza|\s+mandato)?$/i.test(headingText)) {
      skipping = true;
      changelogLevel = heading[1].length;
      continue;
    }

    if (skipping) {
      if (heading && heading[1].length <= changelogLevel) {
        skipping = false;
        out.push(line);
      }
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/gi, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "sez";
}

function parseMermaidXyChart(block) {
  const titleM = block.match(/title\s+"([^"]+)"/);
  const xM = block.match(/x-axis\s+\[([^\]]+)\]/);
  const yM = block.match(/y-axis\s+"([^"]+)"\s+([\d.]+)\s*-->\s*([\d.]+)/);
  const barM = block.match(/bar\s+\[([^\]]+)\]/);
  if (!xM || !barM) return null;
  const labels = xM[1].split(",").map((s) => s.replace(/"/g, "").trim()).filter(Boolean);
  const values = barM[1].split(",").map((s) => Number(String(s).trim())).filter((n) => !Number.isNaN(n));
  if (!labels.length || labels.length !== values.length) return null;
  return {
    title: titleM ? titleM[1] : "",
    yLabel: yM ? yM[1] : "",
    yMax: yM ? Number(yM[3]) : Math.max(...values) * 1.15,
    labels,
    values,
  };
}

function buildBarChartHtml(chart, { accent = "#1a3358", accentAlt = "#5b8fc7" } = {}) {
  const max = chart.yMax > 0 ? chart.yMax : Math.max(...chart.values, 1);
  const bars = chart.labels
    .map((label, i) => {
      const v = chart.values[i];
      const pct = Math.max(2, Math.round((v / max) * 1000) / 10);
      const color = i % 2 === 0 ? accent : accentAlt;
      return `<div class="chart-row">
  <div class="chart-label">${esc(label)}</div>
  <div class="chart-track"><div class="chart-bar" style="width:${pct}%;background:${color}"></div></div>
  <div class="chart-val">${esc(String(v).replace(".", ","))}</div>
</div>`;
    })
    .join("\n");
  return `<figure class="chart-block">
  ${chart.title ? `<figcaption class="chart-title">${esc(chart.title)}</figcaption>` : ""}
  ${chart.yLabel ? `<p class="chart-axis">${esc(chart.yLabel)}</p>` : ""}
  <div class="chart-bars">${bars}</div>
</figure>`;
}

function decodeHtmlEntities(s) {
  return String(s)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function prepareMarkdownForPdf(md) {
  return stripFirstH1(stripChangelog(md));
}

/** After marked: mermaid xychart + ASCII bar pre → HTML charts. */
function replaceChartsInHtml(html) {
  let out = html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/gi,
    (_, body) => {
      const chart = parseMermaidXyChart(decodeHtmlEntities(body));
      return chart ? buildBarChartHtml(chart) : "";
    }
  );

  out = out.replace(/<pre><code(?:\s+class="language-text")?>([\s\S]*?)<\/code><\/pre>/gi, (full, body) => {
    const text = decodeHtmlEntities(body);
    if (!text.includes("█") && !/PESO A SECCO|COSTO CARBURANTE/i.test(text)) return full;
    const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim());
    const titleHint = lines.find((l) => /PESO|COSTO|€\/h|kg/i.test(l) && !l.includes("█")) || text;
    const data = [];
    for (const line of lines) {
      const m = line.match(
        /^(\d+[.,]?\d*)\s+(2T|4T)\s+[█\s\.·]+([\d]+(?:[.,]\d+)?)\s*$/i
      );
      if (m) {
        data.push({
          label: `${m[1].replace(",", ".")} ${m[2].toUpperCase()}`,
          value: Number(m[3].replace(",", ".")),
        });
      }
    }
    if (data.length < 3) return full;
    const isEuro = /€|COSTO|carburante/i.test(titleHint);
    return buildBarChartHtml({
      title: isEuro
        ? "€/h carburante uso misto @ 1,97 €/L (punto medio)"
        : "Peso medio a secco (kg) per fascia",
      yLabel: isEuro ? "€/h" : "kg",
      yMax: isEuro ? 20 : 110,
      labels: data.map((d) => d.label),
      values: data.map((d) => d.value),
    });
  });

  return out;
}

function injectHeadingIds(html) {
  const used = new Map();
  return html.replace(/<h([1-4])>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
    const text = decodeHtmlEntities(inner.replace(/<[^>]+>/g, "")).trim();
    let id = slugify(text);
    const n = (used.get(id) || 0) + 1;
    used.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
}

function buildTocHtml(html, { levels = [2, 3], variant = "default" } = {}) {
  const items = [];
  const re = /<h([1-4])\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const level = Number(m[1]);
    if (!levels.includes(level)) continue;
    const id = m[2];
    const text = decodeHtmlEntities(m[3].replace(/<[^>]+>/g, "")).trim();
    if (!text || /^indice$/i.test(text)) continue;
    items.push({ level, id, text });
  }
  if (items.length < 3) return "";
  const lis = items
    .map((it) => {
      const cls = `toc-l${it.level}`;
      return `<li class="${cls}"><a href="#${it.id}">${esc(it.text)}</a></li>`;
    })
    .join("\n");
  return `<nav class="toc toc--${esc(variant)}" aria-label="Indice del documento">
  <p class="toc-kicker">Mappa del documento</p>
  <h2 class="toc-heading">Indice</h2>
  <p class="toc-note">Seleziona una voce nel PDF per raggiungere la sezione.</p>
  <ol class="toc-list">
${lis}
  </ol>
</nav>`;
}

async function renderMarkdown(md, { tocLevels = [], tocVariant = "default" } = {}) {
  marked.setOptions({
    gfm: true,
    breaks: false,
  });
  const prepared = prepareMarkdownForPdf(md);
  let raw = await marked.parse(prepared);
  raw = enhanceHtml(raw);
  raw = replaceChartsInHtml(raw);
  raw = injectHeadingIds(raw);
  if (tocLevels.length) {
    const toc = buildTocHtml(raw, { levels: tocLevels, variant: tocVariant });
    if (toc) raw = `${toc}\n${raw}`;
  }
  return raw;
}

async function writePdf(html, pdfPath, footerLabel, { margins, headerLabel } = {}) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    // extra beat for webfonts
    await page.waitForTimeout(400);
    const label = esc(footerLabel || "Documento di lavoro");
    const head = esc(headerLabel || "Le Bestie · gestione condivisa");
    const m = margins || {
      top: "16mm",
      bottom: "16mm",
      left: "14mm",
      right: "14mm",
    };
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:6.5pt;font-family:'Source Sans 3',sans-serif;color:#5c677a;width:100%;padding:0 12mm;margin:0;box-sizing:border-box;">
        <span style="border-bottom:0.4pt solid #c5ccd6;display:block;padding-bottom:2pt;">${head}</span>
      </div>`,
      footerTemplate: `<div style="font-size:6.5pt;font-family:'Source Sans 3',sans-serif;color:#5c677a;width:100%;padding:0 12mm;margin:0;box-sizing:border-box;display:flex;justify-content:space-between;border-top:0.4pt solid #c5ccd6;padding-top:3pt;">
        <span>${label}</span>
        <span>pag. <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
      margin: m,
    });
  } finally {
    await browser.close();
  }
}

async function writePdfFromFile(htmlPath, pdfPath, footerLabel, opts) {
  const html = await readFile(htmlPath, "utf8");
  // Prefer file:// so relative assets would work; content is self-contained.
  await writePdf(html, pdfPath, footerLabel, opts);
}

async function exportOne({ conf, md, outDir, htmlOnly }) {
  const css = await readFile(path.join(ROOT, "export-theme.css"), "utf8");
  const meta = extractMeta(md, conf);
  // Entrambi i documenti hanno indice navigabile; il dettaglio cambia per
  // evitare un indice eccessivamente lungo nel patto.
  const tocLevels = conf.id === "bozza" ? [1, 2] : conf.id === "prospetto" ? [2, 3] : [];
  const bodyHtml = await renderMarkdown(md, {
    tocLevels,
    tocVariant: conf.id,
  });
  const html = buildDocumentHtml({ conf, meta, bodyHtml, css });

  await mkdir(outDir, { recursive: true });
  const base = conf.outfile.replace(/\.pdf$/i, "");
  const htmlPath = path.join(outDir, `${base}.html`);
  const pdfPath = path.join(outDir, conf.outfile);

  await writeFile(htmlPath, html, "utf8");
  if (htmlOnly) {
    return { htmlPath, pdfPath: null };
  }
  const footerLabel = [conf.badge, meta.version ? `v. ${meta.version}` : null]
    .filter(Boolean)
    .join(" · ");
  await writePdf(html, pdfPath, footerLabel);
  return { htmlPath, pdfPath };
}

function printHelp() {
  console.log(`export-pdf — PDF ufficiali da markdown/HTML contratto

  npm run pdf                 bozza + prospetto + mappa → contratto/export/
  npm run pdf -- --bozza
  npm run pdf -- --prospetto
  npm run pdf -- --mappa      mappa punti di varo (build HTML + PDF)
  npm run pdf -- --qa         fixture layout → contratto/export/_qa/
  npm run pdf -- --out DIR
  npm run pdf -- --html-only  solo HTML (debug tipografia)
`);
}

function ensureMappaHtml() {
  const conf = DOCS.mappa;
  const script = path.join(ROOT, conf.buildScript);
  const r = spawnSync(process.execPath, [script], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error(
      `build mappa fallito:\n${r.stdout || ""}\n${r.stderr || ""}`
    );
  }
  if (r.stdout) process.stdout.write(r.stdout);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const jobs = [];

  if (args.qa) {
    jobs.push({
      conf: {
        id: "qa",
        kicker: "Le Bestie — QA layout export",
        defaultTitle: "Fixture QA export PDF",
        badge: "Solo verifica",
        outfile: "qa-layout.pdf",
      },
      md: QA_FIXTURE,
      outDir: path.join(args.out, "_qa"),
    });
  }

  if (args.bozza) {
    const src = path.join(ROOT, DOCS.bozza.source);
    if (!existsSync(src)) throw new Error(`Manca ${DOCS.bozza.source}`);
    jobs.push({
      conf: DOCS.bozza,
      md: await readFile(src, "utf8"),
      outDir: args.out,
    });
  }

  if (args.prospetto) {
    const src = path.join(ROOT, DOCS.prospetto.source);
    if (!existsSync(src)) throw new Error(`Manca ${DOCS.prospetto.source}`);
    jobs.push({
      conf: DOCS.prospetto,
      md: await readFile(src, "utf8"),
      outDir: args.out,
    });
  }

  if (args.mappa) {
    ensureMappaHtml();
    const htmlPath = path.join(ROOT, DOCS.mappa.sourceHtml);
    if (!existsSync(htmlPath)) {
      throw new Error(`Manca HTML mappa: ${DOCS.mappa.sourceHtml}`);
    }
    jobs.push({
      conf: DOCS.mappa,
      htmlPath,
      outDir: args.out,
      kind: "html-file",
    });
  }

  const results = [];
  for (const job of jobs) {
    process.stdout.write(`→ ${job.conf.id}… `);
    let r;
    if (job.kind === "html-file") {
      await mkdir(job.outDir, { recursive: true });
      const pdfPath = path.join(job.outDir, job.conf.outfile);
      if (args.htmlOnly) {
        r = { htmlPath: job.htmlPath, pdfPath: null };
      } else {
        await writePdfFromFile(job.htmlPath, pdfPath, job.conf.badge, {
          headerLabel: "Le Bestie · punti di varo litorale",
          margins: {
            top: "14mm",
            bottom: "14mm",
            left: "10mm",
            right: "10mm",
          },
        });
        r = { htmlPath: job.htmlPath, pdfPath };
      }
    } else {
      r = await exportOne({ ...job, htmlOnly: args.htmlOnly });
    }
    console.log(r.pdfPath ? path.relative(ROOT, r.pdfPath) : path.relative(ROOT, r.htmlPath));
    results.push(r);
  }

  console.log(`Fatto (${results.length}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
