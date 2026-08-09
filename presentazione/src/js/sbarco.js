/**
 * Sbarco — chat widget per Progetto Barca
 *
 * Carica su ogni pagina. Parla con il Cloudflare Worker via POST /api/chat.
 * Zero dipendenze esterne.
 */

const SBARCO_WORKER = "https://sbarco.tizianocarpentieri.workers.dev";

const VALID_USERS = ["tiziano", "antonio", "peppe"];
const LS_KEY = "barca_user";

(function () {
  if (document.querySelector(".sbarco-root")) return;

  const params = new URLSearchParams(location.search);
  const urlUser = params.get("user");
  if (urlUser && VALID_USERS.includes(urlUser)) {
    localStorage.setItem(LS_KEY, urlUser);
  }
  const savedUser = localStorage.getItem(LS_KEY);
  const initialUser = VALID_USERS.includes(savedUser) ? savedUser : null;

  // ── DOM ──────────────────────────────────────────────────────
  const root = document.createElement("div");
  root.className = "sbarco-root";
  root.innerHTML = `
    <button class="sbarco-fab" aria-label="Apri Sbarco" title="Parla con Sbarco">
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    </button>
    <div class="sbarco-panel">
      <div class="sbarco-header">
        <span class="sbarco-header__title">⚓ Sbarco</span>
        <select class="sbarco-header__user">
          <option value="">Chi sei?</option>
          <option value="tiziano">Tiziano</option>
          <option value="antonio">Antonio</option>
          <option value="peppe">Peppe</option>
        </select>
        <button class="sbarco-header__close" aria-label="Chiudi">✕</button>
      </div>
      <div class="sbarco-msgs"></div>
      <div class="sbarco-input-wrap">
        <input type="text" placeholder="Chiedi qualcosa a Sbarco..." />
        <button>Invia</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  const fab = root.querySelector(".sbarco-fab");
  const panel = root.querySelector(".sbarco-panel");
  const closeBtn = root.querySelector(".sbarco-header__close");
  const userSelect = root.querySelector(".sbarco-header__user");
  const msgsEl = root.querySelector(".sbarco-msgs");
  const inputEl = root.querySelector(".sbarco-input-wrap input");
  const sendBtn = root.querySelector(".sbarco-input-wrap button");

  let isOpen = false;
  let isSending = false;
  let currentUser = initialUser;

  if (currentUser) {
    userSelect.value = currentUser;
    greet();
  }

  // ── Open / close ────────────────────────────────────────────
  fab.addEventListener("click", () => openPanel());
  function openPanel() {
    isOpen = true;
    panel.classList.add("open");
    fab.style.opacity = "0";
    fab.style.pointerEvents = "none";
  }
  function closePanel() {
    isOpen = false;
    panel.classList.remove("open");
    fab.style.opacity = "1";
    fab.style.pointerEvents = "auto";
  }
  closeBtn.addEventListener("click", closePanel);

  // ── User switch ─────────────────────────────────────────────
  userSelect.addEventListener("change", () => {
    const v = userSelect.value;
    if (VALID_USERS.includes(v)) {
      currentUser = v;
      localStorage.setItem(LS_KEY, v);
      msgsEl.innerHTML = "";
      greet();
    }
  });

  function greet() {
    if (!currentUser) return;
    addMsg("sbarco", `Ciao ${capitalize(currentUser)}! Pronto per la caccia? ⚓`);
  }

  // ── Send ────────────────────────────────────────────────────
  sendBtn.addEventListener("click", send);
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") send();
  });

  async function send() {
    const text = inputEl.value.trim();
    if (!text || isSending || !currentUser) return;
    isSending = true;
    inputEl.value = "";
    sendBtn.disabled = true;
    inputEl.disabled = true;

    addMsg("user", text, currentUser);
    const typingEl = addTyping();

    try {
      const resp = await fetch(`${SBARCO_WORKER}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser, question: text }),
      });

      typingEl.remove();

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        addMsg("sbarco", err.error || "Sbarco ha un problema. Riprova.");
        return;
      }

      const data = await resp.json();
      addMsg("sbarco", data.response);
    } catch (err) {
      typingEl.remove();
      addMsg("sbarco", "Non riesco a contattare Sbarco. Controlla la connessione.");
    } finally {
      isSending = false;
      sendBtn.disabled = false;
      inputEl.disabled = false;
      inputEl.focus();
    }
  }

  // ── UI helpers ──────────────────────────────────────────────
  function addMsg(role, content, who) {
    const div = document.createElement("div");
    div.className = `sbarco-msg sbarco-msg--${role}`;
    if (who) {
      const whoEl = document.createElement("div");
      whoEl.className = "sbarco-msg__who";
      whoEl.textContent = who;
      div.appendChild(whoEl);
    }
    const body = document.createElement("div");
    body.className = "sbarco-msg__body";
    body.innerHTML = renderMarkdown(content);
    div.appendChild(body);
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return div;
  }

  function renderMarkdown(text) {
    let html = text;
    // Escape HTML first
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic: *text* (but not **)
    html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "<em>$1</em>");
    // Inline code: `text`
    html = html.replace(/`([^`\n]+?)`/g, "<code>$1</code>");
    // Line breaks
    html = html.replace(/\n/g, "<br>");
    // List items: - text or * text (at start of line)
    html = html.replace(/(?:^|<br>)[*-] (.+?)(?=<br>|$)/g, "<li>$1</li>");
    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li>.*?<\/li>)+)/g, "<ul>$1</ul>");
    // Simple tables: detect | col | col | pattern
    if (html.includes("|")) {
      html = html.replace(/((?:<br>\|.*\|)+)/g, function(match) {
        const rows = match.split("<br>").filter(r => r.trim());
        let table = "<table>";
        let isHeader = true;
        for (const row of rows) {
          const cells = row.split("|").filter(c => c.trim());
          if (cells.length < 2) continue;
          // Skip separator rows like |---|---|
          if (cells.every(c => /^[-:]+$/.test(c.trim()))) { isHeader = false; continue; }
          const tag = isHeader ? "th" : "td";
          table += "<tr>" + cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join("") + "</tr>";
          isHeader = false;
        }
        table += "</table>";
        return table;
      });
    }
    return html;
  }

  function addTyping() {
    const div = document.createElement("div");
    div.className = "sbarco-typing";
    div.innerHTML = "Sbarco scrive<span>.</span><span>.</span><span>.</span>";
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return div;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
})();
