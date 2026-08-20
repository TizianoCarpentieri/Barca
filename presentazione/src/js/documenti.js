import { renderMarkdown } from "./sbarco-format.js";

const DOCS = {
  patto: {
    file: "documenti/patto.md",
    label: "Patto",
    stamp: "Bozza",
    title: "Patto tra soci",
    note: "Bozza ipotetica, non firmata. Impianto valido anche per rigida o vela.",
  },
  costi: {
    file: "documenti/costi.md",
    label: "Costi",
    stamp: "A norma",
    title: "Prospetto costi",
    note: "Obblighi, documenti e stime. Non sostituisce legge o polizza.",
  },
  varo: {
    file: "documenti/varo.md",
    label: "Varo",
    stamp: "Lazio",
    title: "Punti di lancio",
    note: "Corridoi e scivoli da confermare a telefono prima di uscire.",
  },
};

const bodyEl = document.getElementById("doc-body");
const stampEl = document.getElementById("doc-stamp");
const noteEl = document.getElementById("doc-note");
const titleEl = document.getElementById("doc-title");
if (!bodyEl) {
  /* not on documenti page */
} else {
  const catsEl = document.getElementById("doc-cats");
  const base = import.meta.env.BASE_URL || "./";

  function currentId() {
    const q = new URLSearchParams(location.search).get("doc");
    return q && DOCS[q] ? q : "patto";
  }

  function syncTabs(id) {
    catsEl?.querySelectorAll("[data-doc]").forEach((el) => {
      const on = el.getAttribute("data-doc") === id;
      el.classList.toggle("is-on", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
  }

  async function load(id) {
    const doc = DOCS[id];
    syncTabs(id);
    if (stampEl) stampEl.textContent = doc.stamp;
    if (titleEl) titleEl.textContent = doc.title;
    if (noteEl) noteEl.textContent = doc.note;
    bodyEl.innerHTML = "<p class='ads-meta__note'>Caricamento…</p>";
    const urls = [`${base}${doc.file}`, `./${doc.file}`, doc.file];
    let text = "";
    let lastError = "";
    for (const url of urls) {
      try {
        const resp = await fetch(url, { cache: "no-store" });
        if (!resp.ok) {
          lastError = `${resp.status}`;
          continue;
        }
        text = await resp.text();
        break;
      } catch (err) {
        lastError = err.message || String(err);
      }
    }
    if (!text) {
      bodyEl.innerHTML = `<p class="ads-error">Documento non disponibile (${lastError || "rete"}).</p>`;
      return;
    }
    bodyEl.innerHTML = renderMarkdown(text);
    bodyEl.querySelectorAll(".sbarco-table-wrap").forEach((el) => el.classList.add("doc-table-wrap"));
  }

  catsEl?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-doc]");
    if (!btn || !catsEl.contains(btn)) return;
    const id = btn.getAttribute("data-doc");
    if (!id || !DOCS[id]) return;
    const url = new URL(location.href);
    url.searchParams.set("doc", id);
    history.replaceState(null, "", url);
    load(id);
  });

  load(currentId());
}
