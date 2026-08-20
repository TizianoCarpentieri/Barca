---
title: Patto Bestie — digest operativo
type: sintesi
updated: 2026-08-20
status: active
tags: [patto, split, danni, uscite, soci]
sources:
  - contratto/bozza-patto-v1.md
  - contratto/prospetto-costi-a-norma.md
---

# Patto di gestione condivisa — digest wiki

**Bozza ipotetica tra soci, non firmata.** Precisione da contratto, accordo tra amici. Prevale la legge.

**Testo integrale:** [[documenti/patto]] · fonte `contratto/bozza-patto-v1.md` **v1.10**.  
Sul sito: `documenti.html?doc=patto`.

Impianto **riutilizzabile** per gommone, scafo rigido o vela: si cambia il Bene, restano quote, danni, uscite, recesso.

Soci: **Tiziano, Antonio, Peppe** (N=3). Bene = gommone + motore + dotazioni Allegato A.

## Quote e intestazione

- Quote economiche **1/N** (oggi 1/3).
- Intestatario formale = fiduciario del gruppo (**[DA DECIDERE]** chi).
- RC obbligatoria prima della prima uscita; costo fisso di gruppo.
- Documenti: originali presso custode; **copia Drive** a tutti.

## Custodia e accesso mare

- Custode/luogo **[DA DECIDERE]**; standard: asciutto, carico/scarico comodo (anche patio idoneo).
- Accessi **leciti** di volta in volta (corridoi/scivoli). Multa da accesso scorretto → chi ha causato / presenti se agiti insieme.
- Prima del varo: ordinanza Capitaneria + Comune (corridoi, 3 nodi, balneazione).

## Calendario (proposta v1)

| Situazione | Preavviso |
|---|---|
| Uscita ordinaria | ≥48 h sul canale ufficiale |
| Last minute | ok se slot libero + messaggio prima di partire |
| Blocco >3 giorni | ≥7 giorni |
| Cancellazione free | fino a 24 h prima; dopo solo spese documentate altrui |

Priorità conflitto: chi scrive prima → chi ha meno uscite nel mese → sorteggio.

## Tipi di uscita (art. 6 v1.10)

| Tipo | Definizione | Costi variabili |
|---|---|---|
| Condivisa completa | tutti i soci a bordo | 1/P presenti (P=N) |
| Parziale | ≥2 soci, non tutti | chi partecipa 1/P |
| Individuale | un solo socio (+ eventuali ospiti) | **[DA DECIDERE]** sì con condizioni |

Ipotesi organizzativa: uscite complete più frequenti; **non** obbligo.  
Registro uscite obbligatorio (data, presenti, conducente, ore, danni).

## Ospiti e condotta

- Ospite solo con socio responsabile; portata documenti; socio risponde dell’ospite.
- Vietato prestare/noleggiare senza unanimità.
- No-patente: ≤6 miglia, ≤30 kW/40,8 CV + cilindrata, portata e potenza scafo.
- Conducente: entro legge alcol (>0,5 g/l = ebbrezza); **prudenza zero alcol**.
- Check dotazioni e pre/post-uscita: **tutti i presenti** (colpa solidale se manca essenziale).
- Pesca: SIAN/RecFishing/autorizzazioni per chi pesca.

## Costi

| Categoria | Chi paga |
|---|---|
| Fissi (RC, tagliando, usura) | 1/N |
| Variabili uscita (benzina, ticket) | presenti 1/P |
| Una tantum gruppo (kit sicurezza…) | 1/N (soglie sotto) |
| Colpa | chi causa |

- Niente cassa: anticipo + scontrino → rimborso **14 giorni**; ritardo grave **30 giorni**.
- Straordinarie: **>100 €** → N−1; **>300 €** → unanimità.
- Cap 30 €/testa/mese: **non hard** sul gommone auto.

## Danni (art. 10)

Default uso uscita senza errore palese: parte non assicurata **1/P tra i presenti** (P=presenti; individuale P=1).  
Colpa chiara → chi causa. Usura/vizio senza colpa → 1/N.  
Contestazione: verbale fatti → terzo o LLM → % vincolanti tra soci.

## Multe (art. 12)

Default presenti 1/P; se solo il conducente impone scelta palesemente sbagliata → conducente.  
Riparto interno **non** sposta responsabilità verso autorità/terzi/assicuratore.

## Manutenzione (art. 11.4)

Tagliando **non obbligo di legge**; obbligo di gruppo da manuale.  
Organizzatore di volta in volta (spesso chi fa meno altre faccende); costo comunque 1/N.  
Sollecito 30 gg → chiunque può far eseguire e ribaltare 1/N.

## Uscita socio (art. 13) — formula

```
DepT = min(0,70, t × 0,10)
ValoreBase = P × (1 − DepT)
CorrettivoUso = clamp( (U_i − U_tot/N) × 0,0025 , ±0,05 )
ValoreDopoUso = ValoreBase × (1 − CorrettivoUso) × S
Rimborso = max(0, ValoreDopoUso/N − debiti)
```

S = 1,00 / 0,85 / 0,70. Termine pagamento **60 gg**. Quote rimanenti → 1/(N−1).

## Esclusione (art. 16.3)

Unanimità dei non coinvolti; **nessun rimborso quota** all’escluso; debiti restano esigibili.  
Decesso/inabilità: liquidazione art. 13, **niente subentro eredi** nell’uso.

## Ancora aperti (v1.10)

Contatti; intestatari; custode/luogo; canale; preavvisi se diversi; solitarie sì/no; conducenti non-soci; parametri formula; mora; foro; inventario A; link Drive.

## Collegamenti

- Costi/obblighi: [[sintesi/prospetto-costi-a-norma]]
- Preferenze split: [[preferenze/split-costi]]
- Contesto bot: [[sintesi/contesto-sbarco]]
