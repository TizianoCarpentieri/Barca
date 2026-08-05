/**
 * Fetch annunci Subito per MOTORI FUORIBORDO piccoli (adatti gommoni 3.3-4m e barche senza patente).
 * Focus: 4 tempi preferiti, gambo corto, potenza utile per gommoni (5-20 HP ideale), fino a ~25-40 CV max.
 * Pagina parallela ai feed rigidi e gommoni.
 *
 * Scrive public/data/motori.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { applyDistanceScore } from './geo-score.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/data/motori.json')
const RAW_OUT = path.join(__dirname, '../../../raw/mercato')

const CAT = 22 // Nautica
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  Origin: 'https://www.subito.it',
  Referer: 'https://www.subito.it/annunci-italia/vendita/nautica/',
}

const PRICE_MIN = 120
const PRICE_HARD = 900
const PRICE_STRETCH = 1100
const MAX_CV = 40.8

const QUERIES = [
  'motore fuoribordo',
  'fuoribordo 4 tempi',
  'fuoribordo 4t',
  'yamaha 9.9',
  'yamaha 15',
  'suzuki 10',
  'suzuki 15 4t',
  'mercury 9.9',
  'mercury 15 4 tempi',
  'tohatsu 8',
  'tohatsu 15',
  'hidea 9.9',
  'motore 10 cv',
  'motore 15 cv 4t',
  'fuoribordo 20 cv',
  'fuoribordo usato 4 tempi',
  'motore fuoribordo lazio',
  'yamaha 4t usato',
  'suzuki df',
]

const EXCLUDE_BIG_RE = /\b(40|50|60|70|80|90|100|115|150)\s*(cv|hp|cavalli)\b/i
const EXCLUDE_INBOARD_SAIL = /\b(entrobordo|inboard|diesel|barca a vela|ausiliario vela|motore entrobordo)\b/i
const ONLY_MOTOR_RE = /\b(solo\s+motor|motore\s+solo|ricambio|pezzi)\b/i

const LAZIO_TOWNS = /\b(anzio|nettuno|pomezia|ardea|fiumicino|roma|ostia|circeo|san\s*felice|gaeta|formia|latina|civitavecchia|ladispoli|torvaianica)\b/i

const GOOD_BRANDS = ['yamaha', 'suzuki', 'mercury', 'tohatsu', 'hidea', 'honda', 'selva']

function feat(ad, uri) {
  const f = (ad.features || []).find((x) => x.uri === uri)
  return f?.values?.[0] || null
}

function priceOf(ad) {
  const p = feat(ad, '/price')
  const n = parseInt(String(p?.key || p?.value || '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function extractCv(text) {
  if (!text) return null
  const t = text.replace(',', '.')
  const cvs = []
  const re = /(\d{1,2}(?:\.\d)?)\s*(?:cv|hp|cavalli)\b/gi
  let m
  while ((m = re.exec(t))) cvs.push(parseFloat(m[1]))
  const kws = []
  const rekw = /(\d{1,2}(?:\.\d)?)\s*kw\b/gi
  while ((m = rekw.exec(t))) kws.push(parseFloat(m[1]) * 1.3596)
  const all = [...cvs, ...kws].filter((n) => n > 0 && n < 200)
  if (!all.length) return null
  return Math.max(...all)
}

function extractBrand(text) {
  const t = text.toLowerCase()
  for (const b of GOOD_BRANDS) {
    if (t.includes(b)) return b
  }
  const m = t.match(/\b(yamaha|suzuki|mercury|tohatsu|hidea|honda|selva|evinrude|johnson)\b/i)
  return m ? m[1].toLowerCase() : null
}

function is4T(text) {
  return /4\s*tempi|4t|4 tempi|four stroke|4 stroke/i.test(text)
}

function is2T(text) {
  return /\b2\s*tempi|2t\b/i.test(text) && !is4T(text)
}

function extractShaft(text) {
  const t = text.toLowerCase()
  if (/gambo corto|short shaft|15["”]|381\s*mm/.test(t)) return 'corto'
  if (/gambo lungo|long shaft|20["”]|508\s*mm/.test(t)) return 'lungo'
  return null
}

function imgUrl(ad) {
  const im = ad.images?.[0]
  if (!im) return null
  const base = im.cdn_base_url || im.base_url
  if (!base) return null
  if (base.includes('images.sbito.it')) return `${base}?rule=gallery-desktop-2x-auto`
  return `${base}-16_83.jpg`
}

async function search(q, start = 0) {
  const u = new URL('https://hades.subito.it/v1/search/items')
  u.searchParams.set('q', q)
  u.searchParams.set('c', String(CAT))
  u.searchParams.set('t', 's')
  u.searchParams.set('lim', '50')
  u.searchParams.set('start', String(start))
  u.searchParams.set('prs', `${PRICE_MIN}-${PRICE_STRETCH}`)
  const res = await fetch(u, { headers: HEADERS })
  if (!res.ok) throw new Error(`Subito ${res.status} q=${q}`)
  return res.json()
}

function normalize(ad) {
  const subject = ad.subject || ''
  const body = ad.body || ''
  const text = `${subject}\n${body}`
  const price = priceOf(ad)
  const region = ad.geo?.region?.value || ''
  const city = ad.geo?.city?.value || ''
  const town = ad.geo?.town?.value || ''
  const place = [town, city, region].filter(Boolean).join(' · ')
  const cv = extractCv(text)
  const brand = extractBrand(text)
  const fourStroke = is4T(text)
  const twoStroke = is2T(text)
  const shaft = extractShaft(text)
  const url = ad.urls?.default || ad.urls?.mobile || null
  const id = (ad.urn || url || subject).toString()

  return {
    id,
    subject: subject.trim(),
    body: body.trim().slice(0, 500),
    price,
    cv,
    brand,
    four_stroke: fourStroke,
    two_stroke: twoStroke,
    shaft,
    region,
    city,
    town,
    place,
    url,
    image: imgUrl(ad),
    date: ad.dates?.display_iso8601 || ad.dates?.display || null,
  }
}

function classify(item) {
  const blob = `${item.subject} ${item.body}`.toLowerCase()
  const reasons = []
  let score = 20
  let status = 'ok'

  if (item.price == null || item.price < PRICE_MIN) {
    return { status: 'reject', score: 0, reasons: ['prezzo assente/basso'] }
  }
  if (item.price > PRICE_STRETCH) {
    return { status: 'reject', score: 0, reasons: ['oltre stretch'] }
  }
  if (item.price > PRICE_HARD) {
    status = 'stretch'
    score -= 8
    reasons.push('stretch')
  }

  if (EXCLUDE_BIG_RE.test(blob)) {
    return { status: 'reject', score: 0, reasons: ['troppo potente'] }
  }
  if (EXCLUDE_INBOARD_SAIL.test(blob)) {
    return { status: 'reject', score: 0, reasons: ['non fuoribordo'] }
  }
  if (ONLY_MOTOR_RE.test(blob) && !/fuoribordo|yamaha|suzuki|mercury/i.test(blob)) {
    // troppi "solo motore" senza contesto
  }

  // Potenza
  if (item.cv != null) {
    if (item.cv > MAX_CV) {
      return { status: 'reject', score: 0, reasons: [`${item.cv} CV > ${MAX_CV}`] }
    }
    if (item.cv >= 5 && item.cv <= 15) {
      score += 22
      reasons.push(`${item.cv} CV (ideale gommoni)`)
    } else if (item.cv <= 20) {
      score += 14
      reasons.push(`${item.cv} CV`)
    } else if (item.cv <= 25) {
      score += 6
    } else {
      score -= 4
    }
  } else {
    reasons.push('CV n.d. — verificare')
    score -= 5
  }

  // 4 tempi forte preferito
  if (item.four_stroke) {
    score += 18
    reasons.push('4 tempi')
  } else if (item.two_stroke) {
    score -= 6
    reasons.push('2 tempi')
  }

  // Marca buona
  if (item.brand) {
    if (['yamaha', 'suzuki', 'mercury', 'tohatsu'].includes(item.brand)) {
      score += 12
      reasons.push(item.brand)
    } else {
      score += 4
      reasons.push(item.brand)
    }
  }

  // Gambo corto preferito per gommoni piccoli
  if (item.shaft === 'corto') {
    score += 10
    reasons.push('gambo corto')
  } else if (item.shaft === 'lungo') {
    score -= 3
  }

  // Condizione / ore
  if (/poco usato|come nuovo|revisione|tagliando|perfetto|ottime condizioni/.test(blob)) {
    score += 10
    reasons.push('buone condizioni')
  }
  if (/ore|hours/.test(blob)) {
    score += 3
  }
  if (/da revisionare|non parte|problemi|rotto/.test(blob)) {
    score -= 15
    reasons.push('condizioni dubbiose')
  }

  // Lazio / centro
  if (item.region === 'Lazio' || LAZIO_TOWNS.test(blob) || LAZIO_TOWNS.test(item.place)) {
    score += 20
    reasons.push('Lazio')
  } else if (/toscana|campania|marche|abruzzo/.test(item.region)) {
    score += 5
  }

  // Distanza da base (Ardea/Pomezia): lontano = come se costasse di più
  const geo = applyDistanceScore(item, score, reasons)
  score = geo.score

  if (score < 30 && status === 'ok') status = 'weak'

  return {
    status,
    score,
    reasons,
    distance_factor: geo.factor,
    effective_price: geo.effectivePrice,
  }
}

async function main() {
  const byId = new Map()
  const errors = []

  for (const q of QUERIES) {
    try {
      process.stderr.write(`query: ${q}\n`)
      const data = await search(q, 0)
      for (const ad of data.ads || []) {
        const n = normalize(ad)
        if (!n.url || !n.subject) continue
        const key = n.url.replace(/[?#].*$/, '')
        if (!byId.has(key)) byId.set(key, n)
      }
      if ((data.count_all || 0) > 50) {
        const data2 = await search(q, 50)
        for (const ad of data2.ads || []) {
          const n = normalize(ad)
          if (!n.url || !n.subject) continue
          const key = n.url.replace(/[?#].*$/, '')
          if (!byId.has(key)) byId.set(key, n)
        }
      }
      await new Promise((r) => setTimeout(r, 320))
    } catch (e) {
      errors.push(String(e.message || e))
      process.stderr.write(`ERR ${q}: ${e.message}\n`)
    }
  }

  const listings = []
  for (const item of byId.values()) {
    const c = classify(item)
    if (c.status === 'reject') continue
    listings.push({
      ...item,
      status: c.status,
      score: c.score,
      reasons: c.reasons,
      distance_factor: c.distance_factor ?? 1,
      effective_price: c.effective_price ?? item.price,
      fit: c.status === 'ok' && c.score >= 55 ? 'alto'
        : c.status === 'stretch' ? 'stretch'
        : c.score >= 40 ? 'medio' : 'basso',
    })
  }

  listings.sort((a, b) => b.score - a.score || (a.price || 9e9) - (b.price || 9e9))

  const top = listings.slice(0, 70)
  const lazio = top.filter((x) => x.region === 'Lazio' || /lazio/i.test(x.place || ''))
  const payload = {
    updated_at: new Date().toISOString(),
    source: 'subito.it via hades.subito.it',
    filters: {
      price_eur: `${PRICE_MIN}–${PRICE_HARD} (stretch ≤${PRICE_STRETCH})`,
      power: `≤${MAX_CV} CV (ideale 5-20 CV per gommoni piccoli)`,
      type: 'fuoribordo 4 tempi preferiti, gambo corto',
      note: 'Feed parallelo per motori adatti a gommoni 3.3-4m e barche no-patente. Verifica sempre ore, revisione e compatibilità gambo.',
    },
    stats: {
      scanned_unique: byId.size,
      kept: listings.length,
      shown: top.length,
      lazio_in_shown: lazio.length,
      ok: top.filter((x) => x.status === 'ok').length,
      stretch: top.filter((x) => x.status === 'stretch').length,
      weak: top.filter((x) => x.status === 'weak').length,
    },
    errors,
    items: top,
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2))
  process.stderr.write(`Wrote ${OUT} (${top.length} items)\n`)

  try {
    fs.mkdirSync(RAW_OUT, { recursive: true })
    const day = new Date().toISOString().slice(0, 10)
    fs.writeFileSync(path.join(RAW_OUT, `subito-motori-${day}.json`), JSON.stringify(payload, null, 2))
  } catch {}
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
