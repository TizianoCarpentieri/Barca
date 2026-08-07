/**
 * Update ref-prezzi.json — mediana prezzi annunci Subito condizione "nuovo" per tipologia.
 * Riusa l'hades API (stessa di fetch-accessori.mjs).
 * Cron: stesso schedule 2x/giorno (workflow pages.yml).
 *
 * Uso: node scripts/update-accessori-ref.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { TIPOLOGIE, extractCondition } from './scoring-accessori.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, 'ref-prezzi.json')
const SUBITO_CAT = 22 // Nautica

const SUBITO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
  Origin: 'https://www.subito.it',
  Referer: 'https://www.subito.it/annunci-italia/vendita/nautica/',
}

/** Keyword di ricerca per ogni tipologia (riadatta QUERIES di fetch-accessori). */
const QUERY_BY_TIP = {
  fishfinder: 'ecoscandaglio',
  'fishfinder-deeper': 'deeper portatile',
  plotter: 'plotter gps nautico',
  supporto: 'supporto tablet barca',
  'portacanne-kit': 'portacanne',
  'portacanne-poppa': 'portacanne poppa',
  ancora: 'ancora sagola',
  killbag: 'kill bag secchio vivo',
  bimini: 'bimini tendalino',
  ombrellone: 'ombrellone barca',
  telone: 'telone barca',
  giubbotto: 'giubbotto salvagente',
  estintore: 'estintore nautico',
  fanali: 'fanali navigazione',
  'pompa-sentina': 'pompa sentina',
  elica: 'elica fuoribordo',
  batteria: 'batteria nautica',
  tanica: 'tanica carburante',
  parabordi: 'parabordi',
  cime: 'cime ormeggio',
  sedile: 'sedile pesca',
  'kit-riparazione': 'kit riparazione gommone',
  galleggianti: 'galleggianti boe',
  'canne-mulinelli': 'canna mulinello pesca',
  'radio-vhf': 'radio vhf',
  'cassetta-attrezzi': 'cassetta attrezzi',
  binocolo: 'binocolo nautico',
}

function subitoPrice(ad) {
  const feat = (ad.features || []).find((x) => x.uri === '/price')
  const p = feat?.values?.[0]
  const n = parseInt(String(p?.key || p?.value || '').replace(/\D/g, ''), 10)
  return Number.isFinite(n) ? n : null
}

async function subitoSearch(q) {
  const u = new URL('https://hades.subito.it/v1/search/items')
  u.searchParams.set('q', q)
  u.searchParams.set('c', String(SUBITO_CAT))
  u.searchParams.set('t', 's')
  u.searchParams.set('lim', '30')
  u.searchParams.set('prs', '1-1200')
  const res = await fetch(u, { headers: SUBITO_HEADERS })
  if (!res.ok) throw new Error(`Subito ${res.status} q=${q}`)
  return res.json()
}

const mediana = (arr) => {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const n = s.length
  return n % 2 === 1 ? s[(n - 1) >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2
}

async function main() {
  const modelli = []
  for (const t of TIPOLOGIE) {
    const q = QUERY_BY_TIP[t.id]
    const prices = []
    if (q) {
      try {
        const data = await subitoSearch(`${q} nuovo`)
        for (const ad of data.ads || []) {
          const price = subitoPrice(ad)
          if (price == null || price <= 0) continue
          const cond = extractCondition({ subject: ad.subject || '', body: ad.body || '' })
          if (cond === 'nuovo' || cond === 'come nuovo') prices.push(price)
        }
      } catch (e) {
        console.warn(`ref ${t.id}: ${e.message}`)
      }
    }
    const med = mediana(prices)
    modelli.push({
      id: t.id,
      ref_new: med ?? t.ref_new,
      cap: Math.round((med ?? t.ref_new) * 2),
      sample: prices.length,
      data: new Date().toISOString(),
    })
    await new Promise((r) => setTimeout(r, 250))
  }
  const out = {
    updated_at: new Date().toISOString(),
    source: 'subito.it (hades) condizione nuovo — mediana',
    modelli,
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2))
  console.log(`Wrote ${OUT} (${modelli.length} modelli)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
