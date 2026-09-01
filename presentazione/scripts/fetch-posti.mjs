/**
 * Fetch annunci Subito per POSTI BARCA — track vela Bestie.
 * Solo Lazio, solo annuali, affitto ≫ vendita, vendita ≤20k.
 * Unisce la striscia ufficiale (bandi/demanio/marina) da posti-ufficiali.json.
 *
 * Uso: node scripts/fetch-posti.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { classifyPosto, SALE_HARD_MAX } from './posti-classify.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/data/posti.json')
const RAW_OUT = path.join(__dirname, '../../raw/mercato')
const OFFICIAL_SRC = path.join(__dirname, 'posti-ufficiali.json')

const CAT = 22
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  Origin: 'https://www.subito.it',
  Referer: 'https://www.subito.it/annunci-italia/vendita/nautica/',
}

const QUERIES = [
  'posto barca',
  'posto barca lazio',
  'posto barca anzio',
  'posto barca nettuno',
  'posto barca fiumicino',
  'posto barca ostia',
  'ormeggio annuale',
  'ormeggio lazio',
  'rimessaggio barca lazio',
  'concessione posto barca',
  'posto barca marina',
  'posto barca circeo',
  'posto barca civitavecchia',
  'affitto posto barca',
  'posto barca annuale',
]

function feat(ad, uri) {
  const f = (ad.features || []).find((x) => x.uri === uri)
  return f?.values?.[0] || null
}

function priceOf(ad) {
  const p = feat(ad, '/price')
  const n = parseInt(String(p?.key || p?.value || '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function imgUrl(ad) {
  const im = ad.images?.[0]
  if (!im) return null
  const base = im.cdn_base_url || im.base_url
  if (!base) return null
  if (base.includes('images.sbito.it')) return `${base}?rule=gallery-desktop-2x-auto`
  return `${base}-16_83.jpg`
}

async function search(q, t, start = 0) {
  const u = new URL('https://hades.subito.it/v1/search/items')
  u.searchParams.set('q', q)
  u.searchParams.set('c', String(CAT))
  u.searchParams.set('t', t)
  u.searchParams.set('lim', '50')
  u.searchParams.set('start', String(start))
  if (t === 's') u.searchParams.set('prs', `100-${SALE_HARD_MAX}`)
  const res = await fetch(u, { headers: HEADERS })
  if (!res.ok) throw new Error(`Subito ${res.status} t=${t} q=${q}`)
  return res.json()
}

function normalize(ad, dealHint) {
  const subject = ad.subject || ''
  const body = ad.body || ''
  const region = ad.geo?.region?.value || ''
  const city = ad.geo?.city?.value || ''
  const town = ad.geo?.town?.value || ''
  const place = [town, city, region].filter(Boolean).join(' · ')
  const url = ad.urls?.default || ad.urls?.mobile || null
  const id = (ad.urn || url || subject).toString()

  return {
    id,
    source: 'subito',
    subject: subject.trim(),
    body: body.trim().slice(0, 600),
    price: priceOf(ad),
    region,
    city,
    town,
    place,
    url,
    image: imgUrl(ad),
    date: ad.dates?.display_iso8601 || ad.dates?.display || null,
    deal_hint: dealHint,
  }
}

function loadOfficial() {
  try {
    const data = JSON.parse(fs.readFileSync(OFFICIAL_SRC, 'utf8'))
    return Array.isArray(data.items) ? data.items : []
  } catch {
    return []
  }
}

async function main() {
  const byId = new Map()
  const errors = []
  for (const q of QUERIES) {
    for (const t of ['u', 's']) {
      try {
        const json = await search(q, t, 0)
        const ads = json.items || json.ads || json.results || []
        for (const ad of ads) {
          const item = normalize(ad, t === 'u' ? 'rent' : 'sale')
          if (!item.url) continue
          if (!byId.has(item.id)) byId.set(item.id, item)
        }
        process.stderr.write(`t=${t} q=${q} → ${ads.length}\n`)
      } catch (e) {
        errors.push(`${t}:${q}: ${e.message}`)
        process.stderr.write(`ERR t=${t} q=${q}: ${e.message}\n`)
      }
    }
  }

  const listings = []
  for (const item of byId.values()) {
    const c = classifyPosto(item)
    if (c.status === 'reject') continue
    listings.push({
      id: item.id,
      source: item.source,
      subject: item.subject,
      body: item.body,
      price: item.price,
      region: item.region,
      city: item.city,
      town: item.town,
      place: item.place,
      url: item.url,
      image: item.image,
      date: item.date,
      deal_type: c.deal_type,
      period: c.period,
      kind: c.kind,
      length_m: c.length_m,
      width_m: c.width_m,
      hub: c.hub,
      status: c.status,
      score: c.score,
      reasons: c.reasons,
      distance_factor: 1,
      effective_price: item.price,
      fit:
        c.status === 'ok' && c.score >= 55
          ? 'alto'
          : c.score >= 45
            ? 'medio'
            : 'basso',
    })
  }

  listings.sort((a, b) => b.score - a.score || (a.price || 9e9) - (b.price || 9e9))
  const top = listings.slice(0, 80)
  const official = loadOfficial()
  const payload = {
    updated_at: new Date().toISOString(),
    source: 'subito.it via hades.subito.it + fonti ufficiali curate',
    filters: {
      area: 'solo Lazio (litorale)',
      period: 'solo annuali; stagionale = scarto',
      price_eur: `affitti senza cap · vendite ≤${SALE_HARD_MAX}`,
      type: 'posto barca / ormeggio / rimessaggio per cabinato 7–9 m',
      reference: 'Comet 770 · slot ~8,50 × 2,70',
      note: 'Affitto sopra la vendita. Bandi comunali e demanio stanno nella striscia ufficiale, non su Subito. Candidati grezzi, non una shortlist.',
    },
    stats: {
      scanned_unique: byId.size,
      kept: listings.length,
      shown: top.length,
      lazio_in_shown: top.length,
      rent: top.filter((x) => x.deal_type === 'rent').length,
      sale: top.filter((x) => x.deal_type === 'sale').length,
      annual: top.filter((x) => x.period === 'annual').length,
      official: official.length,
      ok: top.filter((x) => x.status === 'ok').length,
      weak: top.filter((x) => x.status === 'weak').length,
    },
    errors,
    official,
    items: top,
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2))
  process.stderr.write(`Wrote ${OUT} (${top.length} items, scanned ${byId.size}, official ${official.length})\n`)

  try {
    fs.mkdirSync(RAW_OUT, { recursive: true })
    const day = new Date().toISOString().slice(0, 10)
    fs.writeFileSync(path.join(RAW_OUT, `subito-posti-${day}.json`), JSON.stringify(payload, null, 2))
  } catch {
    /* ignore */
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
