/**
 * Scoring accessori nautici — modulo condiviso Subito.
 * Formula: score = 20 (base) + peso_tipologia + bonus_prezzo + condizione + marca + trasporto + compatibilità
 * Fit: alto ≥65 · medio ≥45 · stretch se prezzo > cap · basso <45
 *
 * v2 (2026-08-08): sola Subito · cap = ref×2 · 27 tipologie · 5 destinazioni · penalità addolcite · niente distanza
 */
export const TIPOLOGIE = [
  { id: 'fishfinder',        label: 'Ecoscandaglio',          peso: 30, ref_new: 180, cap: 360, re: /ecoscandaglio|fishfinder|\bsounder\b|striker|hook\s?\d|garmin\s+striker|lowrance/i, dest: 'elettronica', dest_label: 'Elettronica' },
  { id: 'fishfinder-deeper', label: 'Fishfinder portatile',   peso: 28, ref_new: 220, cap: 440, re: /deeper\s*(pro|start)?|fishfinder\s+portatile|portatile.*(fishfinder|ecoscandaglio)/i, dest: 'elettronica', dest_label: 'Elettronica' },
  { id: 'plotter',           label: 'Plotter / GPS',          peso: 22, ref_new: 350, cap: 700, re: /plotter|gps\s+nautic|chartplotter|gpsmap/i, dest: 'elettronica', dest_label: 'Elettronica' },
  { id: 'supporto',          label: 'Supporto tablet/phone',  peso: 16, ref_new: 40,  cap: 80,  re: /supporto\s+(tablet|telefono|phone|iphone)|tablet\s+holder|phone\s+holder|staffa\s+tablet|impermeabile.*(tablet|telefono|cellulare)/i, dest: 'elettronica', dest_label: 'Elettronica' },
  { id: 'radio-vhf',         label: 'Radio VHF',              peso: 22, ref_new: 90,  cap: 180, re: /\bvhf\b|radio\s+vhf|marine\s+vhf/i, dest: 'elettronica', dest_label: 'Elettronica' },
  { id: 'binocolo',          label: 'Binocolo / vista',       peso: 12, ref_new: 45,  cap: 90,  re: /binocolo|binocular/i, dest: 'elettronica', dest_label: 'Elettronica' },
  { id: 'portacanne-kit',    label: 'Portacanne kit',         peso: 28, ref_new: 55,  cap: 110, re: /portacanne|porta\s+canne|rod\s*holder|scotty|plastimo/i, dest: 'pesca', dest_label: 'Pesca' },
  { id: 'portacanne-poppa',  label: 'Portacanne da poppa',    peso: 26, ref_new: 45,  cap: 90,  re: /portacanne.*(poppa|falchetta|gunwale|rail)|poppa.*portacanne|falchetta.*(portacanne|porta\s+canne)/i, dest: 'pesca', dest_label: 'Pesca' },
  { id: 'killbag',           label: 'Kill bag / secchio vivo',peso: 20, ref_new: 35,  cap: 70,  re: /kill\s*bags?|secchio\s+(porta\s*)?vivo|livewell|porta\s*vivo|killbag/i, dest: 'pesca', dest_label: 'Pesca' },
  { id: 'sedile',            label: 'Sedile da pesca',        peso: 12, ref_new: 60,  cap: 120, re: /sedile\s+pesca|seat\s+fishing|pedestal\s*seat/i, dest: 'pesca', dest_label: 'Pesca' },
  { id: 'galleggianti',      label: 'Galleggianti / boe',     peso: 10, ref_new: 10,  cap: 20,  re: /galleggiant|boe|segnalet\w*/i, dest: 'pesca', dest_label: 'Pesca' },
  { id: 'canne-mulinelli',   label: 'Canne & mulinelli',      peso: 18, ref_new: 50,  cap: 100, re: /mulinell|canna\s+da\s+pesca|spinning\s+rod|combo\s+canne/i, dest: 'pesca', dest_label: 'Pesca' },
  { id: 'ancora',            label: 'Ancora + sagola',        peso: 25, ref_new: 35,  cap: 70,  re: /\bancora\b|sagola|anchor/i, dest: 'sicurezza', dest_label: 'Sicurezza & dotazione' },
  { id: 'giubbotto',         label: 'Giubbotto salvagente',   peso: 20, ref_new: 45,  cap: 90,  re: /giubbotto|salvagente|life\s*jacket|\bpfd\b/i, dest: 'sicurezza', dest_label: 'Sicurezza & dotazione' },
  { id: 'estintore',         label: 'Estintore nautico',      peso: 16, ref_new: 40,  cap: 80,  re: /estintore|fire\s*extinguisher/i, dest: 'sicurezza', dest_label: 'Sicurezza & dotazione' },
  { id: 'fanali',            label: 'Fanali di via',          peso: 16, ref_new: 50,  cap: 100, re: /fanali?|luce\s+di\s+via|navigat(ion)?\s+light|fanale/i, dest: 'sicurezza', dest_label: 'Sicurezza & dotazione' },
  { id: 'cime',              label: 'Cime / ormeggio',        peso: 8,  ref_new: 20,  cap: 40,  re: /\bcime\b|cavo\s+(ormeggio|mooring)|ormeggio/i, dest: 'sicurezza', dest_label: 'Sicurezza & dotazione' },
  { id: 'bimini',            label: 'Bimini / tendalino',     peso: 25, ref_new: 130, cap: 260, re: /bimini|tendalino|cagnaro|tenda\s+(parasole|solare)/i, dest: 'scafo', dest_label: 'Scafo & comfort' },
  { id: 'ombrellone',        label: 'Ombrellone da barca',    peso: 18, ref_new: 60,  cap: 120, re: /ombrellone/i, dest: 'scafo', dest_label: 'Scafo & comfort' },
  { id: 'telone',            label: 'Telone copertura',       peso: 14, ref_new: 90,  cap: 180, re: /telone|cover\s*barca|copertura\s+(stiva|barca|tesa)|boat\s*cover/i, dest: 'scafo', dest_label: 'Scafo & comfort' },
  { id: 'parabordi',         label: 'Parabordi',              peso: 8,  ref_new: 15,  cap: 30,  re: /parabordi|fender/i, dest: 'scafo', dest_label: 'Scafo & comfort' },
  { id: 'pompa-sentina',     label: 'Pompa di sentina',       peso: 14, ref_new: 45,  cap: 90,  re: /pompa\s+di\s+sentina|bilge\s*pump|pompa\s+sentina/i, dest: 'motore', dest_label: 'Motore & manutenzione' },
  { id: 'elica',             label: 'Elica di scorta',        peso: 12, ref_new: 75,  cap: 150, re: /elica|propeller/i, dest: 'motore', dest_label: 'Motore & manutenzione' },
  { id: 'batteria',          label: 'Batteria 12V',           peso: 10, ref_new: 60,  cap: 120, re: /batteria|battery/i, dest: 'motore', dest_label: 'Motore & manutenzione' },
  { id: 'tanica',            label: 'Tanica / cavi / oli',    peso: 10, ref_new: 25,  cap: 50,  re: /tanica|jerry\s*can|olio\s+motore|cavo\s+di\s+(accensione|avviamento)/i, dest: 'motore', dest_label: 'Motore & manutenzione' },
  { id: 'kit-riparazione',   label: 'Kit riparazione gommone',peso: 10, ref_new: 30,  cap: 60,  re: /kit\s+(riparazione|riparaz)|repair\s+kit|tappo\s+riparazione/i, dest: 'motore', dest_label: 'Motore & manutenzione' },
  { id: 'cassetta-attrezzi', label: 'Cassetta attrezzi',      peso: 8,  ref_new: 25,  cap: 50,  re: /cassetta\s+attrezz|attrezz\s+cassetta|tool\s*box/i, dest: 'motore', dest_label: 'Motore & manutenzione' },
]

export const BRANDS =
  /\b(garmin|lowrance|raymarine|humminbird|b&g|navionics|deeper|plastimo|lalizas|crewsaver|spinlock|scotty|shakespeare|mercury|yamaha|suzuki|tohatsu|solas|rodcraft|king)\b/i

export const DESTINAZIONI = {
  elettronica: 'Elettronica',
  pesca: 'Pesca',
  sicurezza: 'Sicurezza & dotazione',
  scafo: 'Scafo & comfort',
  motore: 'Motore & manutenzione',
}

export const DEST_TIPS = {
  elettronica: ['fishfinder', 'fishfinder-deeper', 'plotter', 'supporto', 'radio-vhf', 'binocolo'],
  pesca: ['portacanne-kit', 'portacanne-poppa', 'killbag', 'sedile', 'galleggianti', 'canne-mulinelli'],
  sicurezza: ['ancora', 'giubbotto', 'estintore', 'fanali', 'cime'],
  scafo: ['bimini', 'ombrellone', 'telone', 'parabordi'],
  motore: ['pompa-sentina', 'elica', 'batteria', 'tanica', 'kit-riparazione', 'cassetta-attrezzi'],
}

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
 * @param {object} item { price, effective_price, shipping_cost, source, subject, body, region, place, town, city, condition, ref_new, cap }
 * @param {object} [refs={}] mappa id→{ref_new,cap} da ref-prezzi.json (model override)
 * @returns {{ status, score, fit, reasons, category, dest, dest_label, ref_new, cap, ratio }}
 */
export function classifyAccessorio(item, refs = {}) {
  const blob = `${item.subject} ${item.body}`.toLowerCase()
  const reasons = []
  const cat = item.category || detectCategory(item)

  if (!cat) {
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['tipologia non riconosciuta'] }
  }

  const fromRef = refs[cat.id]
  const refNew = item.ref_new ?? fromRef?.ref_new ?? cat.ref_new
  const cap = fromRef?.cap ?? cat.cap
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
    return { status: 'reject', score: 0, fit: 'reject', reasons: ['annuncio-imbarcazione'] }
  }
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

  // ——— bonus prezzo per bande (penalità addolcite vs v1) ———
  if (cond === 'nuovo' || cond === 'come nuovo') {
    if (ratio <= 1.0) { score += 10; reasons.push(`in linea col nuovo (${Math.round(ratio * 100)}%)`) }
    else { score -= 10; reasons.push('sopra prezzo nuovo') }
  } else {
    if (ratio <= 0.3) { score += 25; reasons.push(`affare (${Math.round(ratio * 100)}% del nuovo)`) }
    else if (ratio <= 0.5) { score += 15; reasons.push(`buon prezzo (${Math.round(ratio * 100)}%)`) }
    else if (ratio <= 0.75) { score += 5; reasons.push(`in linea (${Math.round(ratio * 100)}%)`) }
    else if (ratio <= 0.9) { score -= 20; reasons.push('tanto vale nuovo') }
    else { score -= 15; reasons.push('usato carissimo') }
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

  // ——— trasporto / distanza (accessori = spedibili; bonus Lazio contenuto, niente penalità) ———
  if (item.region === 'Lazio' || /lazio/i.test(item.place || '')) { score += 5; reasons.push('Lazio') }

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
    dest: cat.dest,
    dest_label: cat.dest_label || cat.dest,
    ref_new: refNew,
    cap,
    ratio: Number(ratio.toFixed(2)),
  }
}
