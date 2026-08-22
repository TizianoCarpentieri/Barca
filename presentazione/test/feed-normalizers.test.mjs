import assert from 'node:assert/strict'
import test from 'node:test'

import {
  detectIncludedMotor,
  extractPreferredBrand,
  extractPreferredPower,
  extractPreferredShaft,
  extractSailInventory,
  hasHardHull,
  isClubDinghy,
  isSailboat,
  isWholeSailboat,
  normalizeBoatLength,
  normalizeLengthMeters,
  sailTypeOf,
} from '../scripts/feed-normalizers.mjs'

test('normalizza lunghezze Subito espresse in cm, mm o metri', () => {
  assert.equal(normalizeBoatLength('380'), 3.8)
  assert.equal(normalizeBoatLength('3600'), 3.6)
  assert.equal(normalizeBoatLength('3,70'), 3.7)
  assert.equal(normalizeBoatLength(null, 'Gommone lungo 350 cm'), 3.5)
  assert.equal(normalizeBoatLength(null, 'Gommone 3,80 m'), 3.8)
  assert.equal(normalizeBoatLength('380', 'Gommone 3,30 m'), 3.3)
  assert.equal(normalizeBoatLength('380', 'Gommone 3,30 con motore'), 3.3)
})

test('esclude RIB e descrizioni con parti rigide', () => {
  assert.equal(hasHardHull('Joker Boat 430 pneumatico'), true)
  assert.equal(hasHardHull('Pirelli Laros con chiglia rigida'), true)
  assert.equal(hasHardHull('Zodiac smontabile con paiolato alluminio'), false)
})

test('riconosce il motore incluso senza confonderlo con un gommone senza motore', () => {
  assert.equal(detectIncludedMotor('Gommone 3,80 con motore e accessori', 8), true)
  assert.equal(detectIncludedMotor('Solo gommone, senza motore', null), false)
})

test('marca e gambo nel titolo prevalgono sulle compatibilita citate nel corpo', () => {
  assert.equal(extractPreferredBrand('Selva 15cv 4T', 'compatibile Yamaha'), 'selva')
  assert.equal(extractPreferredShaft('Mercury gambo corto', 'disponibile anche lungo'), 'corto')
  assert.equal(extractPreferredShaft('Mercury gambo, corto', 'disponibile anche lungo'), 'corto')
  assert.equal(extractPreferredPower('Suzuki 9.9 4 tempi', 'versione derivata dal 15 CV'), 9.9)
})

test('riconosce una barca a vela e non un gommone o un fuoribordo', () => {
  assert.equal(isSailboat('Comet 770 cabinato Finot'), true)
  assert.equal(isSailboat('barca a vela new ranger 9.60'), true)
  assert.equal(isSailboat('Pilotina Vela/Motore 6 metri'), true)
  assert.equal(isSailboat('Gommone 3,80 con motore Yamaha 15'), false)
  assert.equal(isSailboat('Yamaha 15 4 tempi gambo corto'), false)
  assert.equal(isSailboat('gozzo in vtr con tendalino'), false)
})

test('le derive da club non sono cabinati Comet-class', () => {
  assert.equal(isClubDinghy('Optimist club 2020'), true)
  assert.equal(isClubDinghy('Laser 1 usata'), true)
  assert.equal(isClubDinghy('Comet 700 deriva mobile con cucina'), false)
  assert.equal(sailTypeOf('Optimist 2.3 m'), 'deriva')
  assert.equal(sailTypeOf('Comet 700 deriva mobile, cucina due fuochi'), 'cabinato')
  assert.equal(sailTypeOf('sloop 8 m con randa e genoa'), 'cabinato')
})

test('estrae l inventario vele dal testo', () => {
  assert.deepEqual(
    extractSailInventory('randa full batten e genoa triradiale, tangone e spinnaker'),
    ['randa', 'genoa', 'spinnaker'],
  )
  assert.deepEqual(extractSailInventory('gommone con motore'), [])
})

test('un Optimist intero non e un accessorio', () => {
  assert.equal(isWholeSailboat('Optimist 2020 usato'), true)
  assert.equal(isWholeSailboat('randa usata 20 m2'), false)
  assert.equal(isWholeSailboat('ecoscandaglio Garmin'), false)
})

test('normalizza lunghezze cabinato oltre 10 m e due decimali', () => {
  assert.equal(normalizeLengthMeters(null, 'barca a vela new ranger 9.60', '', { min: 2, max: 24 }), 9.6)
  assert.equal(normalizeLengthMeters('7,68', 'Comet 770', 'scafo 7,68 m', { min: 2, max: 24 }), 7.68)
  assert.equal(normalizeLengthMeters('12', 'cabinato 12 m', '', { min: 2, max: 24 }), 12)
  assert.equal(normalizeBoatLength('380', 'Gommone 3,80 m'), 3.8)
})
