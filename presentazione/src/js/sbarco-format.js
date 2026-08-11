export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function safeHttpUrl(value = "") {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function renderInline(value = "") {
  const tokens = [];
  const stash = html => {
    const token = `@@SBARCO_TOKEN_${tokens.length}@@`;
    tokens.push({ token, html });
    return token;
  };

  let source = String(value);
  source = source.replace(/`([^`\n]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`));
  source = source.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, href) => {
    const safe = safeHttpUrl(href);
    return safe
      ? stash(`<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`)
      : match;
  });
  source = source.replace(/https?:\/\/[^\s<>()]+/g, match => {
    const trailing = match.match(/[.,;:!?]+$/)?.[0] || "";
    const clean = trailing ? match.slice(0, -trailing.length) : match;
    const safe = safeHttpUrl(clean);
    return safe
      ? `${stash(`<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(clean)}</a>`)}${trailing}`
      : match;
  });

  let html = escapeHtml(source)
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
  for (const item of tokens) html = html.replace(item.token, item.html);
  return html;
}

function isTableSeparator(line = "") {
  const cells = line.trim().replace(/^\||\|$/g, "").split("|");
  return cells.length > 1 && cells.every(cell => /^\s*:?-{3,}:?\s*$/.test(cell));
}

function tableCells(line = "") {
  return line.trim().replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
}

function isBlockStart(lines, index) {
  const line = lines[index] || "";
  const next = lines[index + 1] || "";
  return !line.trim()
    || /^```/.test(line.trim())
    || /^#{1,4}\s+/.test(line)
    || /^>\s?/.test(line)
    || /^\s*([-*+] |\d+[.)] )/.test(line)
    || (line.trim().startsWith("|") && isTableSeparator(next));
}

export function renderMarkdown(value = "") {
  const lines = String(value).replace(/\r\n?/g, "\n").split("\n");
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.trim().match(/^```([^\s]*)/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index].trim())) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      output.push(`<pre><code${fence[1] ? ` data-language="${escapeHtml(fence[1])}"` : ""}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = Math.min(4, heading[1].length + 1);
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (line.trim().startsWith("|") && isTableSeparator(lines[index + 1])) {
      const header = tableCells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) rows.push(tableCells(lines[index++]));
      output.push(`<div class="sbarco-table-wrap"><table><thead><tr>${header.map(cell => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${header.map((_, cellIndex) => `<td>${renderInline(row[cellIndex] || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^>\s?/, ""));
      output.push(`<blockquote>${quote.map(renderInline).join("<br>")}</blockquote>`);
      continue;
    }

    const listMatch = line.match(/^\s*([-*+] |\d+[.)] )(.+)$/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*([-*+] |\d+[.)] )(.+)$/);
        if (!item || /^\d/.test(item[1]) !== ordered) break;
        items.push(item[2]);
        index += 1;
      }
      const tag = ordered ? "ol" : "ul";
      output.push(`<${tag}>${items.map(item => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`);
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && !isBlockStart(lines, index)) paragraph.push(lines[index++].trim());
    output.push(`<p>${paragraph.map(renderInline).join("<br>")}</p>`);
  }

  return output.join("");
}

export function drainSseBuffer(buffer = "", flush = false) {
  const frames = [];
  let rest = String(buffer);
  while (true) {
    const boundary = /\r?\n\r?\n/.exec(rest);
    if (!boundary) break;
    frames.push(rest.slice(0, boundary.index));
    rest = rest.slice(boundary.index + boundary[0].length);
  }
  if (flush && rest.trim()) {
    frames.push(rest);
    rest = "";
  }
  const payloads = frames.map(frame => frame
    .split(/\r?\n/)
    .filter(line => line.startsWith("data:"))
    .map(line => line.slice(5).replace(/^ /, ""))
    .join("\n"))
    .filter(Boolean);
  return { payloads, rest };
}
