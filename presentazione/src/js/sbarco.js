/**
 * Sbarco — chat widget per Progetto Barca
 *
 * Carica su ogni pagina. Parla con il Cloudflare Worker via POST /api/chat.
 * Zero dipendenze esterne.
 */

const SBARCO_WORKER = "https://sbarco.tizianocarpentieri.workers.dev";

const VALID_USERS = ["tiziano", "antonio", "peppe"];
const LS_KEY = "barca_user";
const MAX_DAILY = 3;

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
    <button class="sbarco-fab" aria-label="Apri Sbarco" aria-expanded="false" aria-controls="sbarco-panel" title="Parla con Sbarco">
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    </button>
    <section class="sbarco-panel" id="sbarco-panel" role="dialog" aria-label="Chat con Sbarco" aria-modal="false">
      <div class="sbarco-header">
        <span class="sbarco-header__brand"><span class="sbarco-header__title">⚓ Sbarco</span><small>assistente delle bestie</small></span>
        <span class="sbarco-header__counter" title="Messaggi rimanenti oggi">-/-</span>
        <select class="sbarco-header__user" aria-label="Seleziona utente">
          <option value="" disabled>Chi sei?</option>
          <option value="tiziano">Tiziano</option>
          <option value="antonio">Antonio</option>
          <option value="peppe">Peppe</option>
        </select>
        <button class="sbarco-header__close" aria-label="Chiudi">✕</button>
      </div>
      <div class="sbarco-modebar">
        <button type="button" class="sbarco-mode" aria-pressed="false">
          <span class="sbarco-mode__dot"></span>
          Ricerca profonda
        </button>
        <span class="sbarco-mode__hint">Fonti web incrociate</span>
      </div>
      <div class="sbarco-msgs" role="log" aria-live="polite" aria-relevant="additions text"></div>
      <form class="sbarco-input-wrap">
        <textarea rows="1" maxlength="4000" placeholder="Chiedi qualcosa a Sbarco..." aria-label="Messaggio per Sbarco"></textarea>
        <button type="submit">Invia</button>
      </form>
    </section>
  `;
  document.body.appendChild(root);

  const fab = root.querySelector(".sbarco-fab");
  const panel = root.querySelector(".sbarco-panel");
  const closeBtn = root.querySelector(".sbarco-header__close");
  const userSelect = root.querySelector(".sbarco-header__user");
  const counterEl = root.querySelector(".sbarco-header__counter");
  const msgsEl = root.querySelector(".sbarco-msgs");
  const inputEl = root.querySelector(".sbarco-input-wrap textarea");
  const sendBtn = root.querySelector(".sbarco-input-wrap button");
  const inputForm = root.querySelector(".sbarco-input-wrap");
  const modeBtn = root.querySelector(".sbarco-mode");

  let isOpen = false;
  let isSending = false;
  let currentUser = initialUser;
  let remaining = MAX_DAILY;
  let deepMode = false;
  let activeController = null;

  if (currentUser) {
    userSelect.value = currentUser;
    setUser(currentUser);
  } else {
    inputEl.placeholder = "Seleziona chi sei per iniziare";
    syncControls();
  }

  function getMaxDaily(user) {
    return user === "tiziano" ? 10 : MAX_DAILY;
  }

  function updateCounter(rem) {
    remaining = Math.max(0, Number(rem) || 0);
    var max = getMaxDaily(currentUser);
    counterEl.textContent = `${remaining}/${max}`;
    counterEl.className = `sbarco-header__counter ${remaining <= 1 ? "low" : ""}`;
    syncControls();
  }

  function syncControls() {
    const canChat = Boolean(currentUser) && remaining > 0;
    inputEl.disabled = isSending || !canChat;
    modeBtn.disabled = isSending || !canChat;
    userSelect.disabled = isSending;
    sendBtn.disabled = !currentUser || (!isSending && !canChat);
    sendBtn.textContent = isSending ? "Ferma" : "Invia";
    sendBtn.classList.toggle("is-stop", isSending);
    if (!currentUser) inputEl.placeholder = "Seleziona chi sei per iniziare";
    else if (remaining <= 0) inputEl.placeholder = "Limite giornaliero raggiunto";
    else if (deepMode) inputEl.placeholder = "Cosa vuoi verificare con fonti web?";
    else inputEl.placeholder = "Chiedi qualcosa a Sbarco...";
  }

  async function refreshStatus() {
    if (!currentUser) return;
    const requestedUser = currentUser;
    try {
      const resp = await fetch(`${SBARCO_WORKER}/api/status?userId=${encodeURIComponent(requestedUser)}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (currentUser === requestedUser && data.remaining !== undefined) updateCounter(data.remaining);
    } catch {}
  }

  // ── Open / close ────────────────────────────────────────────
  fab.addEventListener("click", () => openPanel());
  function openPanel() {
    isOpen = true;
    panel.classList.add("open");
    fab.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("sbarco-lock");
    fab.style.opacity = "0";
    fab.style.pointerEvents = "none";
    setTimeout(() => {
      if (!inputEl.disabled) inputEl.focus();
    }, 180);
  }
  function closePanel() {
    isOpen = false;
    panel.classList.remove("open");
    fab.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("sbarco-lock");
    fab.style.opacity = "1";
    fab.style.pointerEvents = "auto";
  }
  closeBtn.addEventListener("click", closePanel);

  // ── User switch ─────────────────────────────────────────────
  userSelect.addEventListener("change", () => {
    const v = userSelect.value;
    if (VALID_USERS.includes(v)) {
      setUser(v);
    }
  });

  function setUser(v) {
    currentUser = v;
    localStorage.setItem(LS_KEY, v);
    msgsEl.innerHTML = "";
    remaining = getMaxDaily(v);
    updateCounter(remaining);
    greet();
    void refreshStatus();
  }

  modeBtn.addEventListener("click", () => {
    if (isSending) return;
    deepMode = !deepMode;
    modeBtn.setAttribute("aria-pressed", String(deepMode));
    modeBtn.classList.toggle("is-active", deepMode);
    syncControls();
    inputEl.focus();
  });

  function greet() {
    if (!currentUser) return;
    addMsg("sbarco", `Ciao ${capitalize(currentUser)}! Pronto per la caccia? ⚓`);
  }

  // ── Send ────────────────────────────────────────────────────
  inputForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isSending) stopCurrentRequest();
    else void send();
  });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isSending) void send();
    }
  });
  inputEl.addEventListener("input", autoSizeInput);

  function autoSizeInput() {
    inputEl.style.height = "auto";
    inputEl.style.height = `${Math.min(inputEl.scrollHeight, 112)}px`;
  }

  function stopCurrentRequest() {
    if (!activeController) return;
    activeController.abort("user-cancelled");
  }

  async function send() {
    const text = inputEl.value.trim();
    if (!text || isSending || !currentUser) return;
    isSending = true;
    activeController = new AbortController();
    inputEl.value = "";
    autoSizeInput();
    syncControls();

    addMsg("user", text, currentUser);
    const progress = addProgress(deepMode
      ? "Sbarco cala le reti per la ricerca profonda…"
      : "Sbarco consulta la wiki delle Bestie…");
    let responseStarted = false;
    const timeout = setTimeout(() => activeController?.abort("client-timeout"), 240_000);

    try {
      const resp = await fetch(`${SBARCO_WORKER}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser, question: text, mode: deepMode ? "deep" : "auto" }),
        signal: activeController.signal,
      });

      if (!resp.ok) {
        if (resp.status === 429) updateCounter(0);
        const err = await resp.json().catch(() => ({}));
        progress.fail(err.error || "Sbarco ha un problema. Riprova.");
        return;
      }

      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/event-stream")) {
        const result = await handleStream(resp, progress);
        responseStarted = result.responseStarted;
      } else {
        const data = await resp.json();
        if (data.remaining !== undefined) updateCounter(data.remaining);
        progress.remove();
        addMsg("sbarco", data.response);
        responseStarted = true;
        if (data.documents && data.documents.length > 0) {
          for (const doc of data.documents) addDocumentMsg(doc);
        }
      }
    } catch (err) {
      if (err.name === "AbortError" || activeController?.signal.aborted) {
        progress.fail(activeController?.signal.reason === "client-timeout"
          ? "Tempo massimo raggiunto. Riprova con una domanda piu' mirata."
          : "Ricerca fermata.");
      } else {
        progress.fail("Non riesco a contattare Sbarco. Controlla la connessione.");
      }
    } finally {
      clearTimeout(timeout);
      if (!responseStarted && !progress.isVisible()) progress.remove();
      isSending = false;
      activeController = null;
      syncControls();
      if (!inputEl.disabled) inputEl.focus();
    }
  }

  async function handleStream(resp, progress) {
    var msgDiv = null;
    var bodyEl = null;
    var fullText = "";
    var reader = resp.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";

    var receivedDone = false;
    var receivedError = false;

    while (true) {
      var result = await reader.read();
      if (result.done) break;

      buffer += decoder.decode(result.value, { stream: true });
      var lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.startsWith("data: ")) continue;

        try {
          var data = JSON.parse(line.slice(6));
          if (data.ping) {
            progress.pulse();
            continue;
          }
          if (data.status) {
            progress.update(data.status.label, data.status.detail, data.status.round, data.status.maxRounds);
          }
          if (data.token) {
            fullText += data.token;
            if (!msgDiv) {
              progress.remove();
              msgDiv = document.createElement("div");
              msgDiv.className = "sbarco-msg sbarco-msg--sbarco";
              bodyEl = document.createElement("div");
              bodyEl.className = "sbarco-msg__body";
              msgDiv.appendChild(bodyEl);
              msgsEl.appendChild(msgDiv);
            }
            bodyEl.innerHTML = renderMarkdown(fullText);
            msgsEl.scrollTop = msgsEl.scrollHeight;
          }
          if (data.documents) {
            for (var d = 0; d < data.documents.length; d++) {
              addDocumentMsg(data.documents[d]);
            }
          }
          if (data.error) {
            receivedError = true;
            if (msgDiv) addMsg("sbarco", data.error);
            else progress.fail(data.error);
          }
          if (data.done) {
            receivedDone = true;
            if (data.remaining !== undefined) updateCounter(data.remaining);
          }
        } catch (e) {}
      }
    }

    if (!fullText && !receivedError) {
      progress.fail(receivedDone
        ? "La ricerca e' terminata senza testo. Riprova: questo caso verra' registrato in /debug."
        : "La connessione si e' chiusa prima della risposta.");
    } else if (fullText) {
      progress.remove();
    }
    return { responseStarted: Boolean(fullText) };
  }

  // ── UI helpers ──────────────────────────────────────────────
  function addProgress(initialLabel) {
    const waitingLines = [
      "Sbarco sta pensando…",
      "Sbarco consulta la wiki delle Bestie…",
      "Sbarco incrocia prezzi, motori e possibili fregature…",
      "Sbarco controlla che nessuno stia comprando un pedalò…",
      "Sbarco misura due volte prima di consigliare…",
    ];
    const div = document.createElement("div");
    div.className = "sbarco-progress";
    div.setAttribute("role", "status");
    div.setAttribute("aria-live", "polite");
    div.setAttribute("aria-atomic", "true");
    div.innerHTML = `
      <span class="sbarco-progress__icon" aria-hidden="true"></span>
      <span class="sbarco-progress__copy">
        <strong>${escapeHtml(initialLabel)}</strong>
        <small>Resto collegato mentre lavoro</small>
      </span>
      <span class="sbarco-progress__step"></span>
    `;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    const labelEl = div.querySelector("strong");
    const detailEl = div.querySelector("small");
    const stepEl = div.querySelector(".sbarco-progress__step");
    let waitingIndex = 0;
    let lastServerUpdate = Date.now();
    let failed = false;

    return {
      update(label, detail, round, maxRounds) {
        if (!div.isConnected) return;
        lastServerUpdate = Date.now();
        labelEl.textContent = label || initialLabel;
        detailEl.textContent = detail || "Resto collegato mentre lavoro";
        stepEl.textContent = round && maxRounds ? `${round}/${maxRounds}` : "";
        msgsEl.scrollTop = msgsEl.scrollHeight;
      },
      pulse() {
        if (!div.isConnected || failed || Date.now() - lastServerUpdate < 6500) return;
        labelEl.textContent = waitingLines[waitingIndex++ % waitingLines.length];
        detailEl.textContent = "La ciurma e' collegata · puoi fermarmi quando vuoi";
        div.classList.remove("is-pulsing");
        requestAnimationFrame(() => div.classList.add("is-pulsing"));
        lastServerUpdate = Date.now();
      },
      fail(message) {
        if (!div.isConnected) {
          addMsg("sbarco", message);
          return;
        }
        failed = true;
        div.classList.add("is-error");
        labelEl.textContent = message;
        detailEl.textContent = "Puoi riprovare o rendere la domanda piu' specifica.";
        stepEl.textContent = "";
      },
      remove() { if (div.isConnected) div.remove(); },
      isVisible() { return div.isConnected; },
    };
  }

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
    let html = String(text || "");
    // Escape HTML first
    html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic: *text* (but not **)
    html = html.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "<em>$1</em>");
    // Inline code: `text`
    html = html.replace(/`([^`\n]+?)`/g, "<code>$1</code>");
    // Markdown links. Only explicit http(s) targets become clickable.
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
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

  function escapeHtml(str) {
    return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function addDocumentMsg(doc) {
    const div = document.createElement("div");
    div.className = "sbarco-msg sbarco-msg--sbarco";
    const body = document.createElement("div");
    body.className = "sbarco-msg__body";
    body.innerHTML = '<strong>Documento salvato: ' + escapeHtml(doc.title) + '</strong><br>'
      + '<button class="sbarco-doc-btn">Scarica .md</button> '
      + '<button class="sbarco-doc-btn sbarco-doc-btn--txt">Scarica .txt</button>';
    div.appendChild(body);
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;

    const btns = body.querySelectorAll(".sbarco-doc-btn");
    btns.forEach(function(btn) {
      btn.addEventListener("click", function() {
        var isTxt = btn.classList.contains("sbarco-doc-btn--txt");
        var ext = isTxt ? "txt" : "md";
        var cleanContent = isTxt
          ? doc.content.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
          : doc.content;
        var blob = new Blob([cleanContent], { type: "text/plain;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = doc.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() + "." + ext;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    });
  }
})();
