import assert from "node:assert/strict";
import test from "node:test";
import { drainSseBuffer, renderMarkdown } from "../src/js/sbarco-format.js";
import { createSbarcoPdf } from "../src/js/sbarco-pdf.js";

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

test("genera un PDF multipagina valido con tabella e fonti", () => {
  const content = `# Analisi bundle

## Conclusione

Il bundle e' coerente con il budget delle Bestie.

| Voce | Valore | Esito |
|---|---:|---|
| Gommone | 900 euro | OK |
| Motore | 750 euro | Da provare |

${"- Controllare documenti, compressione e manutenzione prima dell'acquisto.\n".repeat(90)}

Fonte: https://example.com/scheda`;
  const doc = createSbarcoPdf({ title: "Analisi bundle Argo", content, author: "Peppe", generatedAt: new Date("2026-08-11T10:00:00Z") });
  const bytes = new Uint8Array(doc.output("arraybuffer"));
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), "%PDF");
  assert.ok(doc.getNumberOfPages() >= 2);
  assert.ok(bytes.length > 5_000);
});
