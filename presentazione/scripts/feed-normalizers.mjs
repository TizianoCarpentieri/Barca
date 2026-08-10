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

function toMeters(value) {
  const n = parseNumber(value)
  if (!Number.isFinite(n)) return null
  if (n >= 1000 && n <= 9999) return n / 1000 // millimetri
  if (n >= 100 && n <= 999) return n / 100 // centimetri (Subito: 380 => 3,80 m)
  if (n >= 1.5 && n <= 9.99) return n
  return null
}

function lengthFromText(text = '') {
  const cm = String(text).match(/\b(\d{3})\s*cm\b/i)
  if (cm) return Math.round((Number.parseInt(cm[1], 10) / 100) * 100) / 100

  const meters = String(text).match(/\b(\d(?:[.,]\d{1,2})?)\s*m(?:etri)?\b/i)
  return meters ? toMeters(meters[1]) : null
}

function lengthFromTitle(title = '') {
  const explicit = lengthFromText(title)
  if (explicit != null) return explicit
  const bare = String(title).match(/\b([2-5][.,]\d{1,2})\b/)
  return bare ? toMeters(bare[1]) : null
}

export function normalizeBoatLength(featureValue, subject = '', body = '') {
  // Il titolo e' l'affermazione piu' specifica del venditore. Il campo
  // strutturato Subito e' spesso in centimetri e talvolta non coincide.
  const subjectMeters = lengthFromTitle(subject)
  if (subjectMeters != null) return subjectMeters

  const featureMeters = toMeters(featureValue)
  if (featureMeters != null) return Math.round(featureMeters * 100) / 100

  return lengthFromText(body)
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
