import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { hasHardHull } from './feed-normalizers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../public/data')
const MAX_AGE_MS = 2 * 60 * 60 * 1000
const RULES = {
  annunci: { minItems: 10 },
  gommoni: { minItems: 10 },
  motori: { minItems: 10 },
  accessori: { minItems: 10 },
}

const errors = []
const summaries = []

for (const [name, rule] of Object.entries(RULES)) {
  const file = path.join(DATA_DIR, `${name}.json`)
  if (!fs.existsSync(file)) {
    errors.push(`${name}: file mancante`)
    continue
  }

  let data
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    errors.push(`${name}: JSON non valido (${error.message})`)
    continue
  }

  const updatedAt = Date.parse(data.updated_at)
  const items = Array.isArray(data.items) ? data.items : []
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > MAX_AGE_MS) {
    errors.push(`${name}: timestamp assente o piu' vecchio di 2 ore`)
  }
  if (items.length < rule.minItems) {
    errors.push(`${name}: solo ${items.length} annunci (minimo ${rule.minItems})`)
  }

  const seen = new Set()
  items.forEach((item, index) => {
    const where = `${name}[${index}]`
    if (!item.id || !item.subject || !item.url) errors.push(`${where}: id, titolo o URL mancante`)
    if (!Number.isFinite(item.price) || item.price <= 0) errors.push(`${where}: prezzo non valido`)
    const key = String(item.url || item.id || '')
    if (seen.has(key)) errors.push(`${where}: duplicato`)
    seen.add(key)
  })

  if (name === 'gommoni') {
    for (const item of items) {
      if (item.length_m != null && (!Number.isFinite(item.length_m) || item.length_m < 1.5 || item.length_m > 10)) {
        errors.push(`gommoni: lunghezza fuori scala ${item.length_m} (${item.subject})`)
      }
      if (hasHardHull(`${item.subject || ''} ${item.body || ''}`)) {
        errors.push(`gommoni: RIB/rigido sopravvissuto al filtro (${item.subject})`)
      }
      if (typeof item.has_engine !== 'boolean') {
        errors.push(`gommoni: has_engine non booleano (${item.subject})`)
      }
    }
  }

  if (name === 'motori') {
    for (const item of items) {
      if (item.cv != null && (!Number.isFinite(item.cv) || item.cv < 6 || item.cv > 40.8)) {
        errors.push(`motori: CV fuori requisito ${item.cv} (${item.subject})`)
      }
    }
  }

  summaries.push(`${name}: ${items.length} annunci, ${data.errors?.length || 0} errori fonte`)
}

if (errors.length) {
  console.error(`Feed gate FALLITO (${errors.length}):`)
  errors.slice(0, 30).forEach((error) => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`Feed gate OK · ${summaries.join(' · ')}`)
