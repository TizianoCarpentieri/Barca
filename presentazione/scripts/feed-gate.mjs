import fs from 'node:fs'
import path from 'node:path'

import { hasHardHull } from './feed-normalizers.mjs'

export const MAX_AGE_MS = 2 * 60 * 60 * 1000

export const RULES = {
  annunci: { minItems: 10, soft: false },
  gommoni: { minItems: 10, soft: false },
  motori: { minItems: 10, soft: false },
  accessori: { minItems: 10, soft: false },
  vele: { minItems: 5, soft: true },
}

export function itemUrlKey(item) {
  return String(item?.url || item?.id || '')
}

export function findCrossFeedDuplicates(feeds) {
  const seen = new Map()
  for (const [name, items] of Object.entries(feeds)) {
    const local = new Set()
    for (const item of items || []) {
      const key = itemUrlKey(item)
      if (!key) continue
      if (local.has(key)) continue
      local.add(key)
      const entry = seen.get(key)
      if (entry) entry.feeds.push(name)
      else seen.set(key, { url: key, feeds: [name] })
    }
  }
  return [...seen.values()].filter((entry) => entry.feeds.length > 1)
}

function pushIssue(errors, warnings, soft, message) {
  if (soft) warnings.push(message)
  else errors.push(message)
}

function validateItems(name, items, rule, errors, warnings) {
  const seen = new Set()
  items.forEach((item, index) => {
    const where = `${name}[${index}]`
    if (!item.id || !item.subject || !item.url) {
      pushIssue(errors, warnings, rule.soft, `${where}: id, titolo o URL mancante`)
    }
    if (!Number.isFinite(item.price) || item.price <= 0) {
      pushIssue(errors, warnings, rule.soft, `${where}: prezzo non valido`)
    }
    const key = itemUrlKey(item)
    if (key && seen.has(key)) pushIssue(errors, warnings, rule.soft, `${where}: duplicato`)
    if (key) seen.add(key)
  })

  if (name === 'gommoni') {
    for (const item of items) {
      if (item.length_m != null && (!Number.isFinite(item.length_m) || item.length_m < 1.5 || item.length_m > 10)) {
        pushIssue(errors, warnings, rule.soft, `gommoni: lunghezza fuori scala ${item.length_m} (${item.subject})`)
      }
      if (hasHardHull(`${item.subject || ''} ${item.body || ''}`)) {
        pushIssue(errors, warnings, rule.soft, `gommoni: RIB/rigido sopravvissuto al filtro (${item.subject})`)
      }
      if (typeof item.has_engine !== 'boolean') {
        pushIssue(errors, warnings, rule.soft, `gommoni: has_engine non booleano (${item.subject})`)
      }
    }
  }

  if (name === 'motori') {
    for (const item of items) {
      if (item.cv != null && (!Number.isFinite(item.cv) || item.cv < 6 || item.cv > 40.8)) {
        pushIssue(errors, warnings, rule.soft, `motori: CV fuori requisito ${item.cv} (${item.subject})`)
      }
    }
  }

  if (name === 'vele') {
    for (const item of items) {
      if (item.length_m != null && (!Number.isFinite(item.length_m) || item.length_m < 2 || item.length_m > 24)) {
        pushIssue(errors, warnings, rule.soft, `vele: lunghezza fuori scala ${item.length_m} (${item.subject})`)
      }
      if (item.sail_type && !['cabinato', 'deriva'].includes(item.sail_type)) {
        pushIssue(errors, warnings, rule.soft, `vele: sail_type sconosciuto ${item.sail_type} (${item.subject})`)
      }
    }
  }
}

export function validateFeeds(dataDir, { now = Date.now(), maxAgeMs = MAX_AGE_MS } = {}) {
  const errors = []
  const warnings = []
  const summaries = []
  const loaded = {}

  for (const [name, rule] of Object.entries(RULES)) {
    const file = path.join(dataDir, `${name}.json`)
    if (!fs.existsSync(file)) {
      pushIssue(errors, warnings, rule.soft, `${name}: file mancante`)
      continue
    }

    let data
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (error) {
      pushIssue(errors, warnings, rule.soft, `${name}: JSON non valido (${error.message})`)
      continue
    }

    const updatedAt = Date.parse(data.updated_at)
    const items = Array.isArray(data.items) ? data.items : []
    if (!Number.isFinite(updatedAt) || now - updatedAt > maxAgeMs) {
      pushIssue(errors, warnings, rule.soft, `${name}: timestamp assente o piu' vecchio di 2 ore`)
    }
    if (items.length < rule.minItems) {
      pushIssue(errors, warnings, rule.soft, `${name}: solo ${items.length} annunci (minimo ${rule.minItems})`)
    }

    validateItems(name, items, rule, errors, warnings)
    loaded[name] = items
    summaries.push(`${name}: ${items.length} annunci, ${data.errors?.length || 0} errori fonte`)
  }

  const softOverlap = new Set(['vele', 'accessori'])
  for (const dupe of findCrossFeedDuplicates(loaded)) {
    const msg = `cross-feed duplicato ${dupe.feeds.join(' ∩ ')}: ${dupe.url}`
    if (dupe.feeds.some((name) => softOverlap.has(name))) warnings.push(msg)
    else errors.push(msg)
  }

  return { errors, warnings, summaries }
}
