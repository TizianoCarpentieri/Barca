#!/usr/bin/env node
/**
 * Guida A4 stampabile - accesso al mare, corridoi e punti di varo.
 * La gerarchia grafica separa fatti ufficiali, piste da verificare e regole operative.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(
  await readFile(path.join(ROOT, "dati", "punti-varo-lazio.json"), "utf8")
);

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function phoneHtml(value) {
  if (!value) return `<span class="muted">da acquisire</span>`;
  const href = String(value).replace(/[^\d+]/g, "");
  return `<a href="tel:${esc(href)}">${esc(value)}</a>`;
}

const decisions = data.decision.map((item, i) => `
  <article class="decision">
    <span class="num">${i + 1}</span>
    <div><h3>${esc(item.q)}</h3><p>${esc(item.a)}</p></div>
  </article>`).join("");

const glossary = data.glossary.map((item) => `
  <div class="gloss-item"><dt>${esc(item.term)}</dt><dd>${esc(item.def)}</dd></div>`).join("");

const concessions = data.homeZone.knownNauticalConcessions.map((item, i) => `
  <article class="candidate">
    <div class="candidate-top">
      <span class="candidate-id">${String(i + 1).padStart(2, "0")}</span>
      <div><h3>${esc(item.name)}</h3><p class="place">${esc(item.area)} · ${esc(item.type)} · fronte ${esc(item.front)}</p></div>
      <span class="pill fact">Censito</span>
    </div>
    <div class="candidate-grid">
      <p><b>Contatto / sede</b>${esc(item.contact)}</p>
      <p><b>Prova documentale</b>${esc(item.evidence)}</p>
    </div>
    <p class="ask"><b>Da chiedere:</b> ${esc(item.ask)}</p>
  </article>`).join("");

const calls = data.homeZone.callQuestions.map((item, i) => `
  <li><span>${i + 1}</span>${esc(item)}</li>`).join("");

const corridorChecks = data.homeZone.fieldChecklist.map((item) => `<li>${esc(item)}</li>`).join("");

const officialContacts = data.homeZone.contacts
  .filter((item) => item.phone && !item.who.includes("Emergenza"))
  .map((item) => `
    <tr><td><b>${esc(item.who)}</b><br><span>${esc(item.note)}</span></td><td>${phoneHtml(item.phone)}</td></tr>`)
  .join("");

const sourceStatus = (p) => {
  if (p.status === "ufficiale") return ["official", "Struttura ufficiale; servizio specifico da chiedere"];
  if (p.status === "verificato-parziale") return ["partial", "Posizione da fonte community; chiamare l'autorità/gestore"];
  if (p.status === "da-chiamare") return ["partial", "Contatto disponibile; accesso e tariffa non confermati"];
  return ["lead", "Lead community; non usarlo senza conferma aggiornata"];
};

const infraRows = data.infra.map((p) => {
  const [klass, label] = sourceStatus(p);
  return `<tr>
    <td class="idx">${String(p.n).padStart(2, "0")}</td>
    <td><b>${esc(p.name)}</b><br><span>${esc(p.comune)} · ${esc(p.layer)}</span></td>
    <td><span class="status ${klass}">${esc(label)}</span><br><small>${esc(p.source)}</small></td>
    <td>${esc(p.price)}<br><small>${esc(p.parking || "Parcheggio da verificare")}</small></td>
    <td>${phoneHtml(p.phone)}</td>
  </tr>`;
}).join("");

const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<title>${esc(data.title)} - ${esc(data.subtitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=IBM+Plex+Mono:wght@500&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root {
  --navy:#082f45; --sea:#0e5773; --sky:#dcecf1; --foam:#f3f8f9;
  --orange:#c85825; --sand:#f4efe3; --green:#187256; --amber:#9a6b0b;
  --red:#932e46; --ink:#102334; --soft:#4f6271; --line:#d6dce0; --white:#fff;
}
*{box-sizing:border-box} html,body{margin:0;padding:0;background:#fff;color:var(--ink);font:9pt/1.32 "Source Sans 3",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4;margin:10mm 10mm 13mm}
.page{page-break-after:always;break-after:page;position:relative}
.page:last-child{page-break-after:auto;break-after:auto}
.top{display:flex;align-items:center;justify-content:space-between;border-bottom:1.5pt solid var(--sea);padding-bottom:5pt;margin-bottom:9pt}
.eyebrow{font-size:6.8pt;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--sea)}
.edition{font:500 6.6pt "IBM Plex Mono",monospace;color:var(--orange);border:1px solid var(--orange);padding:2pt 5pt}
h1,h2,h3{font-family:Fraunces,Georgia,serif;color:var(--navy)}
h1{font-size:25pt;line-height:1;margin:0 0 4pt;letter-spacing:-.025em}
h2{font-size:15pt;line-height:1.08;margin:0 0 7pt}
h3{font-size:9.5pt;line-height:1.15;margin:0 0 2pt}
p{margin:0 0 4pt}.subtitle{font:600 11pt/1.2 Fraunces,Georgia,serif;color:var(--orange);margin-bottom:8pt}
.meta{display:flex;gap:12pt;flex-wrap:wrap;color:var(--soft);font-size:7.4pt;margin-bottom:9pt}.meta b{color:var(--ink)}
.hero{background:linear-gradient(135deg,var(--navy),var(--sea));color:#fff;padding:12pt 13pt;margin-bottom:9pt;display:grid;grid-template-columns:1fr auto;gap:10pt;align-items:center}
.hero h2{color:#fff;font-size:17pt;margin-bottom:4pt}.hero p{font-size:8.7pt;color:#e4f0f3;max-width:470pt}.hero .stamp{width:54pt;height:54pt;border:1.2pt solid rgba(255,255,255,.65);border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;font:700 7pt/1.2 "Source Sans 3";text-transform:uppercase;letter-spacing:.07em}
.routes{display:grid;grid-template-columns:repeat(3,1fr);gap:7pt;margin:0 0 10pt}
.route{border:1px solid var(--line);padding:8pt;background:#fff;min-height:76pt}.route strong{display:block;color:var(--sea);font:700 7pt "IBM Plex Mono",monospace;margin-bottom:3pt}.route h3{font-size:11pt}.route p{font-size:7.8pt;color:var(--soft)}.route.good{border-top:4pt solid var(--green)}.route.call{border-top:4pt solid var(--amber)}.route.backup{border-top:4pt solid var(--orange)}
.section-title{display:flex;justify-content:space-between;align-items:end;border-bottom:1pt solid var(--line);padding-bottom:3pt;margin:0 0 7pt}.section-title h2{margin:0}.section-title span{font-size:6.6pt;text-transform:uppercase;letter-spacing:.1em;color:var(--soft);font-weight:700}
.decision-grid{display:grid;grid-template-columns:1fr 1fr;gap:6pt;margin-bottom:8pt}.decision{display:grid;grid-template-columns:18pt 1fr;gap:6pt;border:1px solid var(--line);padding:7pt;background:var(--foam);break-inside:avoid}.decision .num{width:17pt;height:17pt;background:var(--navy);color:white;display:flex;align-items:center;justify-content:center;font:500 8pt "IBM Plex Mono"}.decision p{font-size:7.7pt;color:var(--soft)}
.stop{background:#fff0f2;border-left:4pt solid var(--red);padding:7pt 9pt;color:#5f3440;font-size:8.2pt}.stop b{color:var(--red)}
.legend{display:flex;gap:5pt;flex-wrap:wrap}.pill,.status{display:inline-block;font-size:6.2pt;font-weight:700;text-transform:uppercase;letter-spacing:.045em;padding:2pt 5pt}.fact,.official{background:#dbf0e8;color:var(--green)}.partial{background:#fff1cd;color:var(--amber)}.lead{background:#f5e7df;color:var(--orange)}
.intro-grid{display:grid;grid-template-columns:1.45fr .75fr;gap:8pt;margin-bottom:8pt}.info{border:1px solid var(--line);padding:8pt;background:#fff}.info.highlight{background:var(--sand);border-color:#ddcfb4}.info p{font-size:7.8pt;color:var(--soft)}
.candidate-list{display:grid;grid-template-columns:1fr 1fr;gap:7pt;margin-bottom:8pt}.candidate{border:1px solid var(--line);padding:7pt;background:#fff;break-inside:avoid}.candidate-top{display:grid;grid-template-columns:24pt 1fr auto;gap:6pt;align-items:start}.candidate-id{font:500 14pt "IBM Plex Mono";color:var(--sea)}.candidate .place{font-size:6.8pt;color:var(--soft)}.candidate-grid{display:grid;grid-template-columns:1fr 1fr;gap:6pt;margin:5pt 0}.candidate-grid p{font-size:7.2pt;color:var(--soft)}.candidate-grid b{display:block;text-transform:uppercase;letter-spacing:.06em;font-size:6pt;color:var(--ink);margin-bottom:1pt}.candidate .ask{background:var(--sand);padding:4pt 5pt;font-size:7.1pt;color:var(--ink)}
.bottom-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:8pt}.call-list{list-style:none;margin:0;padding:0;counter-reset:x}.call-list li{display:grid;grid-template-columns:16pt 1fr;gap:5pt;margin-bottom:4pt;font-size:7.5pt;color:var(--soft)}.call-list span{width:15pt;height:15pt;border-radius:50%;background:var(--orange);color:#fff;display:flex;align-items:center;justify-content:center;font-size:6.5pt;font-weight:700}
table.contacts{width:100%;border-collapse:collapse;font-size:7.1pt}table.contacts td{border-bottom:1px solid var(--line);padding:4pt;vertical-align:top}table.contacts td:last-child{width:34%;font-family:"IBM Plex Mono"}table.contacts span{color:var(--soft);font-size:6.4pt}a{color:var(--sea);font-weight:700;text-decoration:none}.muted{color:var(--soft)}
.steps{display:grid;grid-template-columns:repeat(6,1fr);gap:4pt;margin-bottom:9pt}.step{position:relative;background:var(--navy);color:#fff;padding:7pt 6pt;min-height:70pt}.step:not(:last-child):after{content:"";position:absolute;right:-4pt;top:28pt;border-left:5pt solid var(--orange);border-top:5pt solid transparent;border-bottom:5pt solid transparent;z-index:2}.step b{display:block;font:500 7pt "IBM Plex Mono";color:#9dd3df;margin-bottom:4pt}.step strong{display:block;font-size:7.8pt;margin-bottom:2pt}.step span{font-size:6.7pt;color:#d9e8ed}
.how-grid{display:grid;grid-template-columns:1.04fr .96fr;gap:8pt;margin-bottom:8pt}.diagram{background:linear-gradient(#dceff4 0 39%,#ead9a8 39% 57%,#83b7c5 57%);min-height:188pt;position:relative;overflow:hidden;border:1px solid #bed2d8}.diagram .land{position:absolute;top:8pt;left:9pt;width:43%;font-size:7pt;color:var(--soft)}.diagram .five{position:absolute;top:86pt;left:0;right:0;border-top:1.2pt dashed var(--red);color:var(--red);font-size:6pt;padding:2pt 5pt}.corridor{position:absolute;left:45%;top:105pt;width:26%;height:80pt;border-left:2pt solid #e7ad28;border-right:2pt solid #e7ad28;background:rgba(255,255,255,.17);transform:perspective(100px) rotateX(4deg)}.corridor:before,.corridor:after{content:"";position:absolute;top:-3pt;width:6pt;height:6pt;border-radius:50%;background:#fff;border:2pt solid #e7ad28}.corridor:before{left:-4pt}.corridor:after{right:-4pt}.boat{position:absolute;left:54%;top:137pt;color:#fff;font-size:18pt;transform:rotate(90deg)}.diagram .label{position:absolute;left:72%;top:119pt;width:25%;font-size:6.5pt;color:#fff}.diagram .sign{position:absolute;left:44%;top:72pt;background:#fff;border:1px solid var(--navy);padding:3pt;font-size:5.5pt;font-weight:700;color:var(--navy)}
.check-panel{border:1px solid var(--line);padding:8pt}.check-panel ol{margin:0;padding-left:16pt;color:var(--soft);font-size:7.6pt}.check-panel li{margin-bottom:4pt}.check-panel .season{margin-top:7pt;background:#fff1cd;color:#6a530e;padding:5pt;font-size:7pt}
.gloss{display:grid;grid-template-columns:repeat(3,1fr);gap:5pt}.gloss-item{border-top:2pt solid var(--sea);background:var(--foam);padding:6pt}.gloss-item dt{font:700 8pt Fraunces,Georgia,serif;color:var(--navy)}.gloss-item dd{margin:2pt 0 0;color:var(--soft);font-size:6.8pt}
.backup-table{width:100%;border-collapse:collapse;font-size:6.7pt;margin-bottom:8pt}.backup-table th{background:var(--navy);color:#fff;text-align:left;padding:4pt}.backup-table td{border:1px solid var(--line);padding:4pt;vertical-align:top}.backup-table tbody tr:nth-child(even){background:var(--foam)}.backup-table .idx{font:500 7pt "IBM Plex Mono";color:var(--sea)}.backup-table td:nth-child(1){width:4%}.backup-table td:nth-child(2){width:21%}.backup-table td:nth-child(3){width:29%}.backup-table td:nth-child(4){width:31%}.backup-table td:nth-child(5){width:15%}.backup-table small{font-size:5.8pt;color:var(--soft)}
.sources{display:grid;grid-template-columns:1fr 1fr;gap:7pt;margin-top:7pt}.source-box{border:1px solid var(--line);padding:7pt}.source-box h3{font-size:8.5pt}.source-box ul{margin:3pt 0 0;padding-left:13pt;color:var(--soft);font-size:6.5pt}.source-box li{margin-bottom:2pt}
.footer-note{border-top:1px solid var(--line);margin-top:7pt;padding-top:4pt;font-size:6.2pt;color:var(--soft)}
@media print{.candidate,.decision,.route,.info,.source-box{break-inside:avoid}}
</style>
</head>
<body>

<section class="page">
  <div class="top"><span class="eyebrow">Le Bestie · guida operativa</span><span class="edition">REV ${esc(data.updated)}</span></div>
  <h1>${esc(data.title)}</h1>
  <p class="subtitle">${esc(data.subtitle)}</p>
  <div class="meta"><span><b>Base</b> ${esc(data.base)}</span><span><b>Mezzo</b> gommone smontabile + fuoribordo</span><span><b>Obiettivo</b> scegliere il punto prima di caricare l'auto</span></div>
  <div class="hero">
    <div><h2>La risposta breve</h2><p>A Tor San Lorenzo non risulta uno scivolo comunale unico pubblicizzato. Ma non siete senza opzioni: ci sono <b>4 concessioni nautiche locali censite</b> da verificare e, in stagione, corridoi autorizzati che possono essere utilizzati solo quando sono davvero allestiti.</p></div>
    <div class="stamp">Prima<br>chiama<br>poi parti</div>
  </div>
  <div class="routes">
    <article class="route good"><strong>VIA A</strong><h3>Corridoio confermato</h3><p>Per il gommone smontabile è la via più semplice: scarico lecito, trasporto a mano, montaggio e transito nel corridoio al minimo, max 3 nodi.</p></article>
    <article class="route call"><strong>VIA B</strong><h3>Punto di ormeggio locale</h3><p>Chiamare i quattro candidati Ardea. Chiedere accesso giornaliero, corridoio, carrellino, costo, orari e parcheggio.</p></article>
    <article class="route backup"><strong>VIA C</strong><h3>Scivolo / porto di backup</h3><p>Se la zona casa non è confermata: Anzio o altra infrastruttura, ma soltanto dopo telefonata. Le vecchie schede community non bastano.</p></article>
  </div>
  <div class="section-title"><h2>Regole decisionali</h2><span>senza scorciatoie</span></div>
  <div class="decision-grid">${decisions}</div>
  <div class="stop"><b>Correzione importante.</b> “Porto il gommone a remi fino a 250 m e poi accendo” non è una soluzione affidabile: davanti alle aree destinate alla balneazione, partenza e atterraggio dell'unità a motore o a vela sono ammessi esclusivamente nei corridoi.</div>
  <p class="footer-note">Regola base: Capitaneria di porto di Roma, ordinanza 66/2025, artt. 14-16 · stagione Ardea 2026: 16 maggio-20 settembre, servizi di balneazione 09:00-19:00.</p>
</section>

<section class="page">
  <div class="top"><span class="eyebrow">Zona casa · cosa sappiamo davvero</span><span class="edition">TOR SAN LORENZO / ARDEA</span></div>
  <div class="section-title"><h2>Quattro piste locali concrete</h2><div class="legend"><span class="pill fact">censito ≠ accesso garantito</span></div></div>
  <div class="intro-grid">
    <div class="info highlight"><h3>Il dato nuovo che mancava</h3><p>L'elenco comunale delle concessioni al 31/12/2025 e la ricognizione PUA 2026 censiscono destinazioni <b>PO - punto di ormeggio</b>. Sono più solide di un pin anonimo, ma vanno ancora trasformate in informazione operativa con una telefonata.</p></div>
    <div class="info"><h3>Non confondere</h3><p>Il PUA prevede anche nuovi punti futuri. Nel documento compaiono solo i quattro già censiti; le previsioni non sono trattate come punti operativi.</p></div>
  </div>
  <div class="candidate-list">${concessions}</div>
  <div class="bottom-grid">
    <div class="info"><h3>Copione telefonico - 90 secondi</h3><ol class="call-list">${calls}</ol></div>
    <div class="info"><h3>Contatti istituzionali utili</h3><table class="contacts">${officialContacts}</table><p style="margin-top:5pt;font-size:6.7pt;color:var(--soft)"><b>Ordine consigliato:</b> Demanio Ardea → Circolo Nautico Tor San Lorenzo → altri PO → piano B Anzio.</p></div>
  </div>
  <div class="stop" style="margin-top:8pt"><b>“Uso pubblico” riguarda il corridoio in acqua.</b> Non significa che si possa attraversare gratuitamente una concessione con gommone, attrezzatura o auto. Accesso a terra e servizi vanno concordati.</div>
</section>

<section class="page">
  <div class="top"><span class="eyebrow">Procedura · dal parcheggio alla navigazione</span><span class="edition">GOMMONE SMONTABILE</span></div>
  <div class="section-title"><h2>Sequenza corretta</h2><span>il punto si sceglie prima</span></div>
  <div class="steps">
    <div class="step"><b>01</b><strong>Conferma</strong><span>Gestore/Comune: accesso, corridoio, orari, costo.</span></div>
    <div class="step"><b>02</b><strong>Scarica</strong><span>Solo dove sosta e scarico sono consentiti; niente auto in arenile.</span></div>
    <div class="step"><b>03</b><strong>Trasporta</strong><span>A mano o carrellino sul percorso concordato.</span></div>
    <div class="step"><b>04</b><strong>Monta</strong><span>Fuori dalla fascia di 5 m della battigia destinata al transito.</span></div>
    <div class="step"><b>05</b><strong>Controlla</strong><span>Cartello, boe, bandiere, tracciato libero e mare.</span></div>
    <div class="step"><b>06</b><strong>Transita</strong><span>Rotta diretta/perpendicolare, minimo e max 3 nodi; mai ormeggiare.</span></div>
  </div>
  <div class="how-grid">
    <div class="diagram">
      <div class="land"><b>TERRA</b><br>Scarico e montaggio solo in area consentita. Il corridoio in acqua non autorizza l'auto sulla sabbia.</div>
      <div class="five">FASCIA 5 m DALLA BATTIGIA · LASCIARE LIBERA PER IL TRANSITO</div>
      <div class="sign">CORRIDOIO<br>UNITÀ A VELA O MOTORE<br>DIVIETO DI BALNEAZIONE</div>
      <div class="corridor"></div><div class="boat">▲</div>
      <div class="label"><b>MARE</b><br>15-20 m di larghezza · gavitelli gialli/arancio · fino a 250 m · bandiere bianche esterne.</div>
    </div>
    <div class="check-panel"><h3>È davvero un corridoio?</h3><ol>${corridorChecks}</ol><div class="season"><b>Fuori stagione:</b> i gavitelli vengono rimossi. Non dedurre che “senza bagnini vale tutto”: verificare ordinanza, divieti locali, accesso terrestre e sicurezza del punto.</div></div>
  </div>
  <div class="section-title"><h2>Vocabolario minimo</h2><span>le parole cambiano la procedura</span></div>
  <dl class="gloss">${glossary}</dl>
  <div class="stop" style="margin-top:8pt"><b>Pomezia, Fosso della Crocetta:</b> il punto di approdo n. 3 è riservato a vela con deriva mobile e natanti privi di motore. Non è il punto per il gommone Bestie con fuoribordo. Anche i passaggi a mare numerati sono accessi pedonali, non corridoi.</div>
</section>

<section class="page">
  <div class="top"><span class="eyebrow">Piano B · alternative e grado di certezza</span><span class="edition">NON È UNA MAPPA UFFICIALE</span></div>
  <div class="section-title"><h2>Lead di scivoli, porti e cantieri</h2><div class="legend"><span class="status official">ufficiale</span><span class="status partial">parziale</span><span class="status lead">community</span></div></div>
  <p style="font-size:7.6pt;color:var(--soft);margin-bottom:7pt">Questa tabella serve per sapere <b>chi verificare</b>, non per partire senza chiamare. Tariffe e agibilità delle schede community possono essere vecchie; “gratis” è riportato come indicazione storica, non come promessa per il 2026.</p>
  <table class="backup-table">
    <thead><tr><th>#</th><th>Punto</th><th>Affidabilità per oggi</th><th>Indicazione disponibile</th><th>Contatto</th></tr></thead>
    <tbody>${infraRows}</tbody>
  </table>
  <div class="stop"><b>Priorità pratica.</b> Per il gruppo, la prima ricerca non è Fiumicino-Circeo: è chiudere una coppia di punti locali verificati (uno primario + uno di backup) con accesso, costo, parcheggio e orari scritti.</div>
  <div class="sources">
    <div class="source-box"><h3>Fonti ufficiali - regole</h3><ul><li>Capitaneria Roma, ord. 66/2025, artt. 14-16 (raw/normativa/cp-roma-66-2025.pdf).</li><li>Comune di Ardea, ord. sindacale 58/2026, artt. 10-11.</li><li>Comune di Pomezia, ord. balneare 2026, artt. 10-12.</li><li>raw/normativa/corridoi-lancio-ardea-pomezia-2026-08-12.md.</li></ul></div>
    <div class="source-box"><h3>Fonti ufficiali - punti locali</h3><ul><li>Ardea, elenco concessioni demaniali al 31/12/2025.</li><li>Ardea, PUA-VAS, Sintesi non tecnica, prot. 5288/2026.</li><li>Ufficio Demanio Marittimo Ardea, pagina contatti aggiornata 26/02/2026.</li><li>raw/normativa/punti-ormeggio-ardea-2025-2026-2026-08-12.md.</li></ul></div>
  </div>
  <p class="footer-note">Documento vivo ad uso interno · non è consulenza legale · aggiornare il JSON dopo ogni telefonata/sopralluogo con data, nome dell'interlocutore e foto del corridoio. Build: node export-pdf.mjs --mappa.</p>
</section>

</body></html>`;

const outDir = path.join(ROOT, "export");
await mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, "mappa-punti-varo-lazio.html");
await writeFile(outPath, html, "utf8");
console.log("OK", path.relative(ROOT, outPath));
