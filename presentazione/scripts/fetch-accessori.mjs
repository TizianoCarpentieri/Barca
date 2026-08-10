/**
 * Fetch accessori nautici — Subito (hades).
 * Scrive public/data/accessori.json (feed Subito).
 *
 * Uso: node scripts/fetch-accessori.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { classifyAccessorio, detectCategory, TIPOLOGIE } from './scoring-accessori.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/data/accessori.json')
const RAW_OUT = path.join(__dirname, '../../raw/mercato')

const SUBITO_CAT = 22 // Nautica
const SUBITO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  Origin: 'https://www.subito.it',
  Referer: 'https://www.subito.it/annunci-italia/vendita/nautica/',
}

const QUERIES = [
  'ecoscandaglio',
  'fishfinder',
  'plotter gps nautico',
  'portacanne',
  'porta canne',
  'bimini',
  'tendalino barca',
  'ombrellone barca',
  'ancora barca',
  'sagola',
  'giubbotto salvagente',
  'estintore nautico',
  'fanali navigazione',
  'pompa sentina',
  'parabordi',
  'cime ormeggio',
  'elica yamaha 9.9',
  'batteria barca',
  'sedile pesca',
  'kill bag',
  'secchio vivo',
  'kit riparazione gommone',
]

/* ———————————————————— SUBITO ———————————————————— */

function feat(ad, uri) {
  const f = (ad.features || []).find((x) => x.uri === uri)
  return f?.values?.[0] || null
}

function subitoPrice(ad) {
  const p = feat(ad, '/price')
  const n = parseInt(String(p?.key || p?.value || '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

function subitoImg(ad) {
  const im = ad.images?.[0]
  if (!im) return null
  const base = im.cdn_base_url || im.base_url
  if (!base) return null
  if (base.includes('images.sbito.it')) return `${base}?rule=gallery-desktop-2x-auto`
  return `${base}-16_83.jpg`
}

async function subitoSearch(q) {
  const u = new URL('https://hades.subito.it/v1/search/items')
  u.searchParams.set('q', q)
  u.searchParams.set('c', String(SUBITO_CAT))
  u.searchParams.set('t', 's')
  u.searchParams.set('lim', '50')
  u.searchParams.set('prs', '5-1000')
  const res = await fetch(u, { headers: SUBITO_HEADERS })
  if (!res.ok) throw new Error(`Subito ${res.status} q=${q}`)
  return res.json()
}

function normalizeSubito(ad) {
  const subject = ad.subject || ''
  const body = ad.body || ''
  const price = subitoPrice(ad)
  if (price == null || price <= 0) return null
  const region = ad.geo?.region?.value || ''
  const city = ad.geo?.city?.value || ''
  const town = ad.geo?.town?.value || ''
  const url = ad.urls?.default || ad.urls?.mobile || null
  if (!url || !subject) return null
  return {
    source: 'subito',
    id: (ad.urn || url).toString(),
    subject: subject.trim(),
    body: body.trim().slice(0, 600),
    price,
    effective_price: price,
    shipping_cost: 0,
    shipping_free: false,
    region,
    city,
    town,
    place: [town, city, region].filter(Boolean).join(' · '),
    url,
    image: subitoImg(ad),
    date: ad.dates?.display_iso8601 || ad.dates?.display || null,
  }
}

/* ———————————————————— MAIN ———————————————————— */

async function fetchSubito() {
  const byId = new Map()
  const errors = []
  for (const q of QUERIES) {
    try {
      const data = await subitoSearch(q)
      for (const ad of data.ads || []) {
        const n = normalizeSubito(ad)
        if (!n) continue
        const key = n.url.replace(/[?#].*$/, '')
        if (!byId.has(key)) byId.set(key, n)
      }
      await new Promise((r) => setTimeout(r, 300))
    } catch (e) {
      errors.push(`subito ${q}: ${e.message}`)
    }
  }
  return { items: [...byId.values()], errors, scanned: byId.size }
}

async function main() {
  const subito = await fetchSubito()

  let refs = {}
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'ref-prezzi.json'), 'utf8'))
    for (const m of raw.modelli || []) refs[m.id] = m
  } catch { /* ref-prezzi.json assente o non valido — fallback alla baseline di TIPOLOGIE */ }

  const items = []
  for (const raw of subito.items) {
    const withCat = { ...raw, category: detectCategory(raw) }
    const c = classifyAccessorio(withCat, refs)
    if (c.status === 'reject' || !c.category) continue
    items.push({
      ...raw,
      category: c.category,
      category_label: c.category_label,
      dest: c.dest,
      dest_label: c.dest_label,
      condition: withCat.condition ?? null,
      status: c.status,
      score: c.score,
      fit: c.fit,
      reasons: c.reasons,
      ref_new: c.ref_new,
      cap: c.cap,
      ratio: c.ratio,
      brand: raw.brand ?? null,
    })
  }

  items.sort((a, b) => b.score - a.score || (a.price || 9e9) - (b.price || 9e9))

  const payload = {
    updated_at: new Date().toISOString(),
    source: 'subito.it (hades)',
    filters: {
      note: 'Accessori nautici per barche piccole. Score su ratio prezzo vs nuovo, condizione, marca, distanza/spedizione.',
    },
    stats: {
      scanned_unique: subito.scanned,
      kept: items.length,
      subito: subito.items.length,
      alto: items.filter((x) => x.fit === 'alto').length,
      medio: items.filter((x) => x.fit === 'medio').length,
      stretch: items.filter((x) => x.fit === 'stretch').length,
    },
    errors: subito.errors,
    items,
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2))
  process.stderr.write(`Wrote ${OUT} (${items.length} items)\n`)

  try {
    fs.mkdirSync(RAW_OUT, { recursive: true })
    const day = new Date().toISOString().slice(0, 10)
    fs.writeFileSync(path.join(RAW_OUT, `accessori-feed-${day}.json`), JSON.stringify(payload, null, 2))
  } catch {
    /* ignore */
  }
}

/** Fallback: estrazione condizione direttamente qui (scoring module lo fa già dentro classify). */

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
