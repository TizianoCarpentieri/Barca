import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyPosto, SALE_HARD_MAX } from '../scripts/posti-classify.mjs'

function item(overrides = {}) {
  return {
    subject: 'Posto barca annuale 8,50 x 2,70',
    body: 'Affittasi posto in darsena per cabinato.',
    price: 2800,
    region: 'Lazio',
    city: 'Roma',
    town: 'Anzio',
    place: 'Anzio · Roma · Lazio',
    deal_hint: 'rent',
    ...overrides,
  }
}

test('scarta gli affitti stagionali, estivi, giornalieri e invernali', () => {
  for (const body of [
    'Affitto stagionale giugno-settembre',
    'Solo estate, weekend e transito',
    'Canone giornaliero in banchina',
    'Disponibile solo invernale da ottobre a marzo',
    'Mensile estivo al mese',
  ]) {
    const result = classifyPosto(item({ body, subject: 'Posto barca Nettuno' }))
    assert.equal(result.status, 'reject', body)
    assert.ok(result.reasons.some((reason) => /stagional|periodo/i.test(reason)), body)
  }
})

test('tiene un annuale anche se valuta anche lo stagionale', () => {
  const result = classifyPosto(
    item({
      subject: 'Posto Barca Porto Romano Fiumicino',
      body: 'Affittasi posto barca annuale 8 x 3. Si valuta anche affitto stagionale.',
      price: 8000,
      town: 'Fiumicino',
      place: 'Fiumicino · Roma · Lazio',
    }),
  )
  assert.notEqual(result.status, 'reject')
  assert.equal(result.period, 'annual')
  assert.equal(result.deal_type, 'rent')
})

test('un periodo non dichiarato resta in lista ma non e annuale', () => {
  const result = classifyPosto(
    item({
      subject: 'Posto barca marina di Nettuno',
      body: 'Cessione posto in pontile, misure 8,5 x 3.',
      price: 3000,
      deal_hint: 'sale',
    }),
  )
  assert.notEqual(result.status, 'reject')
  assert.equal(result.period, 'unknown')
  assert.ok(result.score < classifyPosto(item({ deal_hint: 'sale', body: 'Vendesi posto barca annuale 8,5 x 3 in pontile.' })).score)
})

test('fuori Lazio e marina toscana con venditore romano sono reject', () => {
  const puglia = classifyPosto(item({ region: 'Puglia', place: 'Brindisi · Puglia', town: 'Brindisi' }))
  assert.equal(puglia.status, 'reject')

  const argentario = classifyPosto(
    item({
      subject: 'Posto barca Cala Galera Argentario',
      region: 'Lazio',
      place: 'Roma · Lazio',
      town: 'Roma',
    }),
  )
  assert.equal(argentario.status, 'reject')
})

test('la vendita sopra 20mila e fuori, a 20mila resta', () => {
  const high = classifyPosto(item({ deal_hint: 'sale', price: SALE_HARD_MAX + 1, body: 'Vendesi concessione posto barca annuale.' }))
  assert.equal(high.status, 'reject')
  const cap = classifyPosto(item({ deal_hint: 'sale', price: SALE_HARD_MAX, body: 'Vendesi concessione posto barca annuale.' }))
  assert.notEqual(cap.status, 'reject')
})

test('gli affitti non hanno tetto di prezzo', () => {
  const result = classifyPosto(item({ price: 15000, body: 'Affittasi posto barca annuale in darsena 8,5 x 3.' }))
  assert.notEqual(result.status, 'reject')
  assert.equal(result.deal_type, 'rent')
})

test('un prezzo da caffè non è un canone annuale', () => {
  assert.equal(
    classifyPosto(item({ price: 30, body: 'Affittasi posto barca annuale in darsena.' })).status,
    'reject',
  )
})

test('annualmente conta come annuale; un affitto a 333€ senza periodo no', () => {
  const yearly = classifyPosto(
    item({
      subject: 'Posto barca',
      body: 'Marina di Nettuno, affitto annualmente posto auto e posto barca cat. II D, metri 8,5x3, canone richiesto € 4.700,00',
      price: 4700,
      deal_hint: 'sale',
    }),
  )
  assert.notEqual(yearly.status, 'reject')
  assert.equal(yearly.period, 'annual')

  const cheap = classifyPosto(
    item({
      subject: 'Posto barca',
      body: 'Porto Turistico di Ostia - posto barca x metri 10,30x3,30 AFFITTO',
      price: 333,
      deal_hint: 'rent',
    }),
  )
  assert.equal(cheap.status, 'reject')
})

test('a parita di posto l affitto batte la vendita', () => {
  const shared = {
    subject: 'Posto barca 8,50 x 2,70 Anzio',
    body: 'Posto in banchina per cabinato, canone annuale.',
    price: 4000,
    town: 'Anzio',
    place: 'Anzio · Roma · Lazio',
  }
  const rent = classifyPosto(item({ ...shared, deal_hint: 'rent' }))
  const sale = classifyPosto(item({ ...shared, deal_hint: 'sale', body: 'Vendesi posto in banchina per cabinato, canone annuale.' }))
  assert.equal(rent.deal_type, 'rent')
  assert.equal(sale.deal_type, 'sale')
  assert.ok(rent.score > sale.score)
})

test('la classe 6,5-9 m e il sweet 770 pesano piu di uno slot da 15 m', () => {
  const sweet = classifyPosto(item({ subject: 'Posto barca annuale 8,00 x 2,80', body: 'Affitto annuale in darsena.' }))
  const huge = classifyPosto(item({ subject: 'Posto barca annuale 15 x 5', body: 'Affitto annuale in darsena per 45 piedi.' }))
  assert.ok(sweet.length_m >= 6.5 && sweet.length_m <= 9)
  assert.ok(huge.length_m >= 12)
  assert.ok(sweet.score > huge.score)
})

test('noleggio barca, compleanni e annunci senza posto sono rumore', () => {
  assert.equal(
    classifyPosto(item({ subject: 'Noleggio gommone Anzio', body: 'Noleggio giornaliero senza skipper.' })).status,
    'reject',
  )
  assert.equal(
    classifyPosto(item({ subject: 'Compleanno in barca', body: 'Festa in barca max 35 invitati.' })).status,
    'reject',
  )
  assert.equal(
    classifyPosto(item({ subject: 'Bavaria 42 cruiser', body: 'Barca a vela usata, posto barca nettuno incluso nel prezzo.' })).status,
    'reject',
  )
  assert.equal(
    classifyPosto(item({ subject: 'Cabinato 7 mt 2 motori', body: 'Barca in ottimo stato, posto barca pagato ad Anzio.' })).status,
    'reject',
  )
})

test('una cessione da 135mila, un cerco e un inverno-primavera sono fuori', () => {
  assert.equal(
    classifyPosto(
      item({
        subject: 'POSTO Barca darsena D',
        body: 'Affittasi posto barca banchina D, affitto annuale. 12.50 x 4.25',
        price: 135000,
        deal_hint: 'rent',
      }),
    ).status,
    'reject',
  )
  assert.equal(
    classifyPosto(
      item({
        subject: 'nautica posto barca',
        body: 'cerco posto barca Santa Marinella, lunghezza barca 8 x 2,70',
        price: 3000,
        deal_hint: 'sale',
      }),
    ).status,
    'reject',
  )
  assert.equal(
    classifyPosto(
      item({
        subject: 'Posto barca Porto di Roma',
        body: 'Porto di roma da novembre 25 a maggio 26',
        price: 4500,
        deal_hint: 'rent',
      }),
    ).status,
    'reject',
  )
})

test('un intervallo dal/al o da/a e un canone al mese non sono un annuale', () => {
  const cases = [
    {
      subject: 'Posto barca Porto di Nettuno',
      body: "Marina di Nettuno affittasi posto barca centrale davanti all'accesso del borgo 8.30 X 3.50 1ottobre - 30aprile 2027 Maurizio",
      price: 1300,
    },
    {
      subject: 'Posto barca porto Romano',
      body: 'Affittasi posto barca 10x3,20 con posto auto, dal 1/11 al 30/4',
      price: 1600,
    },
    {
      subject: 'Posto barca 10m porto turistico ostia',
      body: 'Affitto posto barca 10 m prezzo completo di luce/acqua in banchina da febbraio a ottobre 350 euro mese.',
      price: 350,
    },
    {
      subject: 'Posto barca marina di nettuno',
      body: 'disponibile dal 20/06/2026 al 30/10/2026 ( anche fino a dicembre)',
      price: 6500,
    },
    {
      subject: 'Posto barca marina di nettuno',
      body: 'Affitto posto barca con parcheggio, disponibile da subito fino al 30 aprile 2027',
      price: 7000,
    },
    {
      subject: 'POSTO BARCA NETTUNO',
      body: 'AFFITTASI DA 01/11/2026 AL 30/04/2027 PONTILE BRAVO',
      price: 2000,
    },
    {
      subject: 'Posto barca Nettuno 12.5',
      body: 'Affitto dal 10/10 al 15/05. 2026',
      price: 2500,
    },
    {
      subject: 'POSTO BARCA PONTILE H NETTUNO',
      body: 'Disponibile dal 1° ottobre al 30° aprile.',
      price: 2500,
    },
    {
      subject: 'Posto barca Marina di Nettuno 12,50 x 4,25',
      body: 'Periodo 01/10/25 al 15/04/26.',
      price: 2500,
    },
    {
      subject: 'Posto barca 8 m più tolleranza',
      body: 'Affitto posto barca al porto turistico di Ostia per i mesi estivi fino a fine ottobre.',
      price: 1700,
    },
    {
      subject: 'Posto barca Marina di Nettuno',
      body: 'affittasi posto barca Marina di Nattuno 8.50x3.50 con posto auto sotto il borgo da Novembre ad Aprile 2026',
      price: 1000,
    },
    {
      subject: 'Posto barca Marina di Nettuno 10,50x3,50',
      body: 'AFFITTO MESI INVERNALI. Disponibilità 15/10/2026 - 30/04/2027',
      price: 2000,
    },
    {
      subject: 'Posto barca 10.50 x 3.75 15 settembre 30 aprile',
      body: 'Affittasi posto barca con posto auto dal 15 settembre a fine aprile',
      price: 3300,
    },
    {
      subject: 'Posto barca mesi luglio e agosto Nettuno',
      body: 'Affittasi presso Marina di Nettuno mesi luglio e agosto posto barca',
      price: 4000,
    },
    {
      subject: 'posto barca porto di Roma ostia',
      body: 'posto barca 12 metri affitto da 15 giugno a 15/20 ottobre 2026, euro 1700 x l intero periodo',
      price: 1700,
    },
    {
      subject: 'Posto barca Marina di Nattuno',
      body: 'Marina di Nettuno sotto borgo metri 8.50 circa 3 da febbraio tutto aprile',
      price: 600,
    },
    {
      subject: 'Posto barca Porto turistico Roma (Ostia)',
      body: 'Disponibile da luglio a tutto settembre. Posto auto incluso',
      price: 3200,
    },
  ]
  for (const row of cases) {
    const result = classifyPosto(item({ ...row, deal_hint: 'rent' }))
    assert.equal(result.status, 'reject', row.body)
  }
})

test('libero da / concessione lunga / orari dal-al non sono un periodo stagionale', () => {
  const annuale = classifyPosto(
    item({
      subject: 'posto barca',
      body: 'Affitto posto barca Marina di Nettuno m. 8.50. Libero da 1 ottobre 2026. Affitto annuale € 4500,00 o stagionale da concordare',
      price: 4500,
    }),
  )
  assert.notEqual(annuale.status, 'reject')
  assert.equal(annuale.period, 'annual')

  const disponibile = classifyPosto(
    item({
      subject: 'posto barca Riva di Traiano',
      body: 'Affitto Annuale Posto Barca Riva di Traiano. Disponibile da Settembre. Lunghezza 10,5 mt',
      price: 4100,
    }),
  )
  assert.notEqual(disponibile.status, 'reject')
  assert.equal(disponibile.period, 'annual')

  const concessione = classifyPosto(
    item({
      subject: 'Posto barca - Porto Turistico di Ostia',
      body: 'Porto Turistico di Ostia vendesi posto barca molo est pontile B (8 mt), con posto auto. Concessione fino al 2048',
      price: 18000,
      deal_hint: 'sale',
    }),
  )
  assert.notEqual(concessione.status, 'reject')

  const orari = classifyPosto(
    item({
      subject: 'Rimessaggio barca',
      body: 'Rimessaggio NAUTICA RF. aperto tutti i giorni dal lunedì al venerdì 8:00-17:00. Sabato 8:00-13:00',
      price: 2000,
      town: 'Santa Marinella',
      place: 'Santa Marinella · Roma · Lazio',
    }),
  )
  assert.notEqual(orari.status, 'reject')
})

test('un titolo Nautica con affitto annuale nel corpo resta un posto', () => {
  const result = classifyPosto(
    item({
      subject: 'Nautica',
      body: 'Affitto annuale posto barca 8,5 x 2,8 — Porto turistico di Roma - Ostia',
      price: 6500,
      town: 'Roma',
      place: 'Ostia · Roma · Lazio',
    }),
  )
  assert.notEqual(result.status, 'reject')
  assert.equal(result.deal_type, 'rent')
  assert.equal(result.period, 'annual')
})

test('a secco vale meno dell acqua, l hub Fiumicino-Nettuno di piu', () => {
  const water = classifyPosto(item({ body: 'Affitto annuale in banchina, darsena coperta.' }))
  const dry = classifyPosto(
    item({
      subject: 'Rimessaggio a secco annuale 8 m',
      body: 'Rimessaggio a secco in cantiere, canone annuale.',
      town: 'Latina',
      place: 'Latina · Lazio',
    }),
  )
  const hub = classifyPosto(
    item({
      town: 'Fiumicino',
      place: 'Fiumicino · Roma · Lazio',
      subject: 'Posto barca annuale Fiumicino 8 x 3',
      body: 'Affitto annuale in darsena.',
    }),
  )
  const far = classifyPosto(
    item({
      town: 'Gaeta',
      place: 'Gaeta · Latina · Lazio',
      subject: 'Posto barca annuale Gaeta 8 x 3',
      body: 'Affitto annuale in darsena.',
    }),
  )
  assert.equal(water.kind, 'water')
  assert.equal(dry.kind, 'dry')
  assert.ok(water.score > dry.score)
  assert.equal(hub.hub, true)
  assert.equal(far.hub, false)
  assert.ok(hub.score > far.score)
})
