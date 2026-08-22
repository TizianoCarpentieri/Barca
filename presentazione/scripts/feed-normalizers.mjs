const MOTOR_BRANDS = [
  'yamaha', 'suzuki', 'mercury', 'tohatsu', 'hidea', 'honda', 'selva',
  'evinrude', 'johnson',
]

const HARD_HULL_RE =
  /\b(rib\b|semi[\s-]?rigido|semirigido|scafo rigido|carena rigida|chiglia rigida|fondo rigido|vetroresina|vtr)\b/i

// Questi marchi/modelli identificano nel feed quasi esclusivamente RIB. Zodiac
// non e' qui: produce anche pneumatici realmente smontabili.
const RIB_MODEL_RE =
  /\b(joker\s*boat|novamarine|bwa\b|scanner\s+\d|lomac|williams|capelli\s+tempest|nuova\s+jolly)\b/i

function parseNumber(value) {
  const match = String(value ?? '').replace(',', '.').match(/\d+(?:\.\d+)?/)
  return match ? Number.parseFloat(match[0]) : null
}

function toMeters(value, min = 1.5, max = 9.99) {
  const n = parseNumber(value)
  if (!Number.isFinite(n)) return null
  if (n >= 1000 && n <= 9999) {
    const meters = n / 1000
    return meters >= min && meters <= max ? meters : null
  }
  if (n >= 100 && n <= 999) {
    const meters = n / 100
    return meters >= min && meters <= max ? meters : null
  }
  if (n >= min && n <= max) return n
  return null
}

function lengthFromText(text = '', min = 1.5, max = 9.99) {
  const cm = String(text).match(/\b(\d{3,4})\s*cm\b/i)
  if (cm) {
    const meters = Number.parseInt(cm[1], 10) / 100
    return meters >= min && meters <= max ? Math.round(meters * 100) / 100 : null
  }

  const meters = String(text).match(/\b(\d{1,2}(?:[.,]\d{1,2})?)\s*m(?:etri)?\b/i)
  return meters ? toMeters(meters[1], min, max) : null
}

function lengthFromTitle(title = '', min = 1.5, max = 9.99) {
  const explicit = lengthFromText(title, min, max)
  if (explicit != null) return explicit
  if (max > 9.99) {
    const cabin = String(title).match(/\b([6-9](?:[.,]\d{1,2})?|1[0-2](?:[.,]\d{1,2})?)\b/)
    return cabin ? toMeters(cabin[1].replace(',', '.'), min, max) : null
  }
  const bare = String(title).match(/\b([2-5][.,]\d{1,2})\b/)
  return bare ? toMeters(bare[1], min, max) : null
}

export function normalizeLengthMeters(featureValue, subject = '', body = '', range = {}) {
  const min = range.min ?? 1.5
  const max = range.max ?? 9.99
  const subjectMeters = lengthFromTitle(subject, min, max)
  if (subjectMeters != null) return subjectMeters

  const featureMeters = toMeters(featureValue, min, max)
  if (featureMeters != null) return Math.round(featureMeters * 100) / 100

  return lengthFromText(body, min, max)
}

export function normalizeBoatLength(featureValue, subject = '', body = '') {
  return normalizeLengthMeters(featureValue, subject, body, { min: 1.5, max: 9.99 })
}

const CLUB_DINGHY_RE = /\b(optimist|laser|420\b|470\b|49er|finn\b|rs\s?feva|rs\s?tera|splash|byte|topper)\b/i
const SAILBOAT_RE =
  /\b(barca a vela|sloop|cutter|ketch|deriva mobile|cometino|comet\s*\d|comar|finot|vela\s*[/-]\s*motore)\b/i
const SAIL_GEAR_RE = /\b(randa|genoa|fiocco|spinnaker|gennaker)\b/i
const WHOLE_SAILBOAT_RE =
  /\b(barca a vela|cabinato|sloop|cutter|ketch|deriva mobile|comet\s*\d|comar|optimist|laser\s?\d)\b/i

export function isClubDinghy(text = '') {
  return CLUB_DINGHY_RE.test(String(text))
}

export function isSailboat(text = '') {
  const value = String(text)
  if (SAILBOAT_RE.test(value) || SAIL_GEAR_RE.test(value) || isClubDinghy(value)) return true
  if (/\bcabinato\b/i.test(value) && !/\b(gozzo|open|lancia|fuoribordo)\b/i.test(value)) return true
  return false
}

export function isWholeSailboat(text = '') {
  return WHOLE_SAILBOAT_RE.test(String(text)) || isClubDinghy(text)
}

export function sailTypeOf(text = '') {
  const value = String(text)
  if (isClubDinghy(value)) return 'deriva'
  if (/\b(cabinato|cabina|cuccette|dinette|bagno marino|comet|comar)\b/i.test(value)) return 'cabinato'
  if (/\b(deriva mobile|dinghy|derive)\b/i.test(value)) return 'deriva'
  return 'cabinato'
}

export function extractSailInventory(text = '') {
  const value = String(text).toLowerCase()
  const found = []
  if (/\branda\b/.test(value)) found.push('randa')
  if (/\bgenoa\b/.test(value)) found.push('genoa')
  if (/\bfiocco\b/.test(value)) found.push('fiocco')
  if (/\bspinnaker\b/.test(value)) found.push('spinnaker')
  if (/\bgennaker\b/.test(value)) found.push('gennaker')
  return found
}

export function hasHardHull(text = '') {
  return HARD_HULL_RE.test(text) || RIB_MODEL_RE.test(text)
}

export function detectIncludedMotor(text = '', cv = null) {
  const value = String(text).toLowerCase()
  if (/\b(senza motore|motore escluso|solo gommone|vendita senza fuoribordo)\b/.test(value)) return false
  const included = /\b(con|completo di|inclus[oa]|compreso)\b.{0,35}\b(motore|fuoribordo)\b/.test(value)
    || /\b(gommone|tender)\b.{0,45}(?:\+|e)\s*(?:il\s+)?\b(motore|fuoribordo)\b/.test(value)
  return included && (cv == null || (cv >= 2 && cv <= 40.8))
}

function findBrand(text = '') {
  const value = String(text).toLowerCase()
  return MOTOR_BRANDS.find((brand) => new RegExp(`\\b${brand}\\b`, 'i').test(value)) || null
}

export function extractPreferredBrand(subject = '', body = '') {
  return findBrand(subject) || findBrand(body)
}

function labeledPowers(text = '') {
  const value = String(text).replace(/,/g, '.')
  const powers = []
  let match
  const cvRe = /(\d{1,2}(?:\.\d)?)\s*(?:cv|hp|cavalli)\b/gi
  while ((match = cvRe.exec(value))) powers.push(Number.parseFloat(match[1]))
  const kwRe = /(\d{1,2}(?:\.\d)?)\s*kw\b/gi
  while ((match = kwRe.exec(value))) powers.push(Number.parseFloat(match[1]) * 1.3596)
  return powers.filter((power) => power >= 2 && power < 200)
}

export function extractPreferredPower(subject = '', body = '', min = 6, max = 40.8) {
  const titleLabeled = labeledPowers(subject)
  if (titleLabeled.length) {
    const valid = titleLabeled.filter((power) => power >= min && power <= max)
    return valid.length ? Math.max(...valid) : Math.max(...titleLabeled)
  }

  const implied = String(subject).replace(',', '.').match(
    /\b(?:yamaha|suzuki|mercury|tohatsu|honda|selva|hidea|evinrude|johnson)\s+(?:df|bf|f)?\s*(\d{1,2}(?:\.\d)?)\b/i,
  )
  if (implied) {
    const power = Number.parseFloat(implied[1])
    if (power >= min && power <= max) return power
  }

  const bodyLabeled = labeledPowers(body)
  const valid = bodyLabeled.filter((power) => power >= min && power <= max)
  if (valid.length) return Math.max(...valid)
  return bodyLabeled.length ? Math.max(...bodyLabeled) : null
}

function findShaft(text = '') {
  const value = String(text).toLowerCase()
  if (/gambo[\s,;:-]*corto|short shaft|15(?:"|\u201d)|381\s*mm/.test(value)) return 'corto'
  if (/gambo[\s,;:-]*lungo|long shaft|20(?:"|\u201d)|508\s*mm/.test(value)) return 'lungo'
  return null
}

export function extractPreferredShaft(subject = '', body = '') {
  return findShaft(subject) || findShaft(body)
}
