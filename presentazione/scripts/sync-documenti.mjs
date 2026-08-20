import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const today = "2026-08-20";

function stripExistingFrontmatter(text) {
  return String(text).replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
}

function wikiPage({ title, type, tags, sources, body, extra = "" }) {
  return `---
title: ${title}
type: ${type}
updated: ${today}
status: draft
tags: [${tags}]
sources: [${sources}]
---

${extra}

${body.trim()}
`;
}

function publicPage(banner, body) {
  const clean = String(body)
    .replace(/\[\[([^\]|#/]+\/)?([^\]|#]+)(?:[|#][^\]]+)?\]\]/g, "$2")
    .trim();
  return `${banner.trim()}\n\n${clean}\n`;
}

function cell(value) {
  return String(value ?? "—").replace(/\|/g, "/").replace(/\n/g, " ");
}

function buildVaroMarkdown(data) {
  const lines = [];
  lines.push(`# ${data.title}`);
  lines.push("");
  lines.push(`**${data.subtitle}**`);
  lines.push("");
  lines.push(`Aggiornato ${data.updated} · Base ${data.base} · Ambito ${data.scope}.`);
  lines.push("");
  lines.push(data.disclaimer);
  lines.push("");
  lines.push("## Decisioni rapide");
  lines.push("");
  for (const item of data.decision || []) {
    lines.push(`### ${item.q}`);
    lines.push("");
    lines.push(item.a);
    lines.push("");
  }
  lines.push("## Glossario");
  lines.push("");
  lines.push("| Termine | Significato |");
  lines.push("|---|---|");
  for (const item of data.glossary || []) {
    lines.push(`| **${cell(item.term)}** | ${cell(item.def)} |`);
  }
  const home = data.homeZone || {};
  lines.push("");
  lines.push(`## ${home.title || "Zona casa"}`);
  lines.push("");
  if (home.why) lines.push(home.why);
  lines.push("");
  if (home.law) lines.push(`Quadro: ${home.law}`);
  lines.push("");
  lines.push("### Contatti");
  lines.push("");
  lines.push("| Chi | Tel | Nota |");
  lines.push("|---|---|---|");
  for (const item of home.contacts || []) {
    lines.push(`| ${cell(item.who)} | ${cell(item.phone)} | ${cell(item.note)} |`);
  }
  lines.push("");
  lines.push("### Checklist corridoio");
  lines.push("");
  for (const item of home.fieldChecklist || []) lines.push(`- [ ] ${item}`);
  lines.push("");
  lines.push("### Quattro PO Ardea da chiamare");
  lines.push("");
  lines.push("| Nome | Area | Fronte | Contatto | Certainty |");
  lines.push("|---|---|---|---|---|");
  for (const item of home.knownNauticalConcessions || []) {
    lines.push(`| ${cell(item.name)} | ${cell(item.area)} | ${cell(item.front)} | ${cell(item.contact)} | ${cell(item.certainty)} |`);
  }
  lines.push("");
  lines.push("Domande al telefono:");
  lines.push("");
  for (const q of home.callQuestions || []) lines.push(`- ${q}`);
  lines.push("");
  lines.push("### Punti nominati (non sono tutti scivoli)");
  lines.push("");
  for (const item of home.namedPoints || []) {
    lines.push(`#### ${item.name}`);
    lines.push("");
    lines.push(`Motore: **${cell(item.motor)}** · Accesso: ${cell(item.access)} · ${cell(item.price)}`);
    lines.push("");
    lines.push(item.detail);
    lines.push("");
    lines.push(`Azione: ${item.action}`);
    lines.push("");
  }
  lines.push("## Infrastrutture litorale");
  lines.push("");
  lines.push("| # | Punto | Comune | Tipo | Motore | Accesso | Prezzo | Tel | Fit |");
  lines.push("|---:|---|---|---|---|---|---|---|---|");
  for (const item of data.infra || []) {
    lines.push(`| ${item.n} | ${cell(item.name)} | ${cell(item.comune)} | ${cell(item.layer)} | ${cell(item.motor)} | ${cell(item.access)} | ${cell(item.price)} | ${cell(item.phone || item.phoneNote)} | ${cell(item.fit)} |`);
  }
  lines.push("");
  lines.push("Note sui singoli punti:");
  lines.push("");
  for (const item of data.infra || []) {
    lines.push(`- **${item.name}** (${item.status}): ${item.notes} Fonte: ${item.source}.`);
  }
  lines.push("");
  lines.push("## Collegamenti");
  lines.push("");
  lines.push("- Digest operativo: [[normativa/varo-litorale-lazio]]");
  lines.push("- Patto: [[documenti/patto]]");
  lines.push("- Costi: [[documenti/costi]]");
  return lines.join("\n");
}

const BANNER_PATTO = `> **Bozza ipotetica tra soci, non firmata.** Precisione da contratto, natura da accordo tra amici. Prevale sempre la legge.
>
> Impianto **riutilizzabile**: gommone, scafo rigido o vela. Si cambia l'oggetto (il Bene), restano quote 1/N, danni, calendario, ospiti, recesso.
>
> Fonte di verità: \`contratto/bozza-patto-v1.md\`.`;

const BANNER_COSTI = `> **Prospetto operativo** di obblighi, documenti e costi a norma. Non sostituisce legge, ordinanze, polizza o manuale.
>
> Vale come tabella di riferimento anche se il mezzo fosse un gommone, uno scafo rigido o una barca a vela: cambiano le voci condizionali, non il metodo (cancelli pre-acquisto, RC, dotazioni, TCO).
>
> Fonte di verità: \`contratto/prospetto-costi-a-norma.md\`.`;

const BANNER_VARO = `> **Guida punti di lancio / varo** sul litorale laziale. Confermare a telefono prima di ogni uscita.
>
> Le regole sui corridoi valgono per unità a **motore o vela**. I PO e gli scivoli restano la pista concreta da Ardea/Pomezia.
>
> Fonte: \`contratto/dati/punti-varo-lazio.json\`.`;

const pattoSrc = await readFile(path.join(root, "contratto/bozza-patto-v1.md"), "utf8");
const costiSrc = await readFile(path.join(root, "contratto/prospetto-costi-a-norma.md"), "utf8");
const varoJson = JSON.parse(await readFile(path.join(root, "contratto/dati/punti-varo-lazio.json"), "utf8"));
const varoBody = buildVaroMarkdown(varoJson);

const wikiDir = path.join(root, "wiki/documenti");
const publicDir = path.join(root, "presentazione/public/documenti");
await mkdir(wikiDir, { recursive: true });
await mkdir(publicDir, { recursive: true });

await writeFile(
  path.join(wikiDir, "patto.md"),
  wikiPage({
    title: "Patto Bestie — bozza integrale",
    type: "sintesi",
    tags: "patto, bozza, soci, split",
    sources: "contratto/bozza-patto-v1.md",
    extra: BANNER_PATTO,
    body: stripExistingFrontmatter(pattoSrc),
  }),
);
await writeFile(
  path.join(wikiDir, "costi.md"),
  wikiPage({
    title: "Prospetto costi a norma — testo integrale",
    type: "sintesi",
    tags: "costi, RC, dotazioni, normativa",
    sources: "contratto/prospetto-costi-a-norma.md",
    extra: BANNER_COSTI,
    body: stripExistingFrontmatter(costiSrc),
  }),
);
await writeFile(
  path.join(wikiDir, "varo.md"),
  wikiPage({
    title: "Punti di lancio — litorale laziale",
    type: "normativa",
    tags: "varo, corridoio, scivolo, Ardea",
    sources: "contratto/dati/punti-varo-lazio.json",
    extra: BANNER_VARO,
    body: varoBody,
  }),
);

await writeFile(path.join(publicDir, "patto.md"), publicPage(BANNER_PATTO, stripExistingFrontmatter(pattoSrc)));
await writeFile(path.join(publicDir, "costi.md"), publicPage(BANNER_COSTI, stripExistingFrontmatter(costiSrc)));
await writeFile(path.join(publicDir, "varo.md"), publicPage(BANNER_VARO, varoBody));

console.log("sync-documenti: wiki/documenti + presentazione/public/documenti");
