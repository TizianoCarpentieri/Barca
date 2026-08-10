/**
 * Fetch annunci Subito per MOTORI FUORIBORDO adatti a gommoni 3.3–4 m (es. Argo-Evo 360).
 * Min 6 CV (scarta 2.5/3.5/4 — troppo piccoli). Ideale 9.9–15–20 CV. Max 40.8 no-patente.
 * 4 tempi + gambo corto preferiti.
 *
 * Scrive public/data/motori.json
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { applyDistanceScore } from './geo-score.mjs'
import { extractPreferredBrand, extractPreferredPower, extractPreferredShaft } from './feed-normalizers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/data/motori.json')
const RAW_OUT = path.join(__dirname, '../../raw/mercato')

const CAT = 22 // Nautica
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  Origin: 'https://www.subito.it',
  Referer: 'https://www.subito.it/annunci-italia/vendita/nautica/',
}

const PRICE_MIN = 200
const PRICE_HARD = 1200
const PRICE_STRETCH = 1600
const MIN_CV = 6 // sotto: troppo piccoli per gommoni 3.5–4 m (scarta 2.5 / 3.5 / 4)
const IDEAL_CV_MIN = 8
const IDEAL_CV_MAX = 20
const SWEET_CV_MIN = 9.9
const SWEET_CV_MAX = 15
const MAX_CV = 40.8

const QUERIES = [
  'fuoribordo 9.9',
  'fuoribordo 15',
  'fuoribordo 20',
  'yamaha 9.9',
  'yamaha 15 4t',
  'yamaha 20 4t',
  'suzuki 9.9',
  'suzuki 15 4t',
  'suzuki df15',
  'suzuki df20',
  'mercury 9.9',
  'mercury 15 4 tempi',
  'mercury 20 4t',
  'tohatsu 9.9',
  'tohatsu 15',
  'honda 10',
  'honda 15 4t',
  'hidea 9.9',
  'hidea 15',
  'motore 10 cv 4t',
  'motore 15 cv 4t',
  'fuoribordo 8 cv 4t',
  'fuoribordo lazio 15',
  'fuoribordo lazio 9.9',
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

function extractCv(text, subject = '') {
  if (!text && !subject) return null
  // Preferisci CV dal titolo (più affidabile)
  const pick = (src) => {
    if (!src) return []
    const t = src.replace(',', '.')
    const cvs = []
    const re = /(\d{1,2}(?:\.\d)?)\s*(?:cv|hp|cavalli)\b/gi
    let m
    while ((m = re.exec(t))) cvs.push(parseFloat(m[1]))
    return cvs.filter((n) => n > 0 && n < 200)
  }
  const fromSub = pick(subject)
  if (fromSub.length) {
    // nel titolo di solito c'è la potenza reale; prendi il max ragionevole ≤40.8
    const ok = fromSub.filter((n) => n <= MAX_CV)
    return ok.length ? Math.max(...ok) : Math.max(...fromSub)
  }
  const fromAll = pick(text)
  if (!fromAll.length) return null
  // evita di prendere "2.5" da confronti se c'è anche un 15 nel body
  const useful = fromAll.filter((n) => n >= MIN_CV && n <= MAX_CV)
  if (useful.length) return Math.max(...useful)
  return Math.max(...fromAll)
}

function is4T(text) {
  return /4\s*tempi|4t|4 tempi|four stroke|4 stroke/i.test(text)
}

function is2T(text) {
  return /\b2\s*tempi|2t\b/i.test(text) && !is4T(text)
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
  const cv = extractPreferredPower(subject, body, MIN_CV, MAX_CV)
  const brand = extractPreferredBrand(subject, body)
  const fourStroke = is4T(text)
  const twoStroke = is2T(text)
  const shaft = extractPreferredShaft(subject, body)
  const url = ad.urls?.default || ad.urls?.mobile || null
  const id = (ad.urn || url || subject).toString()

  return {
    id,
    source: 'subito',
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

  // Potenza — scarta i “motorini” 2.5/3.5/4 CV (troppo piccoli per 3.5–4 m)
  if (item.cv != null) {
    if (item.cv > MAX_CV) {
      return { status: 'reject', score: 0, reasons: [`${item.cv} CV > ${MAX_CV}`] }
    }
    if (item.cv < MIN_CV) {
      return { status: 'reject', score: 0, reasons: [`${item.cv} CV troppo piccolo (min ${MIN_CV})`] }
    }
    if (item.cv >= SWEET_CV_MIN && item.cv <= SWEET_CV_MAX) {
      score += 28
      reasons.push(`${item.cv} CV (sweet 9.9–15)`)
    } else if (item.cv >= IDEAL_CV_MIN && item.cv <= IDEAL_CV_MAX) {
      score += 20
      reasons.push(`${item.cv} CV (ideale 8–20)`)
    } else if (item.cv >= MIN_CV && item.cv < IDEAL_CV_MIN) {
      score += 4
      reasons.push(`${item.cv} CV (al limite basso)`)
    } else if (item.cv <= 25) {
      score += 8
      reasons.push(`${item.cv} CV`)
    } else {
      score -= 4
      reasons.push(`${item.cv} CV alto`)
    }
  } else {
    reasons.push('CV n.d. — verificare')
    score -= 8
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
      power: `${MIN_CV}–${MAX_CV} CV (scarta <${MIN_CV}; sweet 9.9–15; ideale 8–20)`,
      type: 'fuoribordo 4 tempi preferiti, gambo corto',
      note: 'Niente 2.5/4 CV: troppo piccoli per gommoni 3.5–4 m. Target 9.9–15–20 CV. Verifica ore, revisione e gambo.',
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
