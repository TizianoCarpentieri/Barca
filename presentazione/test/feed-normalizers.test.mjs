import assert from 'node:assert/strict'
import test from 'node:test'

import {
  detectIncludedMotor,
  extractPreferredBrand,
  extractPreferredPower,
  extractPreferredShaft,
  hasHardHull,
  normalizeBoatLength,
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
