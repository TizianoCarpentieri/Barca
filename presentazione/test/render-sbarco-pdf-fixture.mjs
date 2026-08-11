import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createSbarcoPdf } from "../src/js/sbarco-pdf.js";

const outputDir = resolve("..", "tmp", "pdfs");
await mkdir(outputDir, { recursive: true });

const content = `# Verifica pre-acquisto

## Verdetto rapido

Il candidato rientra nel tetto di **2.000 €**, ma va provato in acqua prima di decidere.
Qualità e affidabilità restano da verificare; il prezzo deve essere ≤ 2.000 €.

> I prezzi sono indicativi: verificare documenti, stato del motore e disponibilita' reale.

## Confronto

| Voce | Candidato | Obiettivo | Esito |
|---|---:|---:|---|
| Gommone | 3,60 m | 3,30-3,90 m | OK |
| Motore | 9.9 CV 4T | 9.9-15 CV 4T | OK |
| Prezzo bundle | 1.750 euro | max 2.000 euro | OK |

## Checklist visita

1. Controllare targhetta, matricola e documenti.
2. Cercare toppe, scollaggi, abrasioni e perdite.
3. Avviare il motore a freddo e verificare il getto di raffreddamento.
4. Chiedere prova in acqua e ricevute dei tagliandi.

## Fonti

- Wiki: wiki/sintesi/contesto-sbarco.md
- Scheda tecnica: https://example.com/scheda

## Note operative

${"Il controllo va svolto con calma, fotografando matricole e difetti prima di versare una caparra.\n\n".repeat(18)}`;

const doc = createSbarcoPdf({
  title: "Scheda candidato - bundle Argo 360",
  content,
  author: "Le Bestie",
  generatedAt: new Date("2026-08-11T10:30:00+02:00"),
});
const outputPath = resolve(outputDir, "sbarco-pdf-qa.pdf");
await writeFile(outputPath, Buffer.from(doc.output("arraybuffer")));
console.log(outputPath);
