import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const KINDS = new Set(['bando', 'marina', 'demanio', 'circolo', 'cantiere'])

test('posti-ufficiali: ogni gestore ha nome, kind, place, checked e URL solo se veri', async () => {
  const raw = await readFile(new URL('../scripts/posti-ufficiali.json', import.meta.url), 'utf8')
  const data = JSON.parse(raw)
  assert.ok(Array.isArray(data.items) && data.items.length >= 8)
  for (const item of data.items) {
    assert.ok(item.id && item.name && item.place, item.id)
    assert.ok(KINDS.has(item.kind), `${item.id} kind`)
    assert.match(String(item.checked), /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(item.note && item.note.length > 20, item.id)
    for (const key of ['url', 'albo_url']) {
      const value = item[key]
      if (value != null) {
        assert.match(value, /^https:\/\//, `${item.id} ${key}`)
        assert.doesNotMatch(value, /example\.com|#|todo/i)
      }
    }
  }
  assert.ok(data.items.some((item) => item.id === 'anzio-porto' && item.pec && item.albo_url))
  assert.ok(data.items.some((item) => item.kind === 'bando'))
})
