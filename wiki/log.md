# Log — Progetto Barca

Append-only. Prefisso voci: `## [YYYY-MM-DD] <tipo> | <titolo>`

Tipi: `setup` · `ingest` · `query` · `preferenze` · `lint` · `ricerca` · `decisione`

---

## [2026-08-04] sintesi | Requisiti v1

- Intervista base chiusa. Profilo in `wiki/sintesi/requisiti-v1.md`.
- Intestazione lasciata aperta tra bestie.
- Next: preventivi rimessaggio A/C + caccia annunci con filtri.

## [2026-08-04] preferenze | Timeline affare-driven

- Acquisto quando esce l’affare giusto (orizzonte anche 6–12 mesi).

## [2026-08-04] preferenze | Cap gestione 1200€/testa/anno

- Tutte le spese ≤3600€/anno totali. TCO in budget.md: posto barca solo se canone contenuto.

## [2026-08-04] preferenze | No traino/carrello

- B rimessaggio esclusa. Restano posto barca (A) e cantiere terra (C).
- Trasporti/alaggi eccezionali a pagamento. Hub fisso obbligato.

## [2026-08-04] preferenze | No gommone; scafo rigido + tendalino

- Esclusi gommone/RIB. Target gozzo/open/lancia comoda e robusta.
- Copertura sole alzabile = requisito comfort (anche aftermarket).
- Sample Subito scafi rigidi ≤5,5k in raw/mercato.

## [2026-08-04] preferenze | Priorità: pesca > giri > bagno > facilità

- Canne surfcasting da adattare; bolentino = tecnica naturale su barca piccola.
- Wiki: nice-to-have, concetti/pesca-da-barca-piccola.

## [2026-08-04] preferenze | Frequenza moderata

- Tra 1–2/mese e quasi ogni weekend. Rimessaggio: B/C avvantaggiati vs posto caro.

## [2026-08-04] preferenze | Budget ≤4500€ solo usato

- Max mezzo 4500€; stretch minimo se sogno; solo usato.
- Sample Subito API → `raw/mercato/subito-pacchetti-under-5500-*`, wiki `mercato/usato-under-4500.md`.
- Reality: tanti gommoni 3–4,5 m e gozzi; 6 pax comodi rari; Lazio ha alcuni lead (Anzio/Fiumicino/Roma).

## [2026-08-04] preferenze | No patente (ideale)

- Nessuno ha patente; ideale non prenderla; consapevolezza no-performance a 6 pax.
- Must-have riformulato; `wiki/concetti/no-patente-6-pax-realta.md`.
- Shortlist concettuale: RIB/gommone leggero, open leggero, gozzo; no cabinati pesanti.

## [2026-08-04] preferenze | Rimessaggio A/B/C aperti

- Esclusi D ibrido e E. Aperti: posto barca, carrello, cantiere terra.
- Confronto dettagliato: `wiki/confronti/rimessaggio-abc.md`
- Lead cantieri Anzio/Nettuno in raw/mercato.

## [2026-08-04] preferenze | Zona = litorale laziale

- Base: Ardea/Pomezia. Hub: Anzio, Circeo, Fiumicino. Mare (non lago).
- Open: rimessaggio. Wiki: gruppo, mercato/litorale-laziale, intervista.

## [2026-08-04] ricerca | Rimessaggio litorale laziale

- Anzio: gestione comunale post Capo d’Anzio; bandi posti; PDF tariffe 2026 scaricati ma **€ non stampati** nelle celle.
- Framework opzioni A–E (posto / boe / terra / carrello / ibrido) in `raw/mercato/litorale-laziale-rimessaggio-2026-08-04.md`.
- Da fare: telefonate listini Anzio/Nettuno/Fiumicino/Circeo + scivoli carrello.

## [2026-08-04] ricerca | Limiti senza patente IT

- Fonti: MIT https://www.mit.gov.it/node/2658 → `raw/normativa/mit-conseguimento-patente-nautica-2026-08-04.md`
- Secondarie: farevela, passionemare, in3giorni → `raw/normativa/note-secondarie-patente-2026-08-04.md`
- Wiki: `wiki/normativa/limiti-senza-patente.md`
- Takeaway: no-patente ≈ ≤30 kW (40,8 CV) + cilindrate + entro 6 miglia; vincolo forte vs 6 pax/performante.

## [2026-08-04] preferenze | Avvio intervista requisiti

- Iniziata raccolta requisiti one-question-at-a-time con ricerca web per punto.
- Pagina tracking: `wiki/preferenze/intervista-requisiti.md`

## [2026-08-04] setup | Bootstrap progetto

- Installati graphify (skill OpenCode project-scoped), superpowers (plugin), pattern LLM Wiki (skill + schema AGENTS.md).
- Creata struttura `raw/` + `wiki/` seed.
- Obiettivo: barca a motore piccola, usabile anche senza patente, pesca e divertimento per le bestie (tu, Antonio, Peppe), ideale fino a 6 persone.
- Preferenze dettagliate ancora da raccogliere in chat successive.
- Fonte pattern salvata in `raw/manuali/karpathy-llm-wiki.md`.
- Grafo iniziale `graphify-out/` (bootstrap AST; si arricchirà con `/graphify .` quando la wiki cresce).
