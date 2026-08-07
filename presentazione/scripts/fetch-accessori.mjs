/**
 * Fetch accessori nautici — Subito (hades) + eBay (Browse API).
 * Scrive public/data/accessori.json (unico feed fuso, tag source per item).
 *
 * Uso: node scripts/fetch-accessori.mjs
 * eBay: legge EBAY_CLIENT_ID / EBAY_CLIENT_SECRET da env o .env.ebay (locale).
 *       Se mancano le chiavi → solo Subito (con avviso).
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { classifyAccessorio, detectCategory, TIPOLOGIE } from './scoring-accessori.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '../public/data/accessori.json')
const RAW_OUT = path.join(__dirname, '../../../raw/mercato')

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

/** Load .env.ebay se esiste (locale); in CI arrivano da env del workflow. */
function loadEnv() {
  const p = path.join(__dirname, '../.env.ebay')
  try {
    const txt = fs.readFileSync(p, 'utf8')
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  } catch {
    /* .env.ebay non esiste → solo env di sistema */
  }
}

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

/* ———————————————————— EBAY ———————————————————— */

const EBAY_TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token'
const EBAY_SEARCH_URL = 'https://apim.ebay.com/buy/browse/v1/item_summary/search'
const EBAY_SCOPE = 'https://api.ebay.com/oauth/api_scope'

async function ebayToken(clientId, clientSecret) {
  const res = await fetch(EBAY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: EBAY_SCOPE,
    }),
  })
  if (!res.ok) throw new Error(`eBay token ${res.status}`)
  const data = await res.json()
  return data.access_token
}

async function ebaySearch(token, q, maxPrice) {
  const u = new URL(EBAY_SEARCH_URL)
  u.searchParams.set('q', q)
  u.searchParams.set('limit', '50')
  u.searchParams.set('filter', `buyingOptions:{FIXED_PRICE},price:[1..${maxPrice}]`)
  const res = await fetch(u, {
    headers: { Authorization: `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_IT' },
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`eBay search ${res.status} q=${q} ${t.slice(0, 120)}`)
  }
  return res.json()
}

function normalizeEbay(it) {
  const price = parseFloat(it.price?.value)
  if (!Number.isFinite(price) || price <= 0) return null
  const shipOpts = (it.shippingOptions || []).filter(
    (s) => s.shippingCostType === 'FIXED' || s.shippingCostType === 'FREE',
  )
  let shippingCost = 0
  let shippingFree = false
  let shippingCalculated = false
  if (it.shippingOptions?.length) {
    for (const s of it.shippingOptions) {
      if (s.shippingCostType === 'FREE') { shippingFree = true; break }
      if (s.shippingCostType === 'FIXED' && s.cost?.value) {
        shippingCost = parseFloat(s.cost.value) || 0
        break
      }
    }
  }
  if (!shippingFree && !shippingCost && it.shippingOptions?.some((s) => s.shippingCostType === 'CALCULATED')) {
    shippingCalculated = true
  }
  const loc = it.itemLocation || {}
  const region = loc.region || ''
  const country = loc.country || ''
  return {
    source: 'ebay',
    id: `ebay-${it.itemId}`,
    subject: (it.title || '').trim(),
    body: (it.legacyItemId ? `eBay ref ${it.legacyItemId}` : ''),
    price,
    effective_price: Math.round((price + shippingCost) * 100) / 100,
    shipping_cost: shippingCost,
    shipping_free: shippingFree,
    shipping_calculated: shippingCalculated,
    condition: it.condition ? String(it.condition).toLowerCase() : null,
    region,
    place: [loc.city, region, country].filter(Boolean).join(' · '),
    url: it.itemWebUrl,
    image: it.image?.imageUrl || null,
    date: it.itemCreationDate || null,
    brand: null,
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

async function fetchEbay() {
  const clientId = process.env.EBAY_CLIENT_ID
  const clientSecret = process.env.EBAY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    process.stderr.write('EBAY: chiavi mancanti → solo feed Subito\n')
    return { items: [], errors: ['eBay: chiavi mancanti'], skipped: true }
  }
  const token = await ebayToken(clientId, clientSecret)
  const byId = new Map()
  const errors = []
  for (const q of QUERIES) {
    try {
      const cat = TIPOLOGIE.find((t) => q === 'elica yamaha 9.9' ? t.id === 'elica' : t.re.test(q))
      const maxPrice = Math.round((cat?.cap ?? 400) * 1.5)
      const data = await ebaySearch(token, q, maxPrice)
      for (const it of data.itemSummaries || []) {
        const n = normalizeEbay(it)
        if (!n) continue
        if (!byId.has(n.id)) byId.set(n.id, n)
      }
      await new Promise((r) => setTimeout(r, 400))
    } catch (e) {
      errors.push(`ebay ${q}: ${e.message}`)
    }
  }
  return { items: [...byId.values()], errors, scanned: byId.size }
}

async function main() {
  loadEnv()
  const [subito, ebay] = await Promise.all([fetchSubito(), fetchEbay()])

  const items = []
  for (const raw of [...subito.items, ...ebay.items]) {
    const withCat = { ...raw, category: detectCategory(raw) }
    const c = classifyAccessorio(withCat)
    if (c.status === 'reject' || !c.category) continue
    items.push({
      ...raw,
      category: c.category,
      category_label: c.category_label,
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
    source: 'subito.it (hades) + ebay.it (Browse API)',
    filters: {
      note: 'Accessori nautici per barche piccole. Score su ratio prezzo vs nuovo, condizione, marca, distanza/spedizione.',
    },
    stats: {
      scanned_unique: subito.scanned + ebay.scanned,
      kept: items.length,
      subito: subito.items.length,
      ebay: ebay.items.length,
      alto: items.filter((x) => x.fit === 'alto').length,
      medio: items.filter((x) => x.fit === 'medio').length,
      stretch: items.filter((x) => x.fit === 'stretch').length,
    },
    errors: [...subito.errors, ...ebay.errors],
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
