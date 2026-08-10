/**
 * Fetch annunci Subito (hades) per GOMMONI — requisiti Bestie.
 * Focus: gommoni pneumatici puri (no RIB scafo rigido), piccoli, trasportabili auto, pesca.
 * Scrive public/data/gommoni.json
 *
 * Uso: node scripts/fetch-gommoni.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { applyDistanceScore } from './geo-score.mjs'
import { detectIncludedMotor, hasHardHull, normalizeBoatLength } from './feed-normalizers.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/data/gommoni.json')
const RAW_OUT = path.join(__dirname, '../../raw/mercato')

const CAT = 22 // Nautica
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  Origin: 'https://www.subito.it',
  Referer: 'https://www.subito.it/annunci-italia/vendita/nautica/',
}
const PRICE_MIN = 300
const PRICE_HARD = 1500
const PRICE_STRETCH = 5500

// Reference product benchmark (Argo-Evo 360 AL a 970€ nuovo)
// Regola: usato praticamente identico deve costare almeno 20% in meno (= ~776€)
const REF_NEW_PRICE = 970
const REF_DISCOUNTED_THRESHOLD = Math.round(REF_NEW_PRICE * 0.8)  // 776 €
const REF_LEN_MIN = 3.5
const REF_LEN_MAX = 3.75
const REF_PRICE_PENALTY = REF_DISCOUNTED_THRESHOLD   // sopra questo senza motore buono → penalità forte
const REF_BUNDLE_MAX_TOTAL = 1350 // totale barca + motore interessante (da regolare)

const QUERIES = [
  'gommone',
  'gommone pesca',
  'gommone fuoribordo',
  'gommone 3.5',
  'gommone 3.6',
  'gommone 3.8',
  'gommone 350',
  'gommone 360',
  'gommone 380',
  'gommone airdeck',
  'gommone paiolato',
  'gommone alluminio',
  'gommone smontabile',
  'gommone pneumatico',
  'gommone tender',
  'gommone lazio',
  'gommone anzio',
  'gommone fiumicino',
  'gommone circeo',
  'gommone 4 persone',
  'gommone 3.30',
  'gommone 3.70',
]

const EXCLUDE_RIGID_RE =
  /\b(gozzo|open|lancia|walkaround|barca a motore|vtr|vetroresina|scafo rigido|imbarcazione rigida|gommoni? rigido)\b/i

const MOTOR_ONLY_RE =
  /^(vendo\s+)?(motore|fuoribordo|mercury|yamaha|suzuki|tohatsu|evinrude|johnson|honda\s+bf|selva)\b/i

const TRAILER_ONLY_RE = /\b(solo\s+)?(carrello|rimorchio)\b/i

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

function extractLength(ad, subject, body) {
  const f = feat(ad, '/ship_length')
  return normalizeBoatLength(f?.value, subject, body)
}

function extractPersons(text) {
  if (!text) return null
  const m = text.match(/(\d{1,2})\s*(?:persone|posti|pers\.|persone\s+trasportabili)/i)
  return m ? parseInt(m[1], 10) : null
}

function extractFloor(text) {
  const t = text.toLowerCase()
  if (/paiolato.*alluminio|alluminio.*(paiolato|pavimento)|pavimento in alluminio/.test(t)) return 'paiolato alluminio'
  if (/airdeck|air.?deck|alta pressione|high pressure floor/.test(t)) return 'airdeck'
  if (/stecche|legno|wood floor/.test(t)) return 'stecche legno'
  if (/pavimento gonfiabile|gonfiabile/.test(t)) return 'gonfiabile'
  return null
}

function extractKeel(text) {
  const t = text.toLowerCase()
  if (/chiglia gonfiabile|chiglia a v gonfiabile|inflatable keel|chiglia v/.test(t)) return 'gonfiabile'
  if (/chiglia/.test(t)) return 'chiglia'
  return null
}

function matchesArgoEvo360Ref(item, blob) {
  const len = item.length_m || 0
  const floorStr = (item.floor || '').toLowerCase() + ' ' + blob
  const hasAluFloor = /paiolato.*alluminio|alluminio.*(pavimento|floor)|pavimento alluminio/.test(floorStr)
  const hasInflKeel = (item.keel || '').includes('gonfiabile') || /chiglia.*gonfiabile|inflatable keel/.test(blob)
  const goodLen = len >= REF_LEN_MIN && len <= REF_LEN_MAX
  const goodCap = !item.persons || item.persons >= 4
  return goodLen && hasAluFloor && hasInflKeel && goodCap
}

function hasDecentMotor(item, blob) {
  if (!item.has_engine || item.cv == null || item.cv < 5 || item.cv > 25) return false
  return /motore|fuoribordo/i.test(blob)
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
  const has_engine = detectIncludedMotor(text, cv)
  const length_m = extractLength(ad, subject, body)
  const persons = extractPersons(text)
  const floor = extractFloor(text)
  const keel = extractKeel(text)
  const url = ad.urls?.default || ad.urls?.mobile || null
  const id = (ad.urn || url || subject).toString()
  const shipType = feat(ad, '/ship_type')?.value || null

  return {
    id,
    source: 'subito',
    subject: subject.trim(),
    body: body.trim().slice(0, 600),
    price,
    cv,
    has_engine,
    length_m,
    persons,
    floor,
    keel,
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
  let score = 30
  let status = 'ok'

  if (item.price == null || item.price < PRICE_MIN) {
    return { status: 'reject', score: 0, reasons: ['prezzo assente/basso'] }
  }
  if (item.price > PRICE_STRETCH) {
    return { status: 'reject', score: 0, reasons: ['oltre stretch'] }
  }
  if (item.price > PRICE_HARD) {
    status = 'stretch'
    score -= 10
    reasons.push('stretch >4500€')
  } else {
    score += 8
  }

  // Deve essere gommone
  const isGommone = /\bgommone\b/i.test(blob) || /gommone/i.test(item.ship_type || '')
  if (!isGommone) {
    return { status: 'reject', score: 0, reasons: ['non gommone'] }
  }

  // Escludi rigidi e RIB con scafo rigido
  if (EXCLUDE_RIGID_RE.test(blob)) {
    return { status: 'reject', score: 0, reasons: ['scafo rigido/gozzo/open'] }
  }
  if (hasHardHull(blob)) {
    return { status: 'reject', score: 0, reasons: ['RIB/scafo o chiglia rigida'] }
  }

  if (TRAILER_ONLY_RE.test(item.subject) && !/gommone/.test(item.subject)) {
    return { status: 'reject', score: 0, reasons: ['solo carrello'] }
  }
  if (MOTOR_ONLY_RE.test(item.subject.trim())) {
    return { status: 'reject', score: 0, reasons: ['solo motore'] }
  }

  // Lunghezza
  if (item.length_m != null) {
    if (item.length_m < 3.3) {
      score -= 25
      reasons.push('troppo piccolo <3.3m')
    } else if (item.length_m >= 3.3 && item.length_m <= 3.9) {
      score += 18
      reasons.push('lunghezza ideale 3.3-3.9m')
    } else if (item.length_m > 4.5) {
      score -= 8
      reasons.push('>4.5m')
    }
  } else {
    reasons.push('lunghezza n.d.')
    score -= 4
  }

  // Persone
  if (item.persons != null) {
    if (item.persons >= 4) {
      score += 12
      reasons.push(`${item.persons} persone`)
    } else if (item.persons === 3) {
      score += 4
    }
  } else {
    // prova a indovinare da testo comune
    if (/4\s*pers|5\s*pers|6\s*pers/.test(blob)) {
      score += 8
      reasons.push('~4+ pers')
    }
  }

  // Pavimento / Floor priority
  if (item.floor === 'paiolato alluminio') {
    score += 22
    reasons.push('paiolato alluminio')
  } else if (item.floor === 'airdeck') {
    score += 16
    reasons.push('airdeck')
  } else if (item.floor) {
    score += 4
    reasons.push(item.floor)
  } else if (/paiolato|airdeck|alluminio/.test(blob)) {
    score += 8
    reasons.push('floor menzionato')
  }

  // Chiglia
  if (item.keel === 'gonfiabile') {
    score += 10
    reasons.push('chiglia gonfiabile')
  } else if (/chiglia/.test(blob)) {
    score += 3
  }

  // === Reference Argo-Evo 360 (970€ nuovo) ===
  // Usato "praticamente uguale" deve costare almeno ~20% in meno (776€) per avere senso.
  // Motore costa più del gommone → bundle può essere interessante anche a totale più alto.
  if (matchesArgoEvo360Ref(item, blob)) {
    if (item.price >= REF_PRICE_PENALTY && !hasDecentMotor(item, blob)) {
      score -= 35
      reasons.push(`simile ref nuovo (${REF_NEW_PRICE}€) — deve costare <${REF_DISCOUNTED_THRESHOLD}€ usato`)
    } else if (hasDecentMotor(item, blob) && item.price <= REF_BUNDLE_MAX_TOTAL) {
      score += 30
      reasons.push('bundle motore interessante')
    } else if (item.price < REF_DISCOUNTED_THRESHOLD - 80) {
      score += 18
      reasons.push('buon prezzo vs riferimento nuovo')
    }
  }

  // Trasportabile auto / smontabile / leggero
  if (/smontabile|portapacchi|trasportabile.*auto|auto|leggero|facile da trasportare|rimorchio auto/.test(blob)) {
    score += 14
    reasons.push('trasportabile auto')
  }

  // Pesca
  if (/pesc|pesca|bolentino|spinning|carpfishing/.test(blob)) {
    score += 10
    reasons.push('pesca')
  }

  // Specchio poppa / fuoribordo
  if (/specchio di poppa|poppa|fuoribordo|motore fuoribordo/.test(blob)) {
    score += 6
    reasons.push('fuoribordo')
  }

  // Lazio
  if (item.region === 'Lazio' || LAZIO_TOWNS.test(blob) || LAZIO_TOWNS.test(item.place)) {
    score += 24
    reasons.push('Lazio')
  } else if (/toscana|campania|umbria|abruzzo|marche/i.test(item.region)) {
    score += 6
    reasons.push('centro IT')
  }

  // cv se presente (per gommoni piccoli di solito basso)
  if (item.cv != null) {
    if (item.cv > 40.8) {
      return { status: 'reject', score: 0, reasons: [`cv ${item.cv} troppo alto`] }
    }
    if (item.cv <= 15) score += 5
    reasons.push(`cv ${item.cv}`)
  } else {
    reasons.push('cv n.d.')
  }

  // Distanza da base (Ardea/Pomezia): lontano = come se costasse di più
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
      type: 'gommone pneumatico (no RIB con scafo rigido)',
      length: '≥3.30 m (ideale 3.50-3.80 m)',
      capacity: '≥4 persone / portata ≥400kg preferibile',
      floor: 'priorità: paiolato alluminio > airdeck alta pressione',
      keel: 'chiglia gonfiabile preferibile',
      transport: 'trasportabile in automobile',
      engine: 'specchio poppa fuoribordo; cv basso',
      note: 'Feed automatico non ufficiale. Usato identico al ref Argo-Evo 360 (970€) deve costare almeno ~20% in meno senza motore. Bundle con motore buono può valere anche a totale più alto. Verifica sempre documenti e stato.',
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

  // snapshot raw
  try {
    fs.mkdirSync(RAW_OUT, { recursive: true })
    const day = new Date().toISOString().slice(0, 10)
    fs.writeFileSync(
      path.join(RAW_OUT, `subito-gommoni-${day}.json`),
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
