# agentContratto — mandato della cartella `contratto/`

> **Scopo di questa cartella:** costruire, affinare e mantenere il **patto tra amici**
> (Le Bestie) che regola proprietà, uso, costi, danni e uscita dal gommone condiviso.
> Precisione da contratto legale; natura = accordo tra amici, non atto notarile.

**Fase corrente:** creazione e iterazione **solo qui** (`contratto/`).  
Non propagare in `wiki/` finché il patto non è stabile e il gruppo non lo chiede.

---

## 1. Perché esiste questa cartella

Il gruppo (Tiziano, Antonio, Peppe) compra e gestisce insieme un **bundle
gommone + motore** (piano A). Serve un pezzo di carta che:

1. eviti litigi su soldi, uscite, danni e “chi tiene la roba”;
2. copra **ogni scenario ragionevole** prima che succeda;
3. dia una **formula chiara** se uno o più soci escono;
4. resti leggibile in 20–30 minuti e firmabile a mano o in digitale.

Questa cartella è il **cantiere** di quel pezzo di carta. L’agente lavora qui.

---

## 2. File in cartella

| File | Ruolo |
|------|--------|
| `agentContratto.md` | **Questo file.** Mandato agente, checklist scenari, seed, DoD, workflow. |
| `bozza-patto-v1.md` | Testo del patto (articoli, tabelle, formule, firme). Iterabile → v2, v3… |
| `prospetto-costi-a-norma.md` | **Leggi + costi iniziali/fissi obbligatori** (RC, dotazioni, documenti, tasse…). Vivo; alimenta art. costi/RC del patto. |

Eventuali file futuri (es. `formule.md`, esempi numerici, inventario) solo se
la bozza diventa ingombrante. Finché si legge bene, tenere le formule **dentro**
la bozza (art. uscita socio).

### 2.1 Prospetto costi a norma — regola d’oro

Quando in **qualsiasi** sessione (anche fuori da “lavoro contratto”) emerge un fatto su:

1. **obbligo di legge** per possedere / assicurare / navigare / trasportare il bene;
2. **costo iniziale obbligatorio** (una tantum per essere a norma: pratiche, dotazioni minime, passaggio proprietà se dovuto…);
3. **costo fisso obbligatorio** ricorrente (RC, rinnovi, tasse se applicabili…);

l’agente **nella stessa sessione**:

1. aggiorna `prospetto-costi-a-norma.md` (sezione esistente o nuova + riga nel riepilogo TCO);
2. salva fonti grezze in `raw/` se nuove;
3. se impatta clausole del patto (RC, costi fissi, documenti) → aggiorna o marca `[DA DECIDERE]` in `bozza-patto-v1.md`;
4. **non** lasciare il fatto solo in chat o solo in wiki senza riga sul prospetto.

Cosa **non** va sul prospetto (resta wiki/preferenze):

- nice-to-have, stime di mercato scafi/motori, scoring annunci;
- costi volontari di comfort non richiesti dalla legge (salvo se il gruppo li rende “fissi di patto”: allora nota in bozza + eventuale riga “fisso di gruppo” in §6 del prospetto).

---

## 3. Cosa è / cosa non è

| È | Non è |
|---|--------|
| Patto tra amici a **precisione contrattuale** | Consulenza legale professionale |
| Documento operativo firmabile dal gruppo | Atto notarile / scrittura privata “da avvocato” obbligatoria |
| Specifica viva: si modifica finché è perfetto | Testo sacro: si versiona, non si cancella di soppiatto |
| Fonte di verità **del patto** in fase di stesura | Sostituto di assicurazione, patente, o legge italiana |

Disclaimer fisso in bozza: in caso di contrasto con norme imperative, prevale la legge.

---

## 4. Parti e oggetto (seed)

| Voce | Valore seed | Stato |
|------|-------------|--------|
| Parti | Tiziano, Antonio, Peppe (“Le Bestie”) | fisso core |
| Estensione | N soci possibili in futuro (es. 4–5) | clausole scalabili |
| Oggetto | Gommone pneumatico + motore + dotazioni condivise | da compilare a acquisto |
| Base | Ardea / Pomezia — mare laziale | contesto |
| Budget acquisto | ≤ 2.000 € bundle (usato) | seed economico |
| Split default | **1/N** (con N=3 → 1/3) | finché non deciso altro |
| Cap costi fissi | ≤ **30 €/testa/mese** | hard preference |
| Patente | nessuno; restare no-patente (≤ 40,8 CV) | vincolo d’uso |

Dettaglio regole già discusse dal gruppo (seed concettuale, non da copiare in wiki ora):

- costi fissi e acquisto a quote uguali;
- **chi rompe per colpa paga**; evento imprevedibile → tutti;
- usura / manutenzione programmata → tutti;
- uscita socio → rimborso con formula (tempo dominante, uso secondario).

---

## 5. Principi guida per l’agente

1. **Zero buchi:** ogni scenario in checklist ha una regola, un rinvio esplicito, o `[DA DECIDERE]`.
2. **Niente numeri inventati “da fatti”:** i parametri (preavviso ore, tassi %) possono essere **proposte v1** ma marcati come tali se non c’è consenso verbale del gruppo.
3. **Tempo >> uscite** nella formula di uscita: un anno di possesso pesa molto di più di un pacchetto di uscite nello stesso anno.
4. **Esempi numerici** accanto alle formule (almeno 1 caso semplice).
5. **Linguaggio chiaro:** italiano semplice; termini tecnici spiegati una volta.
6. **Tracciabilità:** ogni revisione rilevante aggiorna versione, data, changelog in testa alla bozza.
7. **Non soft-delete:** se una clausola si toglie, resta nota nel changelog (“rimossa perché…”).
8. **Cantiere vs wiki:** il testo del **patto** non si propaga in wiki finché non è stabile. Eccezione: `prospetto-costi-a-norma.md` è nel cantiere ma si aggiorna da ricerche/wiki; le pagine wiki possono **linkare** il prospetto (non duplicarne il contenuto).
9. **Solidarietà ≠ copertura colpa:** il gruppo non paga l’errore grossolano del singolo.
10. **Unanimità vs maggioranza:** decisioni strutturali (vendita, nuovo socio, modifica patto, esclusione) = unanimità dei soci attivi, salvo diversa decisione esplicita in bozza.
11. **Legge e costi obbligatori → prospetto:** vedi §2.1. Prima di citare un obbligo o un prezzo “a norma” in bozza, deve esistere riga/sezione sul prospetto con fonte.

---

## 6. Checklist scenari obbligatori

L’agente **non** dichiara il patto “completo” finché ogni riga non è:
- coperta da articolo in bozza, **oppure**
- esplicitamente `[DA DECIDERE]` con domanda aperta.

### 6.1 Proprietà e documenti

- [ ] Quote (uguali / disuguali)
- [ ] Proprietà economica vs intestazione formale
- [ ] Intestatario gommone, motore, assicurazione
- [ ] Dove stanno i documenti; chi può mostrarli
- [ ] Passaggio di proprietà / adempimenti
- [ ] Vendita pezzi separati (motore vs scafo) — vietata o regolamentata

### 6.2 Custodia e logistica

- [ ] Chi tiene gommone / motore / attrezzatura
- [ ] Standard minimo di custodia (asciutto, sicuro, accessibile)
- [ ] Cambio custode (preavviso, ispezione stato)
- [ ] Auto e trasporto (chi, limiti, danni in auto)
- [ ] Accesso al mare / scivolo
- [ ] Chiavi, lucchetti, codici

### 6.3 Calendario e uscite

- [ ] Preavviso minimo per prenotare un’uscita
- [ ] Priorità se più richieste stesso giorno/slot
- [ ] Blocco periodi (ferie, alta stagione)
- [ ] Cancellazione tardiva
- [ ] Meteo e criteri no-go
- [ ] Uscite a pieno gruppo / parziali / da soli
- [ ] Durata massima / obbligo di rientro e riconsegna
- [ ] Registro uscite (chi, quando, ore, note danni)

### 6.4 Ospiti e terzi

- [ ] Ospiti ammessi sì/no e a quali condizioni
- [ ] Limite persone a bordo (omologazione + buon senso)
- [ ] Responsabilità per danni causati da ospiti
- [ ] Divieto prestito / noleggio / uso da non-soci
- [ ] Divieto uso commerciale

### 6.5 Condotta a bordo

- [ ] Chi può condurre (soci; eventuali terzi abilitati)
- [ ] Alcol e sostanze
- [ ] Rispetto limiti no-patente e norme di navigazione
- [ ] Dotazioni obbligatorie a bordo prima del varo
- [ ] Divieto elaborazioni / potenze illegali
- [ ] Comportamento che espone il gruppo a rischio (sanzioni, sequestro)

### 6.6 Costi

- [ ] Split acquisto iniziale
- [ ] Cassa comune vs pagamenti a rimborso
- [ ] Costi fissi (RC, tagliandi programmati, fondo)
- [ ] Costi variabili (carburante, eventuali varo/alaggio, parcheggi)
- [ ] Una tantum e imprevisti
- [ ] Superamento del cap 30 €/testa/mese — procedura
- [ ] Chi anticipa; scadenze; morosità lieve

### 6.7 Danni e sinistri

- [ ] Danno da colpa del conducente / utilizzatore
- [ ] Danno imprevedibile / forza maggiore
- [ ] Usura normale
- [ ] Franchigia e parte non coperta da assicurazione
- [ ] Danni a terzi
- [ ] Furto, smarrimento, vandalismo
- [ ] Perdita totale
- [ ] Chi gestisce denuncia / sinistro / riparazione

### 6.8 Manutenzione e ruoli

- [ ] Ruoli assegnati (cura materiale, pratiche, check)
- [ ] Check pre-uscita e post-uscita
- [ ] Lavaggio / asciugatura / stoccaggio obbligatori
- [ ] Manutenzione programmata (chi decide date, chi paga)
- [ ] Lavori straordinari (soglia € e voto)

### 6.9 Multe e sanzioni

- [ ] Multe nautiche / accesso / sosta
- [ ] Sequestro, fermo, sanzioni amministrative
- [ ] Colpa individuale vs responsabilità di gruppo
- [ ] Obbligo di informare gli altri soci subito

### 6.10 Uscita di uno o più soci

- [ ] Preavviso di recesso
- [ ] Formula rimborso: **tempo dominante + uso secondario + stato**
- [ ] Termini e modalità di pagamento dei rimanenti
- [ ] Rate / dilazioni
- [ ] Insolvenza del debitore (chi non paga il rimborso)
- [ ] Uscita di 2 su 3 (o maggioranza)
- [ ] Recesso “per giusta causa” vs libero
- [ ] Compensazione debiti dell’uscente

### 6.11 Ingresso, vendita, scioglimento

- [ ] Nuovo socio: unanimità, prezzo quota, patto aggiornato
- [ ] Diritto di prelazione tra soci
- [ ] Vendita totale del bene
- [ ] Scioglimento del patto
- [ ] Riparto del ricavato

### 6.12 Casi limite

- [ ] Decesso o inabilità grave di un socio
- [ ] Abbandono di fatto (non paga, non risponde, sparisce)
- [ ] Esclusione per giusta causa (cosa la integra)
- [ ] Smarrimento documenti / chiavi
- [ ] Litigio grave e stallo decisionale
- [ ] Upgrade futuro a scafo rigido / più soci → rinegoziazione obbligatoria

### 6.13 Dispute, modifiche, formalità

- [ ] Tentativo di accordo amichevole obbligatorio
- [ ] Maggioranza vs unanimità per tipo di decisione
- [ ] Modifica del patto (forma scritta)
- [ ] Versioning e data di efficacia
- [ ] Firme, luogo, copie
- [ ] Legge applicabile / foro amichevole (se utile)

---

## 7. Formula di uscita — vincoli di progettazione

Obiettivo: calcolare quanto i **soci rimanenti** devono saldare all’uscente
(o, se escono più persone, come si ripartisce / se scatta vendita).

### 7.1 Vincoli del gruppo

1. Conta **sia il tempo** sia le **uscite**.
2. Il **tempo ha incidenza maggiore** delle uscite.
3. Esempio di scala mentale: se **1 anno ≈ −1 unità** di valore, allora
   **~10 uscite in quell’anno non possono valere un altro −1**.
4. L’uso è un **correttivo con cap**, non un secondo deprezzamento pieno.
5. Si sottraggono debiti dell’uscente verso la cassa/gruppo.
6. Rimborso mai negativo (minimo 0) salvo patto diverso su debiti eccedenti.
7. Termine di pagamento dei rimanenti: definito in bozza (proposta v1 + `[DA DECIDERE]`).

### 7.2 Schema adottato in bozza v1

Vedi art. dedicato in `bozza-patto-v1.md`. Sintesi:

```
ValoreBase     = PrezzoAcquisto × (1 − DeprezzamentoTempo)
DeprezzamentoTempo = min(cap_tempo, anni × tasso_anno)

CorrettivoUso  = clamp( (uscite_uscente − media_attesa) × peso_uscita,
                        −cap_uso, +cap_uso )
// peso_uscita scelto così che molte uscite ≈ frazione di un anno, non un anno intero
// es. 40 uscite extra ≈ 1 × tasso_anno  →  10 uscite extra ≈ 0,25 di un anno

ValoreDopoUso  = ValoreBase × (1 − CorrettivoUso) × FattoreStato
Quota          = ValoreDopoUso / N_soci_al_momento_acquisto_o_quota_%
Rimborso       = max(0, Quota − debiti_uscente)
```

Parametri numerici in bozza sono **proposte v1** finché il gruppo non li fissa.

### 7.3 Casi multipli

| Caso | Comportamento atteso in bozza |
|------|-------------------------------|
| Esce 1 su 3 | Rimanenti pagano rimborso in solidarietà interna (riparto 50/50 o 1/2 ciascuno) |
| Escono 2 su 3 | Stessa formula per ciascun uscente **oppure** vendita se il superstites non vuole/può tenere |
| Escono tutti / stallo | Vendita del bene e riparto ricavato |
| Nessuno vuole il bene | Vendita obbligatoria entro termine |

---

## 8. Workflow agente

```
1. Leggi questo mandato + bozza corrente + prospetto-costi-a-norma.md
2. Se l’utente chiede modifica / nuovo scenario:
   a. aggiorna bozza (clausola + eventuale esempio)
   b. aggiorna checklist qui (spunta o [DA DECIDERE])
   c. bump versione/data + riga changelog in bozza
3. Se emerge legge / costo obbligatorio (anche da ricerca o wiki):
   → aggiorna prospetto-costi-a-norma.md (§2.1), poi allinea bozza se serve
4. Se manca una decisione di gruppo: NON inventare consenso;
   scrivi proposta chiara + marca [DA DECIDERE]
5. Dopo feedback delle bestie: integra e rinumera se serve
6. Quando checklist ≈ completa e pochi DA DECIDERE:
   proponi “vettura per firma” (letto insieme ~30 min)
```

### Comandi conversazionali utili

| Frase utente | Azione agente |
|--------------|---------------|
| `contratto: status` | % checklist, lista `[DA DECIDERE]`, versione bozza |
| `contratto: scenario …` | Aggiungi/raffina clausola |
| `contratto: formula …` | Modifica parametri/esempi art. uscita |
| `contratto: vN` | Snapshot/rename versione |
| `contratto: gap` | Solo buchi e contraddizioni interne |
| `contratto: prospetto` / `costi a norma` | Mostra/aggiorna `prospetto-costi-a-norma.md` |

---

## 9. Definition of Done (patto “pronto a firmare”)

- [ ] Tutte le sezioni 6.x coperte o consapevolmente rinviate con data
- [ ] ≤ 5 `[DA DECIDERE]` residuali, tutti non bloccanti per l’uso quotidiano
**oppure** i bloccanti risolti (custode, intestatario, parametri formula, preavviso)
- [ ] Almeno 2 esempi numerici della formula di uscita
- [ ] Tabella ruoli e contatti compilabile
- [ ] Sezione firme con nomi delle parti
- [ ] Changelog leggibile
- [ ] Lettura di prova ad alta voce senza ambiguità su: danni, uscite da soli, chi paga se esce uno

---

## 10. Open decisions (tracker rapido)

Da chiudere col gruppo (allineato ai `[DA DECIDERE]` in bozza):

1. Chi tiene materialmente gommone e motore (criterio carico/scarico)
2. Intestatario formale e assicurato
3. Canale ufficiale + link Google Drive documenti
4. Parametri formula: `tasso_anno`, `cap_tempo`, `peso_uscita`, `cap_uso`, giorni pagamento
5. Obbligo registro uscite (sì/no e dove)
6. Soglia € straordinarie se diversa da 100/300
7. Uscite solitarie: sì/no definitivo (restano eccezione)
8. Conducenti non-soci

---

## 11. Changelog mandato

| Data | Nota |
|------|------|
| 2026-08-11 | Bozza patto v1.1 da feedback lettura; prospetto § alcol + dotazioni. Open decisions aggiornate. |
| 2026-08-11 | Aggiunto `prospetto-costi-a-norma.md` + §2.1 regola d’oro (leggi/costi obbligatori → prospetto stessa sessione). Workflow e comandi aggiornati. |
| 2026-08-11 | Creazione cartella `contratto/` e mandato iniziale v1. Approccio: patto amici a precisione legale; bozza separata; no wiki in fase cantiere. Formula: tempo >> uscite. |
