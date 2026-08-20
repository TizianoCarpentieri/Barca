import assert from "node:assert/strict";
import test from "node:test";
import { createStreamReveal } from "../src/js/sbarco-stream.js";

test("un burst di token non compare tutto al primo push", async () => {
  const paints = [];
  const reveal = createStreamReveal({
    intervalMs: 8,
    onUpdate(text, state) {
      paints.push({ text, streaming: state.streaming });
    },
  });
  const burst = "Le Bestie cercano un gommone sotto i 2000 euro, no patente, pesca laziale. ".repeat(6);
  reveal.push(burst);
  assert.ok(paints.length >= 1);
  assert.ok(paints[0].text.length < burst.length, "il primo paint deve essere un prefisso, non il blocco intero");
  assert.equal(paints[0].streaming, true);
  const final = await reveal.flush();
  assert.equal(final, burst);
  assert.ok(paints.length > 3, "servono piu' frame visibili, non un unico dump");
  assert.equal(paints.at(-1).text, burst);
  assert.equal(paints.at(-1).streaming, false);
});

test("con reduced-motion mostra subito tutto il testo ricevuto", async () => {
  const paints = [];
  const reveal = createStreamReveal({
    reducedMotion: true,
    intervalMs: 8,
    onUpdate(text, state) {
      paints.push({ text, streaming: state.streaming });
    },
  });
  reveal.push("Risposta completa in un colpo.");
  assert.equal(paints[0].text, "Risposta completa in un colpo.");
  const final = await reveal.flush();
  assert.equal(final, "Risposta completa in un colpo.");
});
