# agentContratto — mandato della cartella `contratto/`

> **Scopo:** costruire, affinare e mantenere il **patto tra amici** (Le Bestie)
> su proprietà, uso, costi, danni e uscita del gommone condiviso.
> Precisione da contratto; natura = accordo tra amici, non atto notarile.

**Path canonico (unico):** `C:\Users\…\Desktop\barca\contratto\`  
(o relativo al root repo: `contratto/`)

**Fase corrente:** cantiere attivo in `contratto/`.  
**Bozza vigente:** `bozza-patto-v1.md` — leggi la riga **Versione** in testa (oggi **1.6**).  
Non propagare il testo del patto in `wiki/` finché non è stabile e il gruppo non lo chiede.

---

## 1. File in cartella

| File | Ruolo |
|------|--------|
| `agentContratto.md` | **Questo mandato.** Workflow, checklist, decisioni note, DoD. |
| `bozza-patto-v1.md` | **Unica** fonte di verità del testo del patto. Si edita **in place**. |
| `prospetto-costi-a-norma.md` | Leggi + costi **iniziali/fissi obbligatori** (RC, dotazioni, alcol, tagliando…). |

Niente bozze parallele, niente “v1-bis” non richieste.  
Formule di uscita: restano **dentro** la bozza (art. 13), non in file separato finché leggibile.

### 1.1 Prospetto costi a norma — regola d’oro

Se emerge (chat, ricerca, raw, wiki) un fatto su:

1. obbligo di **legge** (possesso, RC, navigazione, trasporto, alcol, dotazioni…);
2. **costo iniziale obbligatorio** per essere a norma;
3. **costo fisso obbligatorio** ricorrente (RC, rinnovi, scadenze segnali…);

→ **stessa sessione:**

1. aggiorna `prospetto-costi-a-norma.md` (sezione + riga TCO);
2. salva fonti in `raw/` se nuove;
3. se tocca il patto → aggiorna `bozza-patto-v1.md` (o `[DA DECIDERE]`);
4. non lasciare il fatto solo in chat.

**Non** mettere sul prospetto: preferenze scafi/motori, scoring annunci, nice-to-have.
Regole operative dell’agente stanno **qui**, non nel prospetto.

---

## 2. Come modificare la bozza (OBBLIGATORIO)

Quando l’utente cita un pezzo del patto (es. «### 11.4 …» con testo vecchio):

1. **Apri e leggi** `bozza-patto-v1.md` sul disco (non fidarti solo della chat o del buffer IDE).
2. **Sostituisci in place** quell’articolo/paragrafo con `Edit`/`StrReplace` sul testo **attuale** del file.
3. **Non** aggiungere una seconda copia dello stesso articolo altrove.
4. **Non** lasciare il vecchio testo sotto e il nuovo sopra.
5. Bump **Versione** (1.x → 1.x+1), **Data**, riga in **Changelog** in testa.
6. Se la modifica chiude un open: aggiorna §10 qui e l’elenco `[DA DECIDERE]` in coda bozza.
7. Dopo edit: **verifica** con grep che il testo vecchio non compaia più e che il nuovo ci sia **una sola volta**.

### 2.1 IDE / buffer sporco (lezione sessione 2026-08-11)

Cursor a volte mostra un **tab non salvato** con testo pre-modifica anche se il disco è aggiornato.

- Fonte di verità = **file su disco** + `git show HEAD:contratto/bozza-patto-v1.md`.
- Se l’utente dice «non vedo le modifiche»: fargli **chiudere il tab senza salvare** e riaprire il path.
- **Mai** fargli “Salva” su un buffer che contiene ancora il testo vecchio (sovrascriverebbe il lavoro).
- Path da citare sempre: `contratto/bozza-patto-v1.md`.

### 2.2 Stile risposta all’utente

- Breve conferma di cosa è cambiato + dove (art. X).
- Non inventare path o versioni.
- Se serve ricerca normativa/costi → prospetto + raw, poi allinea patto.

---

## 3. Cosa è / cosa non è

| È | Non è |
|---|--------|
| Patto amici a precisione contrattuale | Consulenza legale professionale |
| Documento firmabile | Atto notarile obbligatorio |
| Specifica viva, versionata | Testo sacro immutabile |
| Fonte del **patto** in cantiere | Sostituto di RC, patente, legge |

In bozza: se contrasto con norme imperative → prevale la legge.

---

## 4. Seed gruppo e oggetto

| Voce | Valore | Note |
|------|--------|------|
| Parti | Tiziano, Antonio, Peppe | cognomi/contatti ancora aperti |
| N | 3 (scalabile) | |
| Oggetto | Gommone pneumatico + motore + dotazioni | piano A |
| Base | Ardea/Pomezia, mare laziale | |
| Budget bundle | ≤ ~2.000 € usato | |
| Split | **1/N** | |
| Patente | nessuno; ≤ 40,8 CV | |
| Lunghezza gommone | min 3,30 m; ideale 3,50–3,80; **no max duro** | anche >4 m se auto/trasporto |
| Cap 30 €/testa/mese | **non hard** sul gommone auto | era scenario porto/rimessaggio; vedi bozza art. 9.3 |

Principi di gruppo già in bozza:

- uscite **normali = tutti insieme** (art. 6.0);
- costi fissi e acquisto 1/N;
- in gruppo: danni di default **1/N presenti**, salvo errore palese di uno;
- usura / tagliando programmato → 1/N;
- uscita socio → formula tempo >> uso (art. 13).

---

## 5. Principi guida

1. **Zero buchi:** regola, rinvio, o `[DA DECIDERE]`.
2. **No numeri inventati da fatti:** proposte v1 marcate se manca consenso.
3. **Tempo >> uscite** nella formula recesso.
4. **Esempi numerici** sulle formule.
5. **Italiano chiaro.**
6. **Changelog** a ogni revisione rilevante.
7. **No soft-delete silenzioso** di clausole (nota in changelog).
8. **Edit in place** (§2) — mai duplicare articoli.
9. **Cantiere vs wiki:** patto non in wiki finché instabile; prospetto linkabile.
10. **Solidarietà ≠ scudo colpa palese.**
11. **Unanimità** su vendita, nuovo socio, modifica patto, esclusione (con regole bozza).
12. **Legge/costi obbligatori → prospetto** (§1.1) prima o insieme al patto.
13. **Modo normale = gruppo insieme;** parziale/solitaria = eccezione documentata, non lo stile di vita del testo.

---

## 6. Checklist scenari (stato vs bozza 1.6)

Legenda: `[x]` coperto in bozza (anche se restano dettagli aperti) · `[ ]` ancora debole/aperto.

### 6.1 Proprietà e documenti

- [x] Quote uguali 1/N
- [x] Proprietà economica vs intestazione
- [ ] Intestatario gommone/motore/polizza (nomi)
- [x] Documenti: originali + **Google Drive** condiviso
- [ ] Passaggio proprietà / adempimenti (prospetto §3 da fare)
- [x] Divieto smembramento unilaterale

### 6.2 Custodia e logistica

- [ ] Chi tiene cosa (nomi)
- [x] Standard custodia (asciutto, intemperie; patio ok; **carico/scarico**)
- [x] Cambio custode
- [x] Trasporto / danni auto
- [x] Accesso mare snello (leciti; niente elenco obbligatorio)
- [ ] Chiavi/codici

### 6.3 Calendario e uscite

- [x] Canale ufficiale (senza nome fisso nel patto)
- [x] Preavviso 48h / last minute / 7gg blocco lungo
- [x] Priorità conflitto
- [x] Cancellazione (solo spese reali documentate)
- [x] Meteo no-go
- [x] **Modo normale = uscita di gruppo**
- [ ] Solitarie: sì/no definitivo
- [x] Rientro/riconsegna
- [x] Registro uscite (proposta obbligatorio)

### 6.4 Ospiti e terzi

- [x] Ospiti con socio responsabile
- [x] Divieti prestito/noleggio/commerciale
- [ ] Conducenti non-soci

### 6.5 Condotta

- [x] Conducenti = soci (+ eventuale eccezione)
- [x] Alcol: passeggeri ok; conducente ≤0,5 g/l legge; danni da chi esagera
- [x] No-patente / legalità
- [x] Dotazioni: check = **soci presenti**
- [x] No elaborazioni illegali

### 6.6 Costi

- [x] Split acquisto
- [x] Niente cassa; anticipo + rimborso 14+14 gg
- [x] Fissi / variabili / una tantum / colpa
- [x] Cap 30€ **non hard** gommone
- [x] Soglie 100 / 300 € con esempi
- [x] Morosità → art. 16

### 6.7 Danni

- [x] Principio gruppo 1/N + colpa palese
- [x] Tabella casi
- [x] Franchigia/assicurazione
- [x] Sinistro: presenti; avviso assenti
- [x] Perdita totale
- [x] Contestazione: verbale + terzo o LLM → % colpe

### 6.8 Manutenzione

- [x] Ruoli: manutenzione **di volta in volta**
- [x] Check pre/post = **tutti i presenti**
- [x] Tagliando: non obbligo legge; rotazione / chi fa meno il resto; sollecito 30 gg
- [x] Straordinari → 9.5

### 6.9 Multe

- [x] Default presenti 1/P; eccezione conducente “cazzata palese”
- [x] Avviso 24h

### 6.10–6.13 Uscita, ingresso, vendita, casi limite, dispute

- [x] Formula recesso tempo>>uso + esempi
- [x] Ingresso, vendita, scioglimento
- [x] Decesso, abbandono, esclusione, stallo
- [x] Modifiche, quorum, firme
- [ ] Parametri formula fissati dal gruppo
- [ ] Cognomi, firme, allegato A compilato

---

## 7. Formula di uscita (vincoli)

Vedi art. 13 bozza. Vincoli:

1. Tempo e uscite contano; **tempo domina**.
2. Uso = correttivo con **cap** (non secondo deprezzamento pieno).
3. Scala mentale: ~40 uscite extra ≈ 1 anno a tasso r (w = r/40).
4. Rimborso ≥ 0; debiti detraibili.
5. Parametri in bozza = proposte finché il gruppo non li fissa.

---

## 8. Workflow agente

```
1. Leggi agentContratto.md + bozza (riga Versione) + prospetto
2. Utente cita un articolo / chiede modifica:
   a. leggi il testo ATTUALE di quell’articolo sul disco
   b. Edit IN PLACE (sostituisci, non duplicare)
   c. verifica grep: vecchio assente, nuovo presente 1 volta
   d. bump versione + changelog bozza
   e. aggiorna checklist/open qui se serve
3. Legge/costo obbligatorio → prospetto + raw (+ bozza se impatta)
4. Niente consenso inventato: proposta + [DA DECIDERE]
5. Commit solo se l’utente lo chiede
```

### Comandi

| Frase | Azione |
|-------|--------|
| `contratto: status` | Versione bozza, open decisions, % checklist |
| `contratto: scenario …` | Clausola in place |
| `contratto: formula …` | Art. 13 |
| `contratto: gap` | Buchi/contraddizioni |
| `contratto: prospetto` / `costi a norma` | Prospetto |
| Utente incolla un articolo da correggere | Sostituisci **quel** articolo in bozza |

---

## 9. Definition of Done (pronto a firmare)

- [ ] Checklist 6.x coperta o rinviata esplicitamente
- [ ] ≤ 5 `[DA DECIDERE]` non bloccanti **oppure** bloccanti risolti (custode, intestatario, formula, Drive)
- [ ] ≥ 2 esempi formula uscita (già in bozza)
- [ ] Ruoli/contatti compilabili
- [ ] Firme
- [ ] Changelog ok
- [ ] Lettura ad alta voce: danni, uscite insieme, chi paga multa/tagliando/recesso — senza ambiguità

---

## 10. Open decisions (allineati a bozza 1.6)

1. Cognomi e contatti parti  
2. Intestatario gommone / motore / polizza  
3. Custode e luogo (criterio carico/scarico)  
4. Quale canale di gruppo + link Google Drive  
5. Uscite solitarie: sì/no definitivo  
6. Conducenti non-soci  
7. Parametri formula (r, cap_t, w, cap_u, termini pagamento) se diversi dalle proposte  
8. Interessi di mora  
9. Foro/mediazione formale (spesso omettere)  
10. Allegato A a acquisto  
11. Preventivi reali RC e tagliando (prospetto tabelle da compilare)

---

## 11. Mappa rapida bozza (orientamento)

| Art. | Tema | Note v1.6 |
|------|------|-----------|
| 1–2 | Parti, quote | |
| 3 | Intestazione, RC, Drive | RC obbligatoria legge |
| 4 | Custodia | no “furti banali”; carico/scarico |
| 5 | Calendario | preavviso chiaro |
| 6 | Uscite | **6.0 gruppo = normale** |
| 7 | Ospiti | |
| 8 | Condotta | alcol + dotazioni presenti |
| 9 | Costi | no cassa; cap 30 non hard |
| 10 | Danni | 10.6 verbale + terzo/LLM |
| 11 | Manutenzione | 11.4 rotazione / equilibrio carichi |
| 12 | Multe | presenti 1/P; eccezione conducente |
| 13 | Recesso | tempo >> uso |
| 14–18 | Ingresso, vendita, limiti, firme | |

Prospetto: §1 RC · §1b alcol · §2 dotazioni/luci · §6 tagliando.

---

## 12. Changelog mandato

| Data | Nota |
|------|------|
| 2026-08-11 | Revisione post-sessione patto v1.6: edit-in-place obbligatorio; warning buffer IDE; seed cap/lunghezza; checklist stato reale; mappa articoli; open decisions aggiornate. |
| 2026-08-11 | Prospetto + § regola d’oro costi/leggi; bozza iniziale e iterazioni 1.1–1.6. |
| 2026-08-11 | Creazione cartella e mandato v1. |
