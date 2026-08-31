import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { drainSseBuffer, renderMarkdown } from "../src/js/sbarco-format.js";
import { createSbarcoPdf, normalizePdfText, resolvePdfPresentation } from "../src/js/sbarco-pdf.js";

test("render Markdown con tabelle, hr e checkbox per i documenti", () => {
  const html = renderMarkdown(`# Titolo

---

- [ ] Da fare
- [x] Fatto

| Voce | Euro |
|---|---|
| RC | **120** |
`);
  assert.match(html, /<hr>/);
  assert.match(html, /☐/);
  assert.match(html, /☑/);
  assert.match(html, /sbarco-table-wrap/);
  assert.match(html, /<strong>120<\/strong>/);
});

test("render Markdown strutturato e sicuro per la chat mobile", () => {
  const html = renderMarkdown(`# Titolo

- Uno
- Due

| Voce | Valore |
|---|---|
| Budget | **2.000 euro** |

[Fonte](https://example.com/info?q=1&ok=2)

<img src=x onerror=alert(1)>`);
  assert.match(html, /<h2>Titolo<\/h2>/);
  assert.match(html, /<ul><li>Uno<\/li><li>Due<\/li><\/ul>/);
  assert.match(html, /sbarco-table-wrap/);
  assert.match(html, /<strong>2\.000 euro<\/strong>/);
  assert.match(html, /href="https:\/\/example\.com\/info\?q=1&amp;ok=2"/);
  assert.doesNotMatch(html, /<img\b/i);
  assert.match(html, /&lt;img/);
});

test("parser SSE conserva frame spezzati e finali", () => {
  const first = drainSseBuffer('data: {"token":"A"}\r\n\r\ndata: {"tok');
  assert.deepEqual(first.payloads, ['{"token":"A"}']);
  const second = drainSseBuffer(first.rest + 'en":"B"}\n\ndata: {"done":true}', true);
  assert.deepEqual(second.payloads, ['{"token":"B"}', '{"done":true}']);
});

test("normalizza i simboli da chat senza perdere gli accenti italiani", () => {
  const clean = normalizePdfText("🎯 Qualità ≤ 2.000 € — ✅ ok; ⚠️ verifica; 🚤 prova → 🟢/🔴");
  assert.equal(clean, "OBIETTIVO Qualità <= 2.000 euro - OK; ATTENZIONE verifica; prova -> OK/RISCHIO");
  assert.doesNotMatch(clean, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(clean, /[^\x09\x0a\x0d\x20-\x7e\u00a0-\u00ff]/);
});

test("il PDF sceglie landscape per tabelle larghe e rispetta il tema richiesto", () => {
  const content = "| A | B | C | D | E | F |\n|---|---|---|---|---|---|\n| 1 | 2 | 3 | 4 | 5 | 6 |";
  const presentation = resolvePdfPresentation(content, {
    theme: "cantiere",
    orientation: "auto",
    density: "compact",
    accent: "#D36B2C",
  });
  assert.equal(presentation.orientation, "landscape");
  assert.equal(presentation.theme, "cantiere");
  assert.equal(presentation.density, "compact");
  assert.deepEqual(presentation.colors.accent, [211, 107, 44]);
});

test("offre il PDF solo per i documenti preparati da Sbarco", async () => {
  const source = await readFile(new URL("../src/js/sbarco.js", import.meta.url), "utf8");
  const answerActions = source.slice(source.indexOf("function addAnswerChrome"), source.indexOf("function addProgress"));
  assert.match(answerActions, /Copia/);
  assert.doesNotMatch(answerActions, /Esporta PDF/);
  assert.match(source, /Scarica PDF/);
});

test("rivela i token SSE a cadenza invece di un solo dump DOM", async () => {
  const source = await readFile(new URL("../src/js/sbarco.js", import.meta.url), "utf8");
  assert.match(source, /createStreamReveal/);
  assert.match(source, /is-streaming/);
  assert.doesNotMatch(source, /requestAnimationFrame\(renderAnswer\)/);
});

test("mostra la quota illimitata di Tiziano e cinque utilizzi agli altri", async () => {
  const source = await readFile(new URL("../src/js/sbarco.js", import.meta.url), "utf8");
  assert.match(source, /const MAX_DAILY = 5;/);
  assert.match(source, /counterEl\.textContent = "∞";/);
  assert.match(source, /counterEl\.title = "Utilizzo illimitato";/);
  assert.doesNotMatch(source, /user === "tiziano" \? 10/);
});

test("il widget espone Base e Pro e i compari pagano 2 crediti su Pro", async () => {
  const source = await readFile(new URL("../src/js/sbarco.js", import.meta.url), "utf8");
  assert.match(source, /data-tier="base"/);
  assert.match(source, /data-tier="pro"/);
  assert.match(source, /const PRO_CREDIT_COST = 2;/);
  assert.match(source, /tier: chatTier/);
  assert.match(source, /Pro costa \$\{PRO_CREDIT_COST\} crediti/);
});

test("il tasto modalita non deve andare a capo con etichette lunghe", async () => {
  const source = await readFile(new URL("../src/js/sbarco.js", import.meta.url), "utf8");
  assert.match(source, /strong: "Estesa"/);
  assert.match(source, /strong: "Rapida"/);
  assert.doesNotMatch(source, /Censimenti e multi-localit/);
  const css = await readFile(new URL("../src/styles/sbarco.css", import.meta.url), "utf8");
  assert.match(css, /\.sbarco-mode[\s\S]{0,400}white-space:\s*nowrap/);
  assert.match(css, /\.sbarco-mode__copy small \{ display: none/);
});

test("il ragionamento Pro strema in un blocco ripiegabile separato dalla risposta", async () => {
  const source = await readFile(new URL("../src/js/sbarco.js", import.meta.url), "utf8");
  assert.match(source, /if \(data\.reasoning\)/);
  assert.match(source, /sbarco-reasoning/);
  assert.match(source, /Come ho ragionato/);
  assert.match(source, /reasoningEl\.open = false/);
  assert.match(source, /collapseReasoning/);
  assert.match(source, /reasoningBody\.textContent \+= data\.reasoning/);
  assert.match(source, /meta\.thinking === "on"/);
  const css = await readFile(new URL("../src/styles/sbarco.css", import.meta.url), "utf8");
  assert.match(css, /\.sbarco-reasoning__body/);
  assert.match(css, /sbarco-reasoning-pulse/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /\.sbarco-msgs[\s\S]{0,180}min-height:\s*0/);
});

test("genera un PDF multipagina valido con tabella e fonti", () => {
  const content = `# 🎯 Analisi bundle

## Conclusione

Il bundle è coerente con il budget delle Bestie: **≤ 2.000 €**.

| Voce | Valore | Esito |
|---|---:|---|
| Gommone | 900 euro | ✅ OK |
| Motore | 750 euro | ⚠️ Da provare |

${"- Controllare documenti, compressione e manutenzione prima dell'acquisto.\n".repeat(90)}

Fonte: https://example.com/scheda`;
  const doc = createSbarcoPdf({ title: "Analisi bundle Argo", content, author: "Peppe", generatedAt: new Date("2026-08-11T10:00:00Z") });
  const bytes = new Uint8Array(doc.output("arraybuffer"));
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "%PDF");
  assert.ok(doc.getNumberOfPages() >= 2);
  assert.ok(bytes.length > 5_000);
});
