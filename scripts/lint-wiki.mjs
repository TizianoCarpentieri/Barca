import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), "wiki");
const allowedStatuses = new Set(["active", "draft", "deprecated", "decided"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return entry.isFile() && entry.name.endsWith(".md") ? [absolute] : [];
  }));
  return nested.flat();
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join("/");
}

function frontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

function wikiLinks(text) {
  return [...text.matchAll(/\[\[([^\]]+)\]\]/g)]
    .map(match => match[1].split("|")[0].split("#")[0].trim())
    .filter(Boolean);
}

function resolveLink(source, target, filesByRelative, filesByStem) {
  const normalized = target.replace(/\\/g, "/").replace(/^wiki\//, "").replace(/\.md$/, "");
  const rootCandidate = `${normalized}.md`;
  if (filesByRelative.has(rootCandidate)) return rootCandidate;

  const sourceDir = path.posix.dirname(relative(source));
  const localCandidate = path.posix.normalize(path.posix.join(sourceDir, `${normalized}.md`));
  if (filesByRelative.has(localCandidate)) return localCandidate;

  if (!normalized.includes("/")) {
    const matches = filesByStem.get(normalized) || [];
    if (matches.length === 1) return matches[0];
  }
  return null;
}

const files = await walk(root);
const filesByRelative = new Set(files.map(relative));
const filesByStem = new Map();
for (const file of files) {
  const stem = path.basename(file, ".md");
  filesByStem.set(stem, [...(filesByStem.get(stem) || []), relative(file)]);
}

const errors = [];
const warnings = [];
const contents = new Map();

for (const file of files) {
  const text = await readFile(file, "utf8");
  contents.set(file, text);
  const rel = relative(file);
  const meta = frontmatter(text);
  if (!meta) {
    if (rel !== "log.md") warnings.push(`${rel}: frontmatter assente`);
  } else {
    if (!meta.title) warnings.push(`${rel}: title mancante nel frontmatter`);
    if (!meta.updated || !/^\d{4}-\d{2}-\d{2}$/.test(meta.updated)) warnings.push(`${rel}: updated mancante o non ISO`);
    if (meta.status && !allowedStatuses.has(meta.status)) errors.push(`${rel}: status non valido (${meta.status})`);
  }
  if (/\uFFFD/.test(text)) errors.push(`${rel}: contiene caratteri Unicode sostitutivi`);

  for (const target of wikiLinks(text)) {
    if (!resolveLink(file, target, filesByRelative, filesByStem)) {
      errors.push(`${rel}: wikilink non risolto [[${target}]]`);
    }
  }
}

const indexPath = path.join(root, "index.md");
const indexText = contents.get(indexPath) || "";
const indexed = new Set(
  wikiLinks(indexText)
    .map(target => resolveLink(indexPath, target, filesByRelative, filesByStem))
    .filter(Boolean)
);
for (const rel of [...filesByRelative].sort()) {
  if (["index.md", "log.md"].includes(rel)) continue;
  if (!indexed.has(rel)) errors.push(`index.md: pagina non catalogata ${rel}`);
}

console.log(`Wiki lint: ${files.length} pagine · ${errors.length} errori · ${warnings.length} avvisi`);
for (const error of errors) console.error(`ERROR ${error}`);
for (const warning of warnings) console.warn(`WARN  ${warning}`);
if (errors.length > 0) process.exitCode = 1;
