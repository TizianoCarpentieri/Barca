/**
 * Classificazione posti barca — track vela Bestie (classe Comet 770).
 * Solo Lazio, solo annuali (stagionale = reject), affitto ≫ vendita, vendita ≤20k.
 */
import { LAZIO_TOWNS } from './geo-score.mjs'
import { normalizeLengthMeters } from './feed-normalizers.mjs'

export const SALE_HARD_MAX = 20000
export const PRICE_FLOOR = 80
export const LENGTH_SWEET = [7.3, 8.5]
export const LENGTH_CLASS = [6.5, 9]

const BERTH_RE =
  /\b(posto\s*barca|ormeggio|rimessaggio|pontile|darsena|banchina|campo\s*boa|concessione)\b/i
const NOISE_RE =
  /\b(noleggio|charter|skipper|compleanno|battesimo|addio al (?:nubilato|celibato)|vacanza in barca|week[\s-]*end in barca|uscita in barca)\b/i
const ELSEWHERE_RE =
  /\b(argentario|cala galera|piombino|livorno|viareggio|grosseto|elba|olbia|cagliari|palermo|bari|brindisi|genova|la spezia|chioggia|venezia|lignano)\b/i
const ANNUAL_RE =
  /\b(annuale|annualmente|annualit[aà]|canone\s+annu[oa]|12\s*mesi|tutto l['’]anno|per l['’]anno)\b/i
const SEASONAL_RE =
  /\b(stagion(?:ale|e)?|estiv[oa]|estate|weekend|week[\s-]?end|fine settimana|transito|giornalier[oaie]?|a giornata|al giorno|invernali?|semestre|semestrale|6\s*mesi|mesi estivi|mesi invernali)\b/i
const MONTHLY_RATE_RE =
  /\d+\s*(?:€|euro)\s*(?:al\s+)?mese\b|(?:€|euro)\s*mese\b|\/mese\b|\bal mese\b|\bmensile\b/i
const WEEKDAY_SPAN_RE =
  /\bdal\s+luned[iì]\s+al\s+venerd[iì]|\bdal\s+luned[iì]\s+alla\s+domenica|\bluned[iì]\s*[-–]\s*venerd[iì]/gi
const LONG_CONCESSION_RE = /\bconcessione\s+fino\s+al\s+20(?:3[0-9]|[4-9]\d)\b/i
const MONTH_NAME =
  'gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre'
const MONTH_INDEX = {
  gennaio: 1,
  febbraio: 2,
  marzo: 3,
  aprile: 4,
  maggio: 5,
  giugno: 6,
  luglio: 7,
  agosto: 8,
  settembre: 9,
  ottobre: 10,
  novembre: 11,
  dicembre: 12,
}
const RENT_RE = /\b(affitt\w*|canone)\b/i
const SALE_RE = /\b(vend(?:o|i|e|ita|esi)|cessione|cedesi)\b/i
const WANTED_RE = /\b(cerco|cercasi|cerchiamo|acquisto posto|cercasi posto)\b/i
const DRY_RE = /\b(a secco|rimessaggio|cantiere|alaggio|porto a secco)\b/i
const WATER_RE = /\b(banchina|boa|pontile|darsena|in acqua|ormeggio|marina|specchio)\b/i
const HUB_RE =
  /\b(fiumicino|ostia|anzio|nettuno|porto romano|porto turistico di roma)\b/i
const COAST_SOUTH_RE = /\b(circeo|sabaudia|terracina|san\s*felice)\b/i
const COAST_FAR_RE = /\b(civitavecchia|gaeta|formia|santa\s*marinella|ladispoli|sperlonga)\b/i
const BOAT_SUBJECT_RE =
  /\b(bavaria|jeanneau|beneteau|comet|comar|dufour|lagoon|italmar|ranieri|shark|milinari|bellingardo|gommone|fuoribordo|cabinato|barca a vela|barca open|motori|mercruiser|\d+\s*hp)\b/i
const GENERIC_SUBJECT_RE = /^(nautica|annuncio|ormeggio)\b/i
const PRICE_SANITY = 50000

function blobOf(item) {
  return `${item.subject || ''}\n${item.body || ''}`
}

function round1(n) {
  return Math.round(n * 100) / 100
}

export function extractSlotSize(subject = '', body = '') {
  const text = `${subject}\n${body}`
  const dim = text.match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*(?:x|×)\s*(\d{1,2}(?:[.,]\d{1,2})?)/i)
  if (dim) {
    const length = Number.parseFloat(dim[1].replace(',', '.'))
    const width = Number.parseFloat(dim[2].replace(',', '.'))
    if (length >= 3 && length <= 40) {
      return { length_m: round1(length), width_m: width >= 1 && width <= 15 ? round1(width) : null }
    }
  }
  const feet = text.match(/(\d{2})\s*(?:\/\s*\d{2})?\s*piedi/i)
  if (feet) {
    return { length_m: round1(Number.parseInt(feet[1], 10) * 0.3048), width_m: null }
  }
  return {
    length_m: normalizeLengthMeters(null, subject, body, { min: 3, max: 30 }),
    width_m: null,
  }
}

export function detectDealType(item) {
  const subject = item.subject || ''
  const blob = blobOf(item)
  const hint = item.deal_hint === 'rent' || item.deal_hint === 'sale' ? item.deal_hint : null
  if (RENT_RE.test(subject) && !SALE_RE.test(subject)) return 'rent'
  if (SALE_RE.test(subject) && !RENT_RE.test(subject)) return 'sale'
  if (hint) return hint
  if (RENT_RE.test(blob) && !SALE_RE.test(blob)) return 'rent'
  if (SALE_RE.test(blob) && !RENT_RE.test(blob)) return 'sale'
  return hint || 'sale'
}

function expandYear(raw) {
  if (raw == null || raw === '') return null
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return null
  if (n < 100) return n >= 70 ? 1900 + n : 2000 + n
  return n
}

function monthFromName(name) {
  if (!name) return null
  return MONTH_INDEX[name.toLowerCase()] || null
}

function spanMonths(m1, y1, m2, y2) {
  if (!m1 || !m2) return null
  if (y1 != null && y2 != null) return y2 * 12 + m2 - (y1 * 12 + m1)
  let delta = m2 - m1
  if (delta <= 0) delta += 12
  return delta
}

function isShortSpan(months) {
  return months != null && months > 0 && months < 11
}

export function normalizePeriodText(text = '') {
  return String(text)
    .replace(/(\d)(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/gi, '$1 $2')
    .replace(/[°º]/g, '')
}

function hasShortOccupancy(text) {
  const cleaned = String(text)
    .replace(WEEKDAY_SPAN_RE, ' ')
    .replace(LONG_CONCESSION_RE, ' ')

  const numeric =
    /\b(?:dal?|periodo)?\s*(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\s*(?:al|fino\s+al|[-–])\s*(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/gi
  let match
  while ((match = numeric.exec(cleaned))) {
    const startMonth = Number.parseInt(match[2], 10)
    const endMonth = Number.parseInt(match[5], 10)
    if (startMonth < 1 || startMonth > 12 || endMonth < 1 || endMonth > 12) continue
    const months = spanMonths(startMonth, expandYear(match[3]), endMonth, expandYear(match[6]))
    if (isShortSpan(months)) return true
  }

  const named = new RegExp(
    String.raw`\b(?:dal?|periodo)?\s*(?:(\d{1,2})\s+)?(${MONTH_NAME})\s*(20\d{2}|\d{2})?\s*(?:[-–]|ad?|al|fino\s+al|a\s+fine|tutto)\s*(?:(\d{1,2})\s+)?(${MONTH_NAME})\s*(20\d{2}|\d{2})?`,
    'gi',
  )
  while ((match = named.exec(cleaned))) {
    const months = spanMonths(
      monthFromName(match[2]),
      expandYear(match[3]),
      monthFromName(match[5]),
      expandYear(match[6]),
    )
    if (isShortSpan(months)) return true
  }

  const dalAlNamed = new RegExp(
    String.raw`\bdal?\s+(?:(\d{1,2})\s+)?(${MONTH_NAME})\s+(?:al|ad|fino\s+al|a\s+fine|a\s+tutto|tutto)\s+(?:(\d{1,2})\s+)?(${MONTH_NAME})`,
    'gi',
  )
  while ((match = dalAlNamed.exec(cleaned))) {
    const months = spanMonths(monthFromName(match[2]), null, monthFromName(match[4]), null)
    if (isShortSpan(months)) return true
  }

  const daMonthA = new RegExp(
    String.raw`\bda\s+(?:(\d{1,2})\s+)?(${MONTH_NAME})\s+(?:(\d{2,4})\s+)?(?:ad?|al)\s+(?:(\d{1,2}\s*/\s*\d{1,2}\s+)?|(?:fine|tutto)\s+)?(${MONTH_NAME})(?:\s+(\d{2,4}))?`,
    'gi',
  )
  while ((match = daMonthA.exec(cleaned))) {
    const months = spanMonths(monthFromName(match[2]), expandYear(match[3]), monthFromName(match[5]), expandYear(match[6]))
    if (isShortSpan(months)) return true
  }

  const dayMonthToDayMonth = new RegExp(
    String.raw`\b(\d{1,2})\s+(${MONTH_NAME})\s+a\s+(?:\d{1,2}\s*/\s*)?(\d{1,2})?\s*(${MONTH_NAME})`,
    'gi',
  )
  while ((match = dayMonthToDayMonth.exec(cleaned))) {
    const months = spanMonths(monthFromName(match[2]), null, monthFromName(match[4]), null)
    if (isShortSpan(months)) return true
  }

  const finoMonth = new RegExp(
    String.raw`\bfino\s+(?:al|a\s+fine|a\s+met[aà])\s+(?:(\d{1,2})\s+)?(${MONTH_NAME})\s*(20\d{2})?`,
    'gi',
  )
  while ((match = finoMonth.exec(cleaned))) {
    const year = expandYear(match[3])
    if (year != null && year >= 2030) continue
    return true
  }

  const monthHits = []
  const hitRe = new RegExp(String.raw`\b(${MONTH_NAME})\b`, 'gi')
  while ((match = hitRe.exec(cleaned))) {
    const month = monthFromName(match[1])
    if (month) monthHits.push(month)
  }
  if (monthHits.length >= 2) {
    const months = spanMonths(monthHits[0], null, monthHits[monthHits.length - 1], null)
    if (isShortSpan(months)) return true
  }

  return false
}

export function detectPeriod(text = '') {
  const normalized = normalizePeriodText(text)
  if (MONTHLY_RATE_RE.test(normalized)) return 'seasonal'
  if (hasShortOccupancy(normalized)) return 'seasonal'
  if (ANNUAL_RE.test(normalized)) return 'annual'
  if (SEASONAL_RE.test(normalized)) return 'seasonal'
  return 'unknown'
}

export function detectKind(text = '') {
  const dry = DRY_RE.test(text)
  const water = WATER_RE.test(text)
  if (dry && !water) return 'dry'
  if (dry && /\ba secco\b/i.test(text)) return 'dry'
  if (water) return 'water'
  if (dry) return 'dry'
  return 'water'
}

export function isHub(item) {
  return HUB_RE.test(`${item.subject || ''} ${item.place || ''} ${item.town || ''} ${item.city || ''}`)
}

export function isLazioBerth(item) {
  const subject = item.subject || ''
  if (ELSEWHERE_RE.test(subject)) return false
  if (item.region && item.region !== 'Lazio') return false
  const place = `${item.place || ''} ${item.town || ''} ${item.city || ''}`
  return item.region === 'Lazio' || LAZIO_TOWNS.test(place)
}

export function isBerthListing(item) {
  const subject = item.subject || ''
  const body = item.body || ''
  const blob = `${subject}\n${body}`
  if (NOISE_RE.test(subject) || WANTED_RE.test(blob)) return false
  if (BOAT_SUBJECT_RE.test(subject)) return false
  if (BERTH_RE.test(subject)) return true
  if (GENERIC_SUBJECT_RE.test(subject.trim()) && BERTH_RE.test(body)) return true
  return false
}

export function classifyPosto(item) {
  const reasons = []
  const subject = item.subject || ''
  const blob = blobOf(item)
  const price = item.price
  const deal_type = detectDealType(item)
  const period = detectPeriod(blob)
  const kind = detectKind(blob)
  const { length_m, width_m } = extractSlotSize(subject, item.body || '')
  const hub = isHub(item)

  if (price == null || !Number.isFinite(price) || price <= 0) {
    return reject('prezzo assente')
  }
  if (price < PRICE_FLOOR) {
    return reject('prezzo non credibile')
  }
  if (!isBerthListing(item)) {
    return reject('non è un posto barca')
  }
  if (!isLazioBerth(item)) {
    return reject('fuori Lazio')
  }
  if (period === 'seasonal') {
    return reject('stagionale / non annuale')
  }
  if (deal_type === 'rent' && period === 'unknown' && price < 800) {
    return reject('canone troppo basso / probabilmente mensile')
  }
  if (price >= PRICE_SANITY) {
    return reject('prezzo da cessione, non canone')
  }
  if (deal_type === 'sale' && price > SALE_HARD_MAX) {
    return reject(`vendita >${SALE_HARD_MAX}€`)
  }

  let score = 30
  let status = 'ok'

  if (deal_type === 'rent') {
    score += 24
    reasons.push('affitto')
  } else {
    score += 4
    reasons.push('vendita concessione')
  }

  if (period === 'annual') {
    score += 16
    reasons.push('annuale')
  } else {
    score -= 10
    reasons.push('periodo n.d.')
    status = 'weak'
  }

  if (length_m != null) {
    if (length_m >= LENGTH_SWEET[0] && length_m <= LENGTH_SWEET[1]) {
      score += 22
      reasons.push(`slot ${length_m} m · classe 770`)
    } else if (length_m >= LENGTH_CLASS[0] && length_m <= LENGTH_CLASS[1]) {
      score += 14
      reasons.push(`${length_m} m nel range 6,5–9`)
    } else if (length_m < 6) {
      score -= 8
      reasons.push('corto per un 770')
    } else if (length_m > 12) {
      score -= 16
      reasons.push('>12 m: TCO e slot sbagliati')
      if (status === 'ok') status = 'weak'
    } else {
      score += 2
      reasons.push(`${length_m} m`)
    }
  } else {
    score -= 3
    reasons.push('misura n.d.')
  }

  if (kind === 'water') {
    score += 10
    reasons.push('in acqua')
  } else {
    score -= 6
    reasons.push('a secco')
  }

  const placeBlob = `${subject} ${item.place || ''} ${item.town || ''}`
  if (hub) {
    score += 14
    reasons.push('hub Fiumicino–Nettuno')
  } else if (COAST_SOUTH_RE.test(placeBlob)) {
    score += 6
    reasons.push('litorale sud Lazio')
  } else if (COAST_FAR_RE.test(placeBlob)) {
    score += 2
    reasons.push('Lazio lontano dalla base')
  } else {
    reasons.push('Lazio')
  }

  if (score < 40 && status === 'ok') status = 'weak'

  return {
    status,
    score,
    reasons,
    deal_type,
    period,
    kind,
    length_m,
    width_m,
    hub,
  }
}

function reject(reason) {
  return {
    status: 'reject',
    score: 0,
    reasons: [reason],
    deal_type: null,
    period: null,
    kind: null,
    length_m: null,
    width_m: null,
    hub: false,
  }
}
