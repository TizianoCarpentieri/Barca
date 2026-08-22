import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('il dock ha Home, Annunci, Regole e Altro come bottone', async () => {
  const src = await readFile(new URL('../src/js/nav.js', import.meta.url), 'utf8')
  assert.match(src, /href="\.\/index\.html"/)
  assert.match(src, /href="\.\/annunci\.html"/)
  assert.match(src, /href="\.\/regole\.html"/)
  assert.match(src, /data-open-sheet/)
  assert.match(src, /<button type="button"/)
})

test('il tab Vele e marcato sogno e non e una pagina accessori', async () => {
  const html = await readFile(new URL('../annunci.html', import.meta.url), 'utf8')
  assert.match(html, /data-cat="vele"/)
  assert.match(html, /ads-cat--sogno/)
  assert.match(html, /ads-cat__badge/)
  assert.match(html, /sogno parallelo/)
})

test('lo sheet non duplica Home/Regole e include Status + feed', async () => {
  const src = await readFile(new URL('../src/js/nav.js', import.meta.url), 'utf8')
  const sheet = src.slice(src.indexOf('Altre pagine'))
  assert.doesNotMatch(sheet, /href="\.\/index\.html"/)
  assert.doesNotMatch(sheet, /href="\.\/regole\.html"/)
  const adHrefs = [...sheet.matchAll(/href="(\.\/annunci\.html[^"]*)"/g)].map((m) => m[1])
  assert.ok(adHrefs.length >= 3)
  assert.ok(adHrefs.every((href) => href.includes('?cat=')))
  assert.match(sheet, /annunci\.html\?cat=gommoni/)
  assert.match(sheet, /annunci\.html\?cat=motori/)
  assert.match(sheet, /annunci\.html\?cat=rigide/)
  assert.match(sheet, /annunci\.html\?cat=vele/)
  assert.match(sheet, /accessori\.html/)
  assert.match(sheet, /status\.html/)
  assert.match(sheet, /equipaggio\.html/)
  assert.match(sheet, /Caccia/)
  assert.match(sheet, /Manifesto/)
  assert.match(sheet, /documenti\.html/)
  assert.match(sheet, /simulazioni\.html/)
})
