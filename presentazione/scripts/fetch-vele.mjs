/**
 * Fetch annunci Subito per VELE — sogno parallelo Bestie (non piano A).
 * Focus: cabinati 6,5–9 m, fascia Comet 770, ≤9k (stretch 10k).
 * Scrive public/data/vele.json
 *
 * Uso: node scripts/fetch-vele.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { applyDistanceScore } from './geo-score.mjs'
import {
  extractPreferredPower,
  extractSailInventory,
  isClubDinghy,
  isSailboat,
  normalizeLengthMeters,
  sailTypeOf,
} from './feed-normalizers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/data/vele.json')
const RAW_OUT = path.join(__dirname, '../../raw/mercato')

const CAT = 22
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  Origin: 'https://www.subito.it',
  Referer: 'https://www.subito.it/annunci-italia/vendita/nautica/',
}
const PRICE_MIN = 1500
const PRICE_HARD = 9000
const PRICE_STRETCH = 10000

const QUERIES = [
  'barca a vela',
  'cabinato vela',
  'sloop',
  'Comet',
  'Comar vela',
  'barca a vela usata',
  'vela lazio',
  'vela anzio',
  'vela fiumicino',
  'vela nettuno',
  'comet 770',
  'cabinato 8 metri',
  'deriva cabinata',
  'barca a vela 7 metri',
]

const EXCLUDE_RE =
  /\b(gommone|semi[\s-]?rigido|semirigido|\brib\b|zodiac|windsurf|kitesurf|sup\b|canoa|kayak|moto d['’]?acqua|jet ski|caravan|camper)\b/i

const MOTOR_ONLY_RE =
  /^(vendo\s+)?(motore|fuoribordo|mercury|yamaha|suzuki|tohatsu|evinrude|johnson|honda\s+bf|selva)\b/i

const TRAILER_ONLY_RE = /\b(solo\s+)?(carrello|rimorchio)\b/i

function feat(ad, uri) {
  const f = (ad.features || []).find((x) => x.uri === uri)
  return f?.values?.[0] || null
}

function priceOf(ad) {
  const p = feat(ad, '/price')
  const n = parseInt(String(p?.key || p?.value || '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function extractLength(ad, subject, body) {
  return normalizeLengthMeters(feat(ad, '/ship_length')?.value, subject, body, { min: 2, max: 24 })
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
  const cv = extractPreferredPower(subject, body, 2, 300)
  const length_m = extractLength(ad, subject, body)
  const sail_type = sailTypeOf(text)
  const sails = extractSailInventory(text)
  const url = ad.urls?.default || ad.urls?.mobile || null
  const id = (ad.urn || url || subject).toString()

  return {
    id,
    source: 'subito',
    subject: subject.trim(),
    body: body.trim().slice(0, 600),
    price,
    cv,
    length_m,
    sail_type,
    sails,
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
  const blob = `${item.subject} ${item.body}`
  const reasons = []
  let score = 28
  let status = 'ok'

  if (item.price == null || item.price < PRICE_MIN) {
    return { status: 'reject', score: 0, reasons: ['prezzo assente/basso'] }
  }
  if (item.price > PRICE_STRETCH) {
    return { status: 'reject', score: 0, reasons: ['oltre stretch 10k'] }
  }
  if (EXCLUDE_RE.test(blob)) {
    return { status: 'reject', score: 0, reasons: ['fuori tipo'] }
  }
  if (MOTOR_ONLY_RE.test(item.subject.trim())) {
    return { status: 'reject', score: 0, reasons: ['solo motore'] }
  }
  if (TRAILER_ONLY_RE.test(item.subject) && !isSailboat(blob)) {
    return { status: 'reject', score: 0, reasons: ['solo carrello'] }
  }
  if (!isSailboat(blob)) {
    return { status: 'reject', score: 0, reasons: ['non vela'] }
  }

  if (item.price > PRICE_HARD) {
    status = 'stretch'
    score -= 8
    reasons.push('stretch >9k')
  } else {
    score += 10
  }

  if (item.sail_type === 'deriva' || isClubDinghy(blob)) {
    score -= 18
    reasons.push('deriva/club — poco fit 3–4 adulti')
    if (status === 'ok') status = 'weak'
  } else {
    score += 12
    reasons.push('cabinato')
  }

  if (item.length_m != null) {
    if (item.length_m >= 7.3 && item.length_m <= 8.2) {
      score += 22
      reasons.push('classe Comet ~7,5–8 m')
    } else if (item.length_m >= 6.5 && item.length_m <= 9) {
      score += 14
      reasons.push(`${item.length_m} m nel range 6,5–9`)
    } else if (item.length_m < 6) {
      score -= 12
      reasons.push('corta per 3 adulti')
    } else if (item.length_m > 10) {
      score -= 16
      reasons.push('>10 m: TCO e patente-imbarcazione')
      if (status === 'ok') status = 'weak'
    }
  } else {
    score -= 3
    reasons.push('lunghezza n.d.')
  }

  if (/comet\s*770|cometino/i.test(blob)) {
    score += 18
    reasons.push('Comet 770')
  } else if (/\bcomet|comar|finot\b/i.test(blob)) {
    score += 10
    reasons.push('Comet/Comar/Finot')
  }

  if (item.cv != null) {
    if (item.cv <= 40.8) {
      score += 8
      reasons.push(`ausiliario ${item.cv} CV no-patente`)
    } else {
      score -= 14
      reasons.push(`motore ${item.cv} CV → patente`)
    }
  }

  if (item.region === 'Lazio' || /lazio|anzio|nettuno|fiumicino|ardea|pomezia/i.test(item.place || '')) {
    score += 10
    reasons.push('Lazio')
  }

  const geo = applyDistanceScore(item, score, reasons)
  score = geo.score
  if (score < 40 && status === 'ok') status = 'weak'

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
      const json = await search(q, 0)
      const ads = json.items || json.ads || json.results || []
      for (const ad of ads) {
        const item = normalize(ad)
        if (!item.url) continue
        if (!byId.has(item.id)) byId.set(item.id, item)
      }
      process.stderr.write(`q=${q} → ${ads.length}\n`)
    } catch (e) {
      errors.push(`${q}: ${e.message}`)
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
      fit:
        c.status === 'ok' && c.score >= 55
          ? 'alto'
          : c.status === 'stretch'
            ? 'stretch'
            : c.score >= 45
              ? 'medio'
              : 'basso',
    })
  }

  listings.sort((a, b) => b.score - a.score || (a.price || 9e9) - (b.price || 9e9))
  const top = listings.slice(0, 80)
  const lazio = top.filter((x) => x.region === 'Lazio' || /lazio/i.test(x.place))
  const payload = {
    updated_at: new Date().toISOString(),
    source: 'subito.it via hades.subito.it',
    filters: {
      price_eur: `${PRICE_MIN}–${PRICE_HARD} (stretch ≤${PRICE_STRETCH})`,
      type: 'cabinato a vela 6,5–9 m (sogno parallelo, non piano A)',
      reference: 'Comet 770 7,68 m',
      engine: 'ausiliario ≤40,8 CV preferibile',
      note: 'Osservazione. Non è una shortlist d’acquisto. TCO ormeggio Lazio da verificare prima di qualsiasi visita.',
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
  process.stderr.write(`Wrote ${OUT} (${top.length} items, scanned ${byId.size})\n`)

  try {
    fs.mkdirSync(RAW_OUT, { recursive: true })
    const day = new Date().toISOString().slice(0, 10)
    fs.writeFileSync(path.join(RAW_OUT, `subito-vele-${day}.json`), JSON.stringify(payload, null, 2))
  } catch {
    /* ignore */
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
