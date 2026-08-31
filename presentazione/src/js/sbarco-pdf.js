import { jsPDF } from "jspdf";

const THEMES = {
  nautico: {
    ink: [24, 33, 38],
    muted: [96, 105, 108],
    accent: [188, 119, 35],
    accentSoft: [248, 239, 224],
    sea: [27, 70, 73],
    line: [222, 218, 209],
    paper: [253, 251, 247],
  },
  cantiere: {
    ink: [23, 36, 45],
    muted: [84, 104, 116],
    accent: [224, 103, 42],
    accentSoft: [246, 238, 229],
    sea: [40, 79, 96],
    line: [201, 216, 223],
    paper: [247, 250, 251],
  },
  minimal: {
    ink: [28, 30, 31],
    muted: [101, 102, 99],
    accent: [143, 101, 43],
    accentSoft: [244, 242, 236],
    sea: [50, 54, 55],
    line: [218, 217, 212],
    paper: [253, 253, 251],
  },
};
const COLORS = THEMES.nautico; // compatibilita' interna del renderer legacy, eliminato dal bundle via tree-shaking

function hexToRgb(value) {
  const match = String(value || "").match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  return [0, 2, 4].map(offset => parseInt(match[1].slice(offset, offset + 2), 16));
}

function widestMarkdownTable(content = "") {
  const lines = String(content).replace(/\r\n?/g, "\n").split("\n");
  let widest = 0;
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (lines[index].trim().startsWith("|") && isTableSeparator(lines[index + 1])) {
      widest = Math.max(widest, lines[index].trim().replace(/^\||\|$/g, "").split("|").length);
    }
  }
  return widest;
}

export function resolvePdfPresentation(content = "", presentation = {}) {
  const themeName = Object.hasOwn(THEMES, presentation?.theme) ? presentation.theme : "nautico";
  const orientation = ["portrait", "landscape"].includes(presentation?.orientation)
    ? presentation.orientation
    : widestMarkdownTable(content) >= 5 ? "landscape" : "portrait";
  const accent = hexToRgb(presentation?.accent) || THEMES[themeName].accent;
  return {
    theme: themeName,
    orientation,
    density: presentation?.density === "compact" ? "compact" : "comfortable",
    cover: presentation?.cover !== false,
    subtitle: normalizePdfText(presentation?.subtitle || "").slice(0, 140),
    colors: { ...THEMES[themeName], accent },
  };
}

const PDF_SYMBOL_REPLACEMENTS = [
  [/[✅☑✔]/gu, "OK"],
  [/◐/gu, "PARZIALE"],
  [/✳/gu, "DA CONFERMARE"],
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

function createSbarcoPdfLegacy({ title, content, author = "Le Bestie", generatedAt = new Date() }) {
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

export function createSbarcoPdf({ title, content, author = "Le Bestie", generatedAt = new Date(), presentation = {} }) {
  const settings = resolvePdfPresentation(content, presentation);
  const COLORS = settings.colors;
  const compact = settings.density === "compact";
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: settings.orientation,
    compress: true,
    putOnlyUsedFonts: true,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = settings.orientation === "landscape" ? 17 : 18;
  const contentWidth = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 19;
  const bodyGap = compact ? 3.7 : 4.2;
  let y = settings.cover ? 49 : 28;

  const setText = (size = 10, color = COLORS.ink, style = "normal") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const drawWake = () => {
    doc.setDrawColor(...COLORS.accent);
    doc.setLineWidth(0.45);
    const startX = pageWidth - Math.min(82, pageWidth * 0.34);
    const startY = 10;
    for (let strand = 0; strand < 3; strand += 1) {
      if (doc.GState && doc.setGState) doc.setGState(new doc.GState({ opacity: 0.32 - strand * 0.07 }));
      doc.lines([
        [12, 1.5 + strand * 1.7],
        [15, 4.5 - strand * 0.6],
        [18, -2.5 + strand * 0.5],
        [21, 5.5 - strand * 0.8],
      ], startX, startY + strand * 5, [1, 1], "S", false);
    }
    if (doc.GState && doc.setGState) doc.setGState(new doc.GState({ opacity: 1 }));
  };

  const drawPageHeader = (cover = false) => {
    doc.setFillColor(...(cover ? COLORS.sea : COLORS.paper));
    doc.rect(0, 0, pageWidth, cover ? 37 : 18, "F");
    doc.setFillColor(...COLORS.accent);
    doc.circle(marginX + 3, cover ? 15 : 9, cover ? 3 : 2, "F");
    setText(cover ? 11 : 8, cover ? [255, 255, 255] : COLORS.sea, "bold");
    doc.text("SBARCO / QUADERNO DI BORDO", marginX + 10, cover ? 17 : 11);
    if (cover) {
      drawWake();
      doc.setDrawColor(...COLORS.accent);
      doc.setLineWidth(0.8);
      doc.line(marginX, 37, pageWidth - marginX, 37);
    } else {
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.25);
      doc.line(marginX, 18, pageWidth - marginX, 18);
    }
  };

  const addPage = () => {
    doc.addPage();
    drawPageHeader(false);
    y = 27;
  };

  const ensureSpace = height => {
    if (y + height <= bottomLimit) return false;
    addPage();
    return true;
  };

  const writeWrapped = (text, {
    size = 10,
    color = COLORS.ink,
    style = "normal",
    indent = 0,
    gap = bodyGap,
    after = compact ? 1.5 : 2.4,
  } = {}) => {
    const clean = normalizePdfText(text);
    if (!clean) return;
    setText(size, color, style);
    const wrapped = doc.splitTextToSize(clean, contentWidth - indent);
    let cursor = 0;
    while (cursor < wrapped.length) {
      let available = Math.floor((bottomLimit - y) / gap);
      if (available < 1) {
        addPage();
        available = Math.floor((bottomLimit - y) / gap);
      }
      const chunk = wrapped.slice(cursor, cursor + available);
      setText(size, color, style);
      doc.text(chunk, marginX + indent, y);
      y += chunk.length * gap;
      cursor += chunk.length;
      if (cursor < wrapped.length) addPage();
    }
    y += after;
  };

  const tableWidths = table => {
    const columns = Math.max(1, table.header.length);
    const weights = Array.from({ length: columns }, (_, index) => {
      const samples = [table.header[index], ...table.rows.slice(0, 18).map(row => row[index])]
        .map(value => normalizePdfText(value || ""));
      const longest = Math.max(4, ...samples.map(value => Math.min(46, value.length)));
      const numeric = samples.filter(Boolean).every(value => /^[-+]?\d[\d., %/]*$/.test(value));
      return Math.max(numeric ? 0.6 : 0.9, Math.sqrt(longest));
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const minimum = columns >= 6 ? 20 : 24;
    let widths = weights.map(weight => Math.max(minimum, contentWidth * weight / total));
    const used = widths.reduce((sum, width) => sum + width, 0);
    widths = widths.map(width => width * contentWidth / used);
    return widths;
  };

  const drawTable = table => {
    const widths = tableWidths(table);
    const columns = widths.length;
    const fontSize = columns >= 6 ? 6.8 : columns >= 5 ? 7.3 : 8.2;
    const lineHeight = columns >= 6 ? 2.9 : 3.35;

    const wrapCells = cells => widths.map((width, index) =>
      doc.splitTextToSize(normalizePdfText(cells[index] || ""), Math.max(8, width - 4))
    );

    const paintSegment = (chunks, { header = false, rowIndex = 0, continued = false } = {}) => {
      const rowHeight = Math.max(7, ...chunks.map(lines => lines.length * lineHeight + 3));
      if (header) doc.setFillColor(...COLORS.sea);
      else if (rowIndex % 2 === 0) doc.setFillColor(...COLORS.accentSoft);
      else doc.setFillColor(...COLORS.paper);
      doc.rect(marginX, y - 3, contentWidth, rowHeight, "F");
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.18);
      let x = marginX;
      chunks.forEach((cellLines, index) => {
        doc.rect(x, y - 3, widths[index], rowHeight);
        setText(fontSize, header ? [255, 255, 255] : COLORS.ink, header ? "bold" : "normal");
        doc.text(cellLines, x + 2, y + 1);
        x += widths[index];
      });
      if (continued) {
        setText(6.4, COLORS.muted, "italic");
        doc.text("continua", pageWidth - marginX - 2, y + rowHeight - 1.4, { align: "right" });
      }
      y += rowHeight;
    };

    const headerLines = wrapCells(table.header);
    const drawHeader = () => {
      const height = Math.max(7, ...headerLines.map(lines => lines.length * lineHeight + 3));
      if (ensureSpace(height + 1)) {}
      paintSegment(headerLines, { header: true });
    };

    drawHeader();
    table.rows.forEach((row, rowIndex) => {
      const remaining = wrapCells(row);
      let firstSegment = true;
      while (remaining.some(lines => lines.length > 0)) {
        let maxLines = Math.floor((bottomLimit - y - 4) / lineHeight);
        if (maxLines < 2) {
          addPage();
          drawHeader();
          maxLines = Math.floor((bottomLimit - y - 4) / lineHeight);
        }
        maxLines = Math.max(1, Math.min(maxLines, 22));
        const chunks = remaining.map(lines => lines.splice(0, maxLines));
        const continued = remaining.some(lines => lines.length > 0);
        paintSegment(chunks, { rowIndex, continued: continued || !firstSegment });
        firstSegment = false;
        if (continued) {
          addPage();
          drawHeader();
        }
      }
    });
    y += compact ? 3 : 4;
  };

  drawPageHeader(settings.cover);
  if (settings.cover) {
    setText(7.5, COLORS.accent, "bold");
    doc.text(`${settings.theme.toUpperCase()} / ${settings.orientation.toUpperCase()}`, marginX, y - 2);
    setText(settings.orientation === "landscape" ? 22 : 24, COLORS.ink, "bold");
    const titleLines = doc.splitTextToSize(normalizePdfText(title || "Documento Sbarco"), contentWidth * 0.88);
    doc.text(titleLines, marginX, y + 7);
    y += titleLines.length * 9 + 11;
    if (settings.subtitle) writeWrapped(settings.subtitle, { size: 11, color: COLORS.sea, style: "normal", gap: 4.7, after: 5 });
    setText(8.5, COLORS.muted, "normal");
    const date = new Intl.DateTimeFormat("it-IT", { dateStyle: "long", timeStyle: "short" }).format(generatedAt);
    doc.text(`Preparato per ${normalizePdfText(author)} / ${date}`, marginX, y);
    y += compact ? 8 : 11;
  }

  const lines = String(content || "").replace(/\r\n?/g, "\n").split("\n");
  let index = 0;
  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line) {
      y += compact ? 1 : 2;
      index += 1;
      continue;
    }
    if (/^---$/.test(line)) {
      ensureSpace(6);
      doc.setDrawColor(...COLORS.line);
      doc.setLineWidth(0.3);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 5;
      index += 1;
      continue;
    }
    if (/^```/.test(line)) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      const wrapped = doc.splitTextToSize(normalizePdfText(code.join("\n")), contentWidth - 8);
      const height = Math.min(bottomLimit - 27, Math.max(12, wrapped.length * 3.5 + 6));
      ensureSpace(height + 3);
      doc.setFillColor(...COLORS.accentSoft);
      doc.roundedRect(marginX, y - 4, contentWidth, height, 1.5, 1.5, "F");
      setText(7.8, COLORS.ink, "normal");
      doc.text(wrapped.slice(0, Math.floor((height - 5) / 3.5)), marginX + 4, y + 1);
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
      writeWrapped(heading[2], {
        size,
        color: level === 1 ? COLORS.sea : COLORS.ink,
        style: "bold",
        indent: level <= 2 ? 4 : 0,
        gap: size * 0.38,
        after: compact ? 2.8 : 4,
      });
      index += 1;
      continue;
    }
    const bullet = line.match(/^[-*+]\s+(?:\[[ xX]\]\s*)?(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || ordered) {
      const label = ordered ? `${line.match(/^\d+/)[0]}.` : line.match(/^[-*+]\s+\[x\]/i) ? "OK" : "-";
      ensureSpace(7);
      setText(label === "OK" ? 7.2 : 10, COLORS.accent, "bold");
      doc.text(label, marginX + 1, y);
      writeWrapped((bullet || ordered)[1], { indent: 9, after: compact ? 0.8 : 1.5 });
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) quote.push(lines[index++].trim().replace(/^>\s?/, ""));
      const wrapped = doc.splitTextToSize(normalizePdfText(quote.join(" ")), contentWidth - 12);
      const height = wrapped.length * 4 + 7;
      ensureSpace(height + 3);
      doc.setFillColor(...COLORS.accentSoft);
      doc.roundedRect(marginX, y - 4, contentWidth, height, 1.5, 1.5, "F");
      doc.setFillColor(...COLORS.accent);
      doc.rect(marginX, y - 4, 2, height, "F");
      setText(9.3, COLORS.ink, "italic");
      doc.text(wrapped, marginX + 6, y + 1);
      y += height + 3;
      continue;
    }
    writeWrapped(line);
    index += 1;
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.line);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
    setText(7.8, COLORS.muted, "normal");
    doc.text("Sbarco / Progetto Barca / Le Bestie", marginX, pageHeight - 9);
    doc.text(`${page} / ${totalPages}`, pageWidth - marginX, pageHeight - 9, { align: "right" });
  }
  doc.setProperties({
    title: normalizePdfText(title || "Documento Sbarco"),
    subject: `Progetto Barca - ${settings.theme}`,
    author: "Sbarco / Le Bestie",
    creator: "Sbarco 3.0",
  });
  return doc;
}

export function downloadSbarcoPdf(options) {
  const doc = createSbarcoPdf(options);
  doc.save(`${slugify(options.title)}.pdf`);
}
