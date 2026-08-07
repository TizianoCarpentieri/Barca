/**
 * Scoring accessori nautici — modulo condiviso Subito + eBay.
 * Formula: score = 20 (base) + peso_tipologia + bonus_prezzo + condizione + marca + trasporto + compatibilità
 * Fit: alto ≥65 · medio ≥45 · stretch se prezzo > cap · basso <45
 */
import { applyDistanceScore } from './geo-score.mjs'

export const TIPOLOGIE = [
  { id: 'fishfinder',       label: 'Ecoscandaglio',          peso: 30, ref_new: 180, cap: 400, re: /ecoscandaglio|fishfinder|sounder|striker|hook\s?\d|garmin\s+striker|lowrance/i },
  { id: 'fishfinder-deeper',label: 'Fishfinder portatile',   peso: 28, ref_new: 220, cap: 350, re: /deeper\s*(pro|start)?|fishfinder\s+portatile|portatile.*(fishfinder|ecoscandaglio)/i },
  { id: 'plotter',          label: 'Plotter / GPS',          peso: 22, ref_new: 350, cap: 700, re: /plotter|gps\s+nautic|chartplotter|gpsmap/i },
  { id: 'supporto',         label: 'Supporto tablet/phone',  peso: 16, ref_new: 40,  cap: 80,  re: /supporto\s+(tablet|telefono|phone|iphone)|tablet\s+holder|phone\s+holder|staffa\s+tablet|impermeabile.*(tablet|telefono|cellulare)/i },
  { id: 'portacanne-kit',   label: 'Portacanne kit',         peso: 28, ref_new: 55,  cap: 120, re: /portacanne|porta\s+canne|rod\s*holder|scotty|plastimo/i },
  { id: 'portacanne-poppa', label: 'Portacanne da poppa',    peso: 26, ref_new: 45,  cap: 100, re: /portacanne.*(poppa|falchetta|gunwale|rail)|poppa.*portacanne|falchetta.*(portacanne|porta\s+canne)/i },
  { id: 'ancora',           label: 'Ancora + sagola',        peso: 25, ref_new: 35,  cap: 80,  re: /\bancora\b|sagola|anchor/i },
  { id: 'killbag',          label: 'Kill bag / secchio vivo',peso: 20, ref_new: 35,  cap: 90,  re: /kill\s*bags?|secchio\s+(porta\s*)?vivo|livewell|porta\s*vivo|killbag/i },
  { id: 'bimini',           label: 'Bimini / tendalino',     peso: 25, ref_new: 130, cap: 320, re: /bimini|tendalino|cagnaro|tenda\s+(parasole|solare)/i },
  { id: 'ombrellone',       label: 'Ombrellone da barca',    peso: 18, ref_new: 60,  cap: 150, re: /ombrellone/i },
  { id: 'telone',           label: 'Telone copertura',       peso: 14, ref_new: 90,  cap: 220, re: /telone|cover\s*barca|copertura\s+(stiva|barca|tesa)|boat\s*cover/i },
  { id: 'giubbotto',        label: 'Giubbotto salvagente',   peso: 20, ref_new: 45,  cap: 100, re: /giubbotto|salvagente|life\s*jacket|\bpfd\b/i },
  { id: 'estintore',        label: 'Estintore nautico',      peso: 16, ref_new: 40,  cap: 90,  re: /estintore|fire\s*extinguisher/i },
  { id: 'fanali',           label: 'Fanali di via',          peso: 16, ref_new: 50,  cap: 120, re: /fanali?|luce\s+di\s+via|navigat(ion)?\s+light|fanale/i },
  { id: 'pompa-sentina',    label: 'Pompa di sentina',       peso: 14, ref_new: 45,  cap: 100, re: /pompa\s+di\s+sentina|bilge\s*pump|pompa\s+sentina/i },
  { id: 'elica',            label: 'Elica di scorta',        peso: 12, ref_new: 75,  cap: 180, re: /elica|propeller/i },
  { id: 'batteria',         label: 'Batteria 12V',           peso: 10, ref_new: 60,  cap: 140, re: /batteria|battery/i },
  { id: 'tanica',           label: 'Tanica / cavi / oli',    peso: 10, ref_new: 25,  cap: 60,  re: /tanica|jerry\s*can|olio\s+motore|cavo\s+di\s+(accensione|avviamento)/i },
  { id: 'parabordi',        label: 'Parabordi',              peso: 8,  ref_new: 15,  cap: 45,  re: /parabordi|fender/i },
  { id: 'cime',             label: 'Cime / ormeggio',        peso: 8,  ref_new: 20,  cap: 50,  re: /\bcime\b|cavo\s+(ormeggio|mooring)|ormeggio/i },
  { id: 'sedile',           label: 'Sedile da pesca',        peso: 12, ref_new: 60,  cap: 140, re: /sedile\s+pesca|seat\s+fishing|pedestal\s*seat/i },
  { id: 'kit-riparazione',  label: 'Kit riparazione gommone',peso: 10, ref_new: 30,  cap: 70,  re: /kit\s+(riparazione|riparaz)|repair\s+kit|tappo\s+riparazione/i },
]

export const BRANDS =
  /\b(garmin|lowrance|raymarine|humminbird|b&g|navionics|deeper|plastimo|lalizas|crewsaver|spinlock|scotty|shakespeare|mercury|yamaha|suzuki|tohatsu|solas|rodcraft|king)\b/i

// REJECT fissi di sicurezza
const SAFETY_REJECT_RE = /giubbotto|salvagente|estintore|razzo|flare/i
const USED_WORDS_RE = /usat[oa]?|seconda\s+mano|ricondizionat|rotto|danneggiat|da\s+riparare|non\s+funziona|scadut/i
const ELECTRONICS_RE = /ecoscandaglio|fishfinder|plotter|gps|deeper|striker/i

const BIG_BOAT_RE = /yacht|\b12\s*m\b|radome|radar|winch|windlass|generatore|dinette|elica\s+(\d{2,3}|40|60|90|115|140|150)\s*(cv|hp)|40\s*[-–]\s*150\s*cv/i

const BOAT_AD_RE = /^(gommone|gozzo|open|lancia|barca|walkaround|tender)\b/i

const SOLD_RE = /vendut[oi]?|venduta|sold|in\s*vendita\s*\(?vendut/i

/** Fino a questa soglia un accessorio nautico è credibile; sopra quasi certamente è una barca. */
const MAX_ACCESSORY_PRICE = 2000

export const SMALL_BOAT_RE =
  /gommone|3\s*[-–]?\s*4\s*m|3\s*[,.]\s*[5-9]\s*m|4\s*[,.]\s*[0-6]\s*m|gozzo|tender|no\s*patente|senza\s*patente|fuoribordo|piccola/i

/** Riconosce la tipologia dall'item; priorità = ordine tabella. */
export function detectCategory(item) {
  const blob = `${item.subject} ${item.body}`.toLowerCase()
  for (const t of TIPOLOGIE) {
    if (t.re.test(blob)) return t
  }
  return null
}

/** Estrae condizione testuale: nuovo | come nuovo | usato ok | usato | rotto */
export function extractCondition(item) {
  const blob = `${item.subject} ${item.body}`.toLowerCase()
  if (item.condition) return item.condition
  if (/nuovo|mai\s+usato|imballagg|sigillat|nuovissimo|mai\s+montato/i.test(blob)) return 'nuovo'
  if (/come\s+nuovo|praticamente\s+nuovo|usato\s+poco|poco\s+usato|perfett\w+\s+stato/i.test(blob)) return 'come nuovo'
  if (/da\s+riparare|rotto|non\s+funziona|danneggiat|per\s+ricambi|non\s+parte/i.test(blob)) return 'da riparare'
  if (/usat|seconda\s+mano|testat|provat|funzionant/i.test(blob)) return 'usato ok'
  return 'usato'
}

/**
 * Classifica un accessorio.
 * @param {object} item { price, effective_price, shipping_cost, source, subject, body, region, place, town, city, condition, ref_new }
 * @returns {{ status, score, fit, reasons, category, ref_new, cap, ratio }}
 */
export function classifyAccessorio(item) {
  const blob = `${item.subject} ${item.body}`.toLowerCase()
  const reasons = []
  const cat = item.category || detectCategory(item)

  if (!cat) {
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['tipologia non riconosciuta'] }
  }

  const refNew = item.ref_new ?? cat.ref_new
  const cap = cat.cap
  const price = item.price
  if (price == null || price <= 0) {
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['prezzo assente'] }
  }
  const effective = item.effective_price ?? price
  const ratio = effective / refNew

  let score = 20 + cat.peso
  let status = 'ok'

  // ——— annunci-imbarcazione / prezzo da barca ———
  if (price > MAX_ACCESSORY_PRICE) {
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['prezzo da imbarcazione'] }
  }
  if (SOLD_RE.test(item.subject)) {
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['già venduto'] }
  }
  if (BOAT_AD_RE.test(item.subject.trim()) && !cat.re.test(item.subject)) {
    // titolo da barca senza parola accessorio nel titolo → scarta
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['annuncio-imbarcazione'] }
  }
  // titolo che menziona uno scafo ovunque (marca+gommone) senza parola accessorio → quasi certamente barca intera
  if (/\b(gommone|gozzo|open|lancia|barca|tender)\b/i.test(item.subject) && !cat.re.test(item.subject)) {
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['annuncio-imbarcazione'] }
  }
  if (/\b(gozzo|gommone|barca|open|lancia)\b/i.test(blob) && /vendo|vendesi|in\s+vendita/i.test(blob) && !cat.re.test(item.subject)) {
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['annuncio-imbarcazione'] }
  }

  // ——— barche grandi ———
  if (BIG_BOAT_RE.test(blob)) {
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['roba da barche grandi'] }
  }
  if (cat.id === 'bimini') {
    const m = blob.match(/(\d(?:[.,]\d)?)\s*m/)
    if (m) {
      const meters = parseFloat(m[1].replace(',', '.'))
      if (meters > 7) return { status: 'reject', score: 0, fit: 'reject', reasons: ['bimini >7m'] }
      if (meters >= 3.5) { score += 5; reasons.push(`scafo ${meters}m ok`) }
    }
  }

  // ——— condizione ———
  const cond = extractCondition(item)
  item.condition = cond
  if (cond === 'nuovo') { score += 8; reasons.push('nuovo') }
  else if (cond === 'come nuovo') { score += 6; reasons.push('come nuovo') }
  else if (cond === 'usato ok') { score += 5; reasons.push('usato funzionante') }
  else if (cond === 'da riparare') {
    if (ELECTRONICS_RE.test(blob)) return { status: 'reject', score: 0, fit: 'reject', reasons: ['elettronica rotta'] }
    score -= 25; reasons.push('da riparare')
  } else { score += 3; reasons.push('usato') }

  // ——— REJECT fissi sicurezza ———
  if (SAFETY_REJECT_RE.test(blob) && USED_WORDS_RE.test(blob)) {
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['sicurezza usato/scaduto'] }
  }
  if (cat.id === 'batteria' && USED_WORDS_RE.test(blob)) {
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['batteria usata'] }
  }
  if (cat.id === 'tanica' && /\busat[oa]?\b/i.test(blob)) {
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['olio/carburante usato'] }
  }

  // ——— bonus prezzo per bande ———
  if (cond === 'nuovo' || cond === 'come nuovo') {
    if (ratio <= 1.0) { score += 10; reasons.push(`in linea col nuovo (${Math.round(ratio * 100)}%)`) }
    else { score -= 15; reasons.push('sopra prezzo nuovo') }
  } else {
    if (ratio <= 0.3) { score += 25; reasons.push(`affare (${Math.round(ratio * 100)}% del nuovo)`) }
    else if (ratio <= 0.5) { score += 15; reasons.push(`buon prezzo (${Math.round(ratio * 100)}%)`) }
    else if (ratio <= 0.75) { score += 5; reasons.push(`in linea (${Math.round(ratio * 100)}%)`) }
    else if (ratio <= 0.9) { score -= 20; reasons.push('tanto vale nuovo') }
    else { score -= 25; reasons.push('usato carissimo') }
  }

  // ——— sonda inclusa (fishfinder) ———
  if (cat.id === 'fishfinder' && /sonda\s+inclusa|transducer\s+included|con\s+sonda|trasduttore\s+incluso/i.test(blob)) {
    score += 5; reasons.push('sonda inclusa')
  } else if (cat.id === 'fishfinder' && /senza\s+sonda|sonda\s+esclusa/i.test(blob)) {
    score -= 10; reasons.push('senza sonda')
  }

  // ——— marca nota ———
  const brand = (item.subject + ' ' + item.body).match(BRANDS)
  if (brand) { score += 5; reasons.push(`marca ${brand[0]}`) }

  // ——— compatibilità / fit barca ———
  if (SMALL_BOAT_RE.test(blob)) { score += 5; reasons.push('fit barca piccola') }

  // ——— trasporto / distanza ———
  if (item.source === 'ebay') {
    const ship = item.shipping_cost ?? 0
    if (ship > 0) reasons.push(`spedizione ${Math.round(ship)}€`)
    else if (item.shipping_free) { score += 8; reasons.push('spedizione gratuita') }
    if (item.shipping_calculated) reasons.push('spedizione da calcolare')
  } else {
    if (item.region === 'Lazio' || /lazio/i.test(item.place || '')) { score += 15; reasons.push('Lazio') }
    const geo = applyDistanceScore(item, score, reasons)
    score = geo.score
  }

  // ——— cap → stretch ———
  if (price > cap) { status = 'stretch'; reasons.push(`oltre cap ${cap}€`) }

  const fit = status === 'stretch' ? 'stretch' : score >= 65 ? 'alto' : score >= 45 ? 'medio' : 'basso'

  return {
    status,
    score,
    fit,
    reasons: reasons.slice(0, 6),
    category: cat.id,
    category_label: cat.label,
    ref_new: refNew,
    cap,
    ratio: Number(ratio.toFixed(2)),
  }
}
