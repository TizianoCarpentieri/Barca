/**
 * Sbarco — chat widget per Progetto Barca
 *
 * Carica su ogni pagina. Parla con il Cloudflare Worker via POST /api/chat.
 * Zero dipendenze esterne.
 */

import { drainSseBuffer, escapeHtml, renderMarkdown } from "./sbarco-format.js";

const SBARCO_WORKER = "https://sbarco.tizianocarpentieri.workers.dev";

const VALID_USERS = ["tiziano", "antonio", "peppe"];
const LS_KEY = "barca_user";
const MAX_DAILY = 5;

(function () {
  if (document.querySelector(".sbarco-root")) return;

  const params = new URLSearchParams(location.search);
  const urlUser = params.get("user");
  if (urlUser && VALID_USERS.includes(urlUser)) {
    localStorage.setItem(LS_KEY, urlUser);
  }
  const savedUser = localStorage.getItem(LS_KEY);
  // Tiziano deve confermare la passkey: non riapriamo il suo account dal localStorage.
  const initialUser = savedUser && savedUser !== "tiziano" && VALID_USERS.includes(savedUser) ? savedUser : null;

  // ── DOM ──────────────────────────────────────────────────────
  const root = document.createElement("div");
  root.className = "sbarco-root";
  root.innerHTML = `
    <button class="sbarco-fab" aria-label="Apri Sbarco" aria-expanded="false" aria-controls="sbarco-panel" title="Parla con Sbarco">
      <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    </button>
    <section class="sbarco-panel" id="sbarco-panel" role="dialog" aria-label="Chat con Sbarco" aria-modal="true" aria-hidden="true">
      <div class="sbarco-header">
        <span class="sbarco-header__mark" aria-hidden="true">
          <svg viewBox="0 0 32 32"><path d="M16 4v18m-6-12h12M7 18c1 6 5 9 9 9s8-3 9-9c-3 2-6 3-9 3s-6-1-9-3Z"/></svg>
        </span>
        <span class="sbarco-header__brand"><span class="sbarco-header__title">Sbarco</span><small>quartiermastro delle bestie</small></span>
        <span class="sbarco-header__counter" title="Messaggi rimanenti oggi">-/-</span>
        <select class="sbarco-header__user" aria-label="Seleziona utente">
          <option value="" disabled>Chi sei?</option>
          <option value="tiziano">Tiziano</option>
          <option value="antonio">Antonio</option>
          <option value="peppe">Peppe</option>
        </select>
        <button class="sbarco-header__close" aria-label="Chiudi"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
      </div>
      <div class="sbarco-modebar">
        <button type="button" class="sbarco-mode" aria-pressed="false">
          <span class="sbarco-mode__dot"></span>
          <span class="sbarco-mode__copy"><strong>Ricerca profonda</strong><small>Web e fonti incrociate</small></span>
        </button>
        <span class="sbarco-mode__hint">Off = risposta rapida</span>
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
  const modeHint = root.querySelector(".sbarco-mode__hint");

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

  function isUnlimitedUser(user) {
    return user === "tiziano";
  }

  function updateCounter(rem, unlimited = isUnlimitedUser(currentUser)) {
    if (unlimited) {
      remaining = Infinity;
      counterEl.textContent = "∞";
      counterEl.title = "Utilizzo illimitato";
      counterEl.className = "sbarco-header__counter";
      syncControls();
      return;
    }
    remaining = Math.max(0, Number(rem) || 0);
    counterEl.textContent = `${remaining}/${MAX_DAILY}`;
    counterEl.title = `${remaining} utilizzi rimasti oggi su ${MAX_DAILY}`;
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
    modeHint.textContent = deepMode ? "On = più tempo, più verifiche" : "Off = risposta rapida";
    if (!currentUser) inputEl.placeholder = "Seleziona chi sei per iniziare";
    else if (remaining <= 0) inputEl.placeholder = "Limite giornaliero raggiunto";
    else if (deepMode) inputEl.placeholder = "Cosa vuoi verificare con fonti web?";
    else inputEl.placeholder = "Chiedi qualcosa a Sbarco...";
  }

  async function refreshStatus() {
    if (!currentUser) return;
    const requestedUser = currentUser;
    try {
      const headers = requestedUser === "tiziano" ? await getTizianoPasskeyHeaders() : {};
      const resp = await fetch(`${SBARCO_WORKER}/api/status?userId=${encodeURIComponent(requestedUser)}`, { headers });
      if (!resp.ok) return;
      const data = await resp.json();
      if (currentUser === requestedUser && (data.unlimited || data.remaining !== undefined)) {
        updateCounter(data.remaining, data.unlimited);
      }
    } catch {}
  }

  function bytesToBase64Url(bytes) {
    let binary = "";
    for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlToBytes(value) {
    const padded = String(value).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((String(value).length + 3) % 4);
    const binary = atob(padded);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  async function passkeyJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Verifica Galaxy non riuscita.");
    return data;
  }

  async function getTizianoPasskeyHeaders() {
    if (!window.PublicKeyCredential || !navigator.credentials) throw new Error("Apri Sbarco dal Galaxy per usare la passkey di Tiziano.");
    let optionsResp = await fetch(`${SBARCO_WORKER}/api/passkey/challenge?purpose=assert`);
    if (optionsResp.status === 401) {
      const unavailable = await optionsResp.json().catch(() => ({}));
      if (!/non ancora registrato/i.test(unavailable.error || "")) throw new Error(unavailable.error || "Galaxy non autorizzato.");
      const code = window.prompt("Prima attivazione: inserisci il codice ricevuto da Tiziano.");
      if (!code) throw new Error("Attivazione Galaxy annullata.");
      const enrollOptions = await passkeyJson(await fetch(`${SBARCO_WORKER}/api/passkey/challenge?purpose=enroll&code=${encodeURIComponent(code)}`));
      const created = await navigator.credentials.create({ publicKey: {
        ...enrollOptions,
        challenge: base64UrlToBytes(enrollOptions.challenge),
        user: { ...enrollOptions.user, id: base64UrlToBytes(enrollOptions.user.id) },
      } });
      await passkeyJson(await fetch(`${SBARCO_WORKER}/api/passkey/enroll`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientDataJSON: bytesToBase64Url(created.response.clientDataJSON), attestationObject: bytesToBase64Url(created.response.attestationObject) }),
      }));
      optionsResp = await fetch(`${SBARCO_WORKER}/api/passkey/challenge?purpose=assert`);
    }
    const options = await passkeyJson(optionsResp);
    const credential = await navigator.credentials.get({ publicKey: {
      ...options,
      challenge: base64UrlToBytes(options.challenge),
      allowCredentials: options.allowCredentials.map(id => ({ type: "public-key", id: base64UrlToBytes(id) })),
    } });
    const payload = {
      credentialId: bytesToBase64Url(credential.rawId),
      clientDataJSON: bytesToBase64Url(credential.response.clientDataJSON),
      authenticatorData: bytesToBase64Url(credential.response.authenticatorData),
      signature: bytesToBase64Url(credential.response.signature),
    };
    return { "X-Tiziano-Passkey": bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload))) };
  }

  // ── Open / close ────────────────────────────────────────────
  fab.addEventListener("click", () => openPanel());
  const syncVisualViewport = () => {
    const viewport = window.visualViewport;
    root.style.setProperty("--sbarco-viewport-height", `${Math.round(viewport?.height || window.innerHeight)}px`);
  };
  function openPanel() {
    isOpen = true;
    syncVisualViewport();
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    fab.setAttribute("aria-expanded", "true");
    document.documentElement.classList.add("sbarco-lock");
    window.visualViewport?.addEventListener("resize", syncVisualViewport);
    fab.style.opacity = "0";
    fab.style.pointerEvents = "none";
    setTimeout(() => {
      if (!inputEl.disabled) inputEl.focus();
    }, 180);
  }
  function closePanel() {
    isOpen = false;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    fab.setAttribute("aria-expanded", "false");
    document.documentElement.classList.remove("sbarco-lock");
    window.visualViewport?.removeEventListener("resize", syncVisualViewport);
    fab.style.opacity = "1";
    fab.style.pointerEvents = "auto";
  }
  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && isOpen && !isSending) closePanel();
  });

  // ── User switch ─────────────────────────────────────────────
  userSelect.addEventListener("change", () => {
    const v = userSelect.value;
    if (VALID_USERS.includes(v)) {
      void selectUser(v);
    }
  });

  async function selectUser(v) {
    setUser(v);
  }

  function setUser(v) {
    currentUser = v;
    localStorage.setItem(LS_KEY, v);
    msgsEl.innerHTML = "";
    updateCounter(isUnlimitedUser(v) ? null : MAX_DAILY, isUnlimitedUser(v));
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
      const passkeyHeaders = currentUser === "tiziano" ? await getTizianoPasskeyHeaders() : {};
      const resp = await fetch(`${SBARCO_WORKER}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...passkeyHeaders },
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
        addMsg("sbarco", data.response, null, true);
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
    let msgDiv = null;
    let bodyEl = null;
    let fullText = "";
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedDone = false;
    let receivedError = false;
    let answerMeta = null;
    let renderFrame = null;

    const ensureAnswer = () => {
      if (msgDiv) return;
      progress.remove();
      msgDiv = document.createElement("article");
      msgDiv.className = "sbarco-msg sbarco-msg--sbarco";
      bodyEl = document.createElement("div");
      bodyEl.className = "sbarco-msg__body";
      msgDiv.appendChild(bodyEl);
      msgsEl.appendChild(msgDiv);
    };

    const renderAnswer = () => {
      renderFrame = null;
      if (!bodyEl) return;
      const stickToBottom = isNearBottom();
      bodyEl.innerHTML = renderMarkdown(fullText);
      if (stickToBottom) scrollToBottom();
    };

    const scheduleRender = () => {
      if (renderFrame == null) renderFrame = requestAnimationFrame(renderAnswer);
    };

    const consumePayload = payload => {
      try {
        const data = JSON.parse(payload);
        if (data.ping) {
          progress.pulse();
          return;
        }
        if (data.status) progress.update(data.status.label, data.status.detail, data.status.round, data.status.maxRounds);
        if (data.token) {
          fullText += data.token;
          ensureAnswer();
          scheduleRender();
        }
        if (data.documents) data.documents.forEach(addDocumentMsg);
        if (data.meta) answerMeta = data.meta;
        if (data.error) {
          receivedError = true;
          if (msgDiv) addMsg("sbarco", data.error);
          else progress.fail(data.error);
        }
        if (data.done) {
          receivedDone = true;
          if (data.remaining !== undefined) updateCounter(data.remaining);
        }
      } catch {}
    };

    while (true) {
      const result = await reader.read();
      if (result.done) break;
      buffer += decoder.decode(result.value, { stream: true });
      const drained = drainSseBuffer(buffer);
      buffer = drained.rest;
      drained.payloads.forEach(consumePayload);
    }
    buffer += decoder.decode();
    drainSseBuffer(buffer, true).payloads.forEach(consumePayload);
    if (renderFrame != null) cancelAnimationFrame(renderFrame);
    renderAnswer();

    if (!fullText && !receivedError) {
      progress.fail(receivedDone
        ? "La ricerca e' terminata senza testo. Riprova: questo caso verra' registrato in /debug."
        : "La connessione si e' chiusa prima della risposta.");
    } else if (fullText) {
      progress.remove();
      addAnswerChrome(msgDiv, fullText, answerMeta);
    }
    return { responseStarted: Boolean(fullText) };
  }

  // ── UI helpers ──────────────────────────────────────────────
  function isNearBottom() {
    return msgsEl.scrollHeight - msgsEl.scrollTop - msgsEl.clientHeight < 120;
  }

  function scrollToBottom() {
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  async function exportPdf(button, title, content) {
    const previous = button.textContent;
    button.disabled = true;
    button.textContent = "Creo PDF…";
    try {
      const { downloadSbarcoPdf } = await import("./sbarco-pdf.js");
      downloadSbarcoPdf({ title, content, author: capitalize(currentUser || "Le Bestie") });
      button.textContent = "PDF pronto";
      setTimeout(() => { if (button.isConnected) button.textContent = previous; }, 1600);
    } catch {
      button.textContent = "PDF non riuscito";
      setTimeout(() => { if (button.isConnected) button.textContent = previous; }, 2200);
    } finally {
      button.disabled = false;
    }
  }

  function addAnswerChrome(message, content, meta = null) {
    if (!message || message.querySelector(".sbarco-msg__actions")) return;
    if (meta) {
      const info = document.createElement("div");
      info.className = "sbarco-msg__meta";
      const parts = [meta.mode === "deep" ? "Ricerca profonda" : "Risposta rapida"];
      if (meta.sourcesRead) parts.push(`${meta.sourcesRead} fonti lette`);
      if (meta.elapsedMs) parts.push(`${(meta.elapsedMs / 1000).toFixed(1)} s`);
      info.textContent = parts.join(" · ");
      message.appendChild(info);
    }
    const actions = document.createElement("div");
    actions.className = "sbarco-msg__actions";
    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.className = "sbarco-action";
    copyButton.textContent = "Copia";
    copyButton.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(content);
        copyButton.textContent = "Copiato";
        setTimeout(() => { if (copyButton.isConnected) copyButton.textContent = "Copia"; }, 1400);
      } catch {
        copyButton.textContent = "Non riuscito";
      }
    });
    actions.append(copyButton);
    message.appendChild(actions);
  }

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

  function addMsg(role, content, who, exportable = false) {
    const div = document.createElement("article");
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
    if (exportable && role === "sbarco") addAnswerChrome(div, content);
    scrollToBottom();
    return div;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function addDocumentMsg(doc) {
    const div = document.createElement("article");
    div.className = "sbarco-msg sbarco-msg--sbarco sbarco-document";
    const body = document.createElement("div");
    body.className = "sbarco-msg__body";
    const eyebrow = document.createElement("span");
    eyebrow.className = "sbarco-document__eyebrow";
    eyebrow.textContent = "Documento di bordo";
    const heading = document.createElement("h3");
    heading.textContent = doc.title || "Documento Sbarco";
    const preview = document.createElement("p");
    preview.textContent = String(doc.content || "")
      .replace(/[#*`>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 150) + (String(doc.content || "").length > 150 ? "…" : "");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sbarco-action sbarco-action--primary sbarco-document__button";
    button.textContent = "Scarica PDF";
    button.addEventListener("click", () => exportPdf(button, doc.title || "Documento Sbarco", doc.content || ""));
    body.append(eyebrow, heading, preview, button);
    div.appendChild(body);
    msgsEl.appendChild(div);
    scrollToBottom();
  }
})();
