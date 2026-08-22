import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { findCrossFeedDuplicates, validateFeeds } from '../scripts/feed-gate.mjs'

function item(overrides = {}) {
  return {
    id: 'id-1',
    subject: 'Annuncio',
    url: 'https://www.subito.it/nautica/esempio-1.htm',
    price: 1000,
    ...overrides,
  }
}

function writeFeed(dir, name, extra = {}) {
  writeFileSync(
    path.join(dir, `${name}.json`),
    JSON.stringify({
      updated_at: extra.updated_at ?? new Date().toISOString(),
      errors: [],
      items: extra.items ?? Array.from({ length: extra.count ?? 10 }, (_, i) =>
        item({
          id: `${name}-${i}`,
          url: `https://www.subito.it/nautica/${name}-${i}.htm`,
          price: 1000 + i,
          ...(name === 'vele' ? { sail_type: 'cabinato', length_m: 7.7 } : {}),
          ...(name === 'gommoni' ? { has_engine: false, length_m: 3.8 } : {}),
        }),
      ),
    }),
    'utf8',
  )
}

test('un feed vele assente o stantio non blocca i feed core', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'feed-gate-'))
  try {
    for (const name of ['annunci', 'gommoni', 'motori', 'accessori']) writeFeed(dir, name)
    const missing = validateFeeds(dir)
    assert.equal(missing.errors.length, 0)
    assert.ok(missing.warnings.some((w) => /vele: file mancante/.test(w)))

    writeFeed(dir, 'vele', { count: 6, updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() })
    const stale = validateFeeds(dir)
    assert.equal(stale.errors.length, 0)
    assert.ok(stale.warnings.some((w) => /vele: timestamp/.test(w)))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('un core feed stantio continua a far fallire il gate', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'feed-gate-'))
  try {
    writeFeed(dir, 'annunci', { updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() })
    for (const name of ['gommoni', 'motori', 'accessori', 'vele']) writeFeed(dir, name, { count: name === 'vele' ? 6 : 10 })
    const result = validateFeeds(dir)
    assert.ok(result.errors.some((e) => /annunci: timestamp/.test(e)))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('lo stesso URL in due tab e un duplicato cross-feed', () => {
  const dupes = findCrossFeedDuplicates({
    motori: [item({ url: 'https://www.subito.it/nautica/pilotina.htm' })],
    vele: [item({ id: 'vela-1', url: 'https://www.subito.it/nautica/pilotina.htm' })],
  })
  assert.equal(dupes.length, 1)
  assert.deepEqual(dupes[0].feeds.sort(), ['motori', 'vele'])
})

test('un duplicato che tocca solo vele o accessori resta un warning', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'feed-gate-'))
  try {
    const shared = 'https://www.subito.it/nautica/pilotina-vela.htm'
    writeFeed(dir, 'annunci')
    writeFeed(dir, 'gommoni')
    writeFeed(dir, 'accessori')
    writeFeed(dir, 'motori', {
      items: [item({ url: shared }), ...Array.from({ length: 9 }, (_, i) => item({ id: `m-${i}`, url: `https://www.subito.it/nautica/m-${i}.htm`, price: 400 + i }))],
    })
    writeFeed(dir, 'vele', {
      count: 5,
      items: [
        item({ id: 'v-shared', url: shared, price: 6000, sail_type: 'cabinato', length_m: 7 }),
        ...Array.from({ length: 5 }, (_, i) =>
          item({ id: `v-${i}`, url: `https://www.subito.it/nautica/v-${i}.htm`, price: 5000 + i, sail_type: 'cabinato', length_m: 7.5 }),
        ),
      ],
    })
    const result = validateFeeds(dir)
    assert.equal(result.errors.length, 0)
    assert.ok(result.warnings.some((w) => /cross-feed duplicato/.test(w)))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
