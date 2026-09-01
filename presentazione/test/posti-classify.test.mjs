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
