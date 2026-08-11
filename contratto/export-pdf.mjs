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
    qa: false,
    htmlOnly: false,
    out: path.join(ROOT, "export"),
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--bozza") args.bozza = true;
    else if (a === "--prospetto") args.prospetto = true;
    else if (a === "--qa") args.qa = true;
    else if (a === "--html-only") args.htmlOnly = true;
    else if (a === "--out") args.out = path.resolve(argv[++i] || args.out);
    else if (a === "--help" || a === "-h") args.help = true;
  }
  if (!args.bozza && !args.prospetto && !args.qa) {
    args.bozza = true;
    args.prospetto = true;
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

async function renderMarkdown(md) {
  marked.setOptions({
    gfm: true,
    breaks: false,
  });
  const raw = await marked.parse(stripFirstH1(md));
  return enhanceHtml(raw);
}

async function writePdf(html, pdfPath, footerLabel) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    const label = esc(footerLabel || "Documento di lavoro");
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: `<div style="font-size:6.5pt;font-family:'Source Sans 3',sans-serif;color:#5c677a;width:100%;padding:0 14mm;margin:0;box-sizing:border-box;">
        <span style="border-bottom:0.4pt solid #c5ccd6;display:block;padding-bottom:2pt;">Le Bestie · gestione condivisa</span>
      </div>`,
      footerTemplate: `<div style="font-size:6.5pt;font-family:'Source Sans 3',sans-serif;color:#5c677a;width:100%;padding:0 14mm;margin:0;box-sizing:border-box;display:flex;justify-content:space-between;border-top:0.4pt solid #c5ccd6;padding-top:3pt;">
        <span>${label}</span>
        <span>pag. <span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>`,
      margin: {
        top: "16mm",
        bottom: "16mm",
        left: "14mm",
        right: "14mm",
      },
    });
  } finally {
    await browser.close();
  }
}

async function exportOne({ conf, md, outDir, htmlOnly }) {
  const css = await readFile(path.join(ROOT, "export-theme.css"), "utf8");
  const meta = extractMeta(md, conf);
  const bodyHtml = await renderMarkdown(md);
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
  console.log(`export-pdf — PDF ufficiali da markdown contratto

  npm run pdf                 bozza + prospetto → contratto/export/
  npm run pdf -- --bozza
  npm run pdf -- --prospetto
  npm run pdf -- --qa         fixture layout → contratto/export/_qa/
  npm run pdf -- --out DIR
  npm run pdf -- --html-only  solo HTML (debug tipografia)
`);
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

  const results = [];
  for (const job of jobs) {
    process.stdout.write(`→ ${job.conf.id}… `);
    const r = await exportOne({ ...job, htmlOnly: args.htmlOnly });
    console.log(r.pdfPath ? path.relative(ROOT, r.pdfPath) : path.relative(ROOT, r.htmlPath));
    results.push(r);
  }

  console.log(`Fatto (${results.length}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
