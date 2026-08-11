import { jsPDF } from "jspdf";

const COLORS = {
  ink: [24, 33, 38],
  muted: [96, 105, 108],
  accent: [188, 119, 35],
  accentSoft: [248, 239, 224],
  sea: [27, 70, 73],
  line: [222, 218, 209],
  paper: [253, 251, 247],
};

const PDF_SYMBOL_REPLACEMENTS = [
  [/[✅☑✔]/gu, "OK"],
  [/[❌✖]/gu, "NO"],
  [/⚠/gu, "ATTENZIONE"],
  [/🟢/gu, "OK"],
  [/🟡/gu, "ATTENZIONE"],
  [/🔴/gu, "RISCHIO"],
  [/🎯/gu, "OBIETTIVO"],
  [/[💡📌]/gu, "NOTA"],
  [/[🔎🔍]/gu, "VERIFICA"],
  [/[⚓⛵🚤🛥]/gu, ""],
  [/[⬜◻]/gu, "DA VERIFICARE"],
];

export function normalizePdfText(value = "") {
  let text = String(value).normalize("NFKC");
  for (const [symbol, replacement] of PDF_SYMBOL_REPLACEMENTS) {
    text = text.replace(symbol, replacement);
  }
  return text
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[→⇒]/g, "->")
    .replace(/[←⇐]/g, "<-")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/≈/g, "~")
    .replace(/≠/g, "!=")
    .replace(/€/g, "euro")
    .replace(/×/g, "x")
    .replace(/÷/g, "/")
    .replace(/[“”„«»]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/…/g, "...")
    .replace(/[•◦▪]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, "")
    .replace(/[\u200d\ufe0e\ufe0f\u20e3\u{1f3fb}-\u{1f3ff}\u{1f1e6}-\u{1f1ff}]/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\*\*|__|~~/g, "")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\b(OK|ATTENZIONE|RISCHIO|NOTA|VERIFICA|OBIETTIVO)\s+\1\b/gi, "$1")
    // I font standard di jsPDF sono WinAnsi: dopo le sostituzioni manteniamo
    // ASCII + Latin-1 (quindi gli accenti italiani) ed escludiamo glifi che
    // altrimenti diventerebbero sequenze illeggibili nel PDF.
    .replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\u00ff]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function slugify(value = "documento-sbarco") {
  return normalizePdfText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70) || "documento-sbarco";
}

function parseTable(lines, start) {
  const split = line => line.trim().replace(/^\||\|$/g, "").split("|").map(normalizePdfText);
  const header = split(lines[start]);
  const rows = [];
  let index = start + 2;
  while (index < lines.length && lines[index].trim().startsWith("|")) rows.push(split(lines[index++]));
  return { header, rows, next: index };
}

function isTableSeparator(line = "") {
  const cells = line.trim().replace(/^\||\|$/g, "").split("|");
  return cells.length > 1 && cells.every(cell => /^\s*:?-{3,}:?\s*$/.test(cell));
}

export function createSbarcoPdf({ title, content, author = "Le Bestie", generatedAt = new Date() }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true, putOnlyUsedFonts: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 20;
  let y = 45;

  const setText = (size = 10, color = COLORS.ink, style = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const drawPageHeader = (cover = false) => {
    doc.setFillColor(...(cover ? COLORS.sea : COLORS.paper));
    doc.rect(0, 0, pageWidth, cover ? 34 : 18, "F");
    doc.setFillColor(...COLORS.accent);
    doc.circle(marginX + 3, cover ? 15 : 9, cover ? 3 : 2, "F");
    setText(cover ? 11 : 8, cover ? [255, 255, 255] : COLORS.sea, "bold");
    doc.text("SBARCO / PROGETTO BARCA", marginX + 10, cover ? 17 : 11);
    if (cover) {
      doc.setDrawColor(...COLORS.accent);
      doc.setLineWidth(0.8);
      doc.line(marginX, 34, pageWidth - marginX, 34);
    }
  };

  const addPage = () => {
    doc.addPage();
    drawPageHeader(false);
    y = 27;
  };

  const ensureSpace = height => {
    if (y + height > bottomLimit) addPage();
  };

  const writeWrapped = (text, { size = 10, color = COLORS.ink, style = "normal", indent = 0, gap = 3.8, after = 2 } = {}) => {
    const clean = normalizePdfText(text);
    if (!clean) return;
    setText(size, color, style);
    const lines = doc.splitTextToSize(clean, contentWidth - indent);
    const height = lines.length * gap;
    ensureSpace(height + after);
    setText(size, color, style);
    doc.text(lines, marginX + indent, y);
    y += height + after;
  };

  const drawTable = table => {
    const columnCount = Math.max(1, Math.min(5, table.header.length));
    const widths = Array.from({ length: columnCount }, () => contentWidth / columnCount);
    const drawRow = (cells, header = false) => {
      const wrapped = widths.map((width, index) => doc.splitTextToSize(normalizePdfText(cells[index] || ""), width - 4));
      const rowHeight = Math.max(8, ...wrapped.map(lines => lines.length * 3.6 + 3));
      ensureSpace(rowHeight + 1);
      if (header) {
        doc.setFillColor(...COLORS.sea);
        doc.rect(marginX, y - 3, contentWidth, rowHeight, "F");
      } else if (Math.round(y) % 2 === 0) {
        doc.setFillColor(...COLORS.accentSoft);
        doc.rect(marginX, y - 3, contentWidth, rowHeight, "F");
      }
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.2);
      let x = marginX;
      wrapped.forEach((lines, index) => {
        doc.rect(x, y - 3, widths[index], rowHeight);
        setText(8.2, header ? [255, 255, 255] : COLORS.ink, header ? "bold" : "normal");
        doc.text(lines, x + 2, y + 1);
        x += widths[index];
      });
      y += rowHeight;
    };
    drawRow(table.header, true);
    table.rows.forEach(row => drawRow(row));
    y += 4;
  };

  drawPageHeader(true);
  setText(24, COLORS.ink, "bold");
  const titleLines = doc.splitTextToSize(normalizePdfText(title || "Documento Sbarco"), contentWidth);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 9 + 3;
  setText(9, COLORS.muted, "normal");
  const date = new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeStyle: "short" }).format(generatedAt);
  doc.text(`Preparato per ${normalizePdfText(author)} - ${date}`, marginX, y);
  y += 10;

  const lines = String(content || "").replace(/\r\n?/g, "\n").split("\n");
  let index = 0;
  while (index < lines.length) {
    const raw = lines[index];
    const line = raw.trim();
    if (!line || /^---$/.test(line)) {
      y += line ? 1 : 2;
      index += 1;
      continue;
    }
    if (/^```/.test(line)) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      const wrapped = doc.splitTextToSize(normalizePdfText(code.join("\n")), contentWidth - 8);
      const height = Math.max(12, wrapped.length * 3.7 + 6);
      ensureSpace(height + 3);
      doc.setFillColor(239, 237, 232);
      doc.roundedRect(marginX, y - 4, contentWidth, height, 2, 2, "F");
      setText(8, COLORS.ink, "normal");
      doc.text(wrapped, marginX + 4, y + 1);
      y += height + 3;
      continue;
    }
    if (line.startsWith("|") && isTableSeparator(lines[index + 1])) {
      const table = parseTable(lines, index);
      drawTable(table);
      index = table.next;
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const size = level === 1 ? 17 : level === 2 ? 13 : 11;
      ensureSpace(size / 2 + 8);
      if (level <= 2) {
        doc.setDrawColor(...COLORS.accent);
        doc.setLineWidth(1.1);
        doc.line(marginX, y - 5, marginX, y + 1);
      }
      writeWrapped(heading[2], { size, color: level === 1 ? COLORS.sea : COLORS.ink, style: "bold", indent: level <= 2 ? 4 : 0, gap: size * 0.38, after: 4 });
      index += 1;
      continue;
    }
    const bullet = line.match(/^[-*+]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || ordered) {
      const label = ordered ? `${line.match(/^\d+/)[0]}.` : "-";
      ensureSpace(7);
      setText(10, COLORS.accent, "bold");
      doc.text(label, marginX + 1, y);
      writeWrapped((bullet || ordered)[1], { indent: 8, gap: 4, after: 1.5 });
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) quote.push(lines[index++].trim().replace(/^>\s?/, ""));
      const wrapped = doc.splitTextToSize(normalizePdfText(quote.join(" ")), contentWidth - 12);
      const height = wrapped.length * 4 + 6;
      ensureSpace(height + 3);
      doc.setFillColor(...COLORS.accentSoft);
      doc.roundedRect(marginX, y - 4, contentWidth, height, 2, 2, "F");
      doc.setFillColor(...COLORS.accent);
      doc.rect(marginX, y - 4, 2, height, "F");
      setText(9.5, COLORS.ink, "italic");
      doc.text(wrapped, marginX + 6, y + 1);
      y += height + 3;
      continue;
    }
    writeWrapped(line, { gap: 4.2, after: 2.5 });
    index += 1;
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
    setText(8, COLORS.muted, "normal");
    doc.text("Sbarco - Progetto Barca / Le Bestie", marginX, pageHeight - 9);
    doc.text(`${page} / ${totalPages}`, pageWidth - marginX, pageHeight - 9, { align: "right" });
  }
  doc.setProperties({
    title: normalizePdfText(title || "Documento Sbarco"),
    subject: "Progetto Barca - analisi Sbarco",
    author: "Sbarco / Le Bestie",
    creator: "Sbarco 2.2",
  });
  return doc;
}

export function downloadSbarcoPdf(options) {
  const doc = createSbarcoPdf(options);
  doc.save(`${slugify(options.title)}.pdf`);
}
