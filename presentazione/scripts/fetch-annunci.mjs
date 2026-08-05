/**
 * Fetch annunci Subito (hades) allineati ai requisiti Bestie.
 * Scrive public/data/annunci.json (servito statico su GitHub Pages).
 *
 * Uso: node scripts/fetch-annunci.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/data/annunci.json')
const RAW_OUT = path.join(__dirname, '../../../raw/mercato')

const CAT = 22 // Nautica
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  Origin: 'https://www.subito.it',
  Referer: 'https://www.subito.it/annunci-italia/vendita/nautica/',
}
const PRICE_MIN = 800
const PRICE_HARD = 4500
const PRICE_STRETCH = 5500
const MAX_CV = 40.8

const QUERIES = [
  'gozzo motore',
  'gozzo fuoribordo',
  'open motore',
  'lancia motore',
  'barca pesca motore',
  'gozzo vtr',
  'gozzo legno motore',
  'barca a motore usata',
  'gozzo anzio',
  'gozzo fiumicino',
  'gozzo nettuno',
  'gozzo lazio',
  'open fishing',
  'barca senza patente',
]

const EXCLUDE_RE =
  /\b(gommone|semi[\s-]?rigido|semirigido|\brib\b|zodiac|tubolar|joker\s*boat|novamarine|bwa\b|scanner\s+\d|lomac|williams|capelli\s+tempest|nuova\s+jolly|mitsubishi\s+pajero|auto\b|moto\b|caravan|camper)\b/i

const MOTOR_ONLY_RE =
  /^(vendo\s+)?(motore|fuoribordo|mercury|yamaha|suzuki|tohatsu|evinrude|johnson|honda\s+bf|selva)\b/i

const HULL_HINT_RE =
  /\b(gozzo|open|lancia|barca|fishing|walkaround|vtr|vetroresina|scafo|imbarcazione|pesc)\b/i

const TRAILER_ONLY_RE = /\b(solo\s+)?carrello\b/i

const LAZIO_TOWNS =
  /\b(anzio|nettuno|pomezia|ardea|fiumicino|roma|ostia|circeo|san\s*felice|sperlonga|gaeta|formia|latina|civitavecchia|santa\s*marinella|ladispoli|torvaianica|ardea)\b/i

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
  const all = [...cvs, ...kws].filter((n) => n > 0 && n < 300)
  if (!all.length) return null
  return Math.max(...all)
}

function extractLength(ad, text) {
  const f = feat(ad, '/ship_length')
  if (f?.value) {
    const n = parseFloat(String(f.value).replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  const m = String(text).match(/(\d(?:[.,]\d)?)\s*m(?:etri)?\b/i)
  return m ? parseFloat(m[1].replace(',', '.')) : null
}

function imgUrl(ad) {
  const im = ad.images?.[0]
  if (!im) return null
  const base = im.cdn_base_url || im.base_url
  if (!base) return null
  // formato tipico CDN subito
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
  const length_m = extractLength(ad, text)
  const url = ad.urls?.default || ad.urls?.mobile || null
  const id = (ad.urn || url || subject).toString()
  const shipType = feat(ad, '/ship_type')?.value || null

  return {
    id,
    subject: subject.trim(),
    body: body.trim().slice(0, 600),
    price,
    cv,
    length_m,
    ship_type: shipType,
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
  let score = 40
  let status = 'ok' // ok | stretch | weak | reject

  if (item.price == null || item.price < PRICE_MIN) {
    return { status: 'reject', score: 0, reasons: ['prezzo assente/basso'] }
  }
  if (item.price > PRICE_STRETCH) {
    return { status: 'reject', score: 0, reasons: ['oltre stretch'] }
  }
  if (item.price > PRICE_HARD) {
    status = 'stretch'
    score -= 15
    reasons.push('stretch >4500€')
  } else {
    score += 12
  }

  if (EXCLUDE_RE.test(blob)) {
    return { status: 'reject', score: 0, reasons: ['gommone/RIB/escluso'] }
  }
  if (TRAILER_ONLY_RE.test(item.subject) && !HULL_HINT_RE.test(blob)) {
    return { status: 'reject', score: 0, reasons: ['solo carrello'] }
  }
  if (MOTOR_ONLY_RE.test(item.subject.trim()) && !HULL_HINT_RE.test(item.subject)) {
    // spesso solo motore
    if (!HULL_HINT_RE.test(blob) || /solo\s+motore|vendesi\s+motore/i.test(blob)) {
      return { status: 'reject', score: 0, reasons: ['solo motore'] }
    }
  }

  if (!HULL_HINT_RE.test(blob) && !/barca a motore/i.test(item.ship_type || '')) {
    status = status === 'ok' ? 'weak' : status
    score -= 20
    reasons.push('scafo poco chiaro')
  }

  if (/\bgozzo\b/i.test(blob)) {
    score += 18
    reasons.push('gozzo')
  }
  if (/\bopen\b/i.test(blob)) {
    score += 12
    reasons.push('open')
  }
  if (/\blancia\b/i.test(blob)) {
    score += 10
    reasons.push('lancia')
  }
  if (/tendalino|bimini|copertura/i.test(blob)) {
    score += 6
    reasons.push('tendalino?')
  }
  if (/pesc/i.test(blob)) {
    score += 5
    reasons.push('pesca')
  }

  if (item.cv != null) {
    if (item.cv > MAX_CV + 0.2) {
      return { status: 'reject', score: 0, reasons: [`cv ${item.cv} > 40,8`] }
    }
    score += 10
    reasons.push(`cv≤40,8 (${item.cv})`)
  } else {
    reasons.push('cv n.d. — verificare')
    score -= 3
  }

  if (item.region === 'Lazio' || LAZIO_TOWNS.test(blob) || LAZIO_TOWNS.test(item.place)) {
    score += 28
    reasons.push('Lazio')
  } else if (/toscana|campania|umbria|abruzzo|marche/i.test(item.region)) {
    score += 8
    reasons.push('centro IT')
  }

  if (item.length_m != null) {
    if (item.length_m >= 4.2 && item.length_m <= 6.5) score += 6
    if (item.length_m > 8) score -= 10
  }

  if (score < 35 && status === 'ok') status = 'weak'

  return { status, score, reasons }
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
      // seconda pagina se tanti risultati
      if ((data.count_all || 0) > 50) {
        const data2 = await search(q, 50)
        for (const ad of data2.ads || []) {
          const n = normalize(ad)
          if (!n.url || !n.subject) continue
          const key = n.url.replace(/[?#].*$/, '')
          if (!byId.has(key)) byId.set(key, n)
        }
      }
      await new Promise((r) => setTimeout(r, 350))
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
      hull: 'rigido (no gommone/RIB)',
      engine: `≤${MAX_CV} CV se dichiarato`,
      category: 'Nautica',
      note: 'Feed automatico non ufficiale. Verificare sempre potenza/cilindrata/documenti sull’annuncio.',
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

  // snapshot raw opzionale
  try {
    fs.mkdirSync(RAW_OUT, { recursive: true })
    const day = new Date().toISOString().slice(0, 10)
    fs.writeFileSync(
      path.join(RAW_OUT, `subito-feed-${day}.json`),
      JSON.stringify(payload, null, 2),
    )
  } catch {
    /* ignore */
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
