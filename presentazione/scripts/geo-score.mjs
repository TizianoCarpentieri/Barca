/**
 * Distanza / zona operativa Bestie: Ardea–Pomezia / litorale laziale.
 * Lo score è penalizzato in modo inversamente proporzionale alla distanza:
 * un annuncio lontano vale come se costasse di più (es. 1000€ in Puglia ≈ 1200€).
 */

export const LAZIO_TOWNS =
  /\b(anzio|nettuno|pomezia|ardea|fiumicino|roma|ostia|circeo|san\s*felice|sperlonga|gaeta|formia|latina|civitavecchia|santa\s*marinella|ladispoli|torvaianica|aprilia|pomezia|minturno|fondi|terracina|sabaudia|san\s*felice\s*circeo)\b/i

/** Fattore prezzo effettivo per regione (1.0 = casa). Puglia = 1.2 come da esempio utente. */
export const REGION_PRICE_FACTOR = {
  Lazio: 1.0,
  Toscana: 1.12,
  Umbria: 1.14,
  Abruzzo: 1.14,
  Marche: 1.15,
  Campania: 1.12,
  Molise: 1.18,
  'Emilia-Romagna': 1.2,
  Liguria: 1.18,
  Basilicata: 1.2,
  Puglia: 1.2,
  Calabria: 1.25,
  Sicilia: 1.3,
  Sardegna: 1.32,
  Lombardia: 1.28,
  Piemonte: 1.3,
  'Valle d\'Aosta': 1.32,
  Veneto: 1.28,
  'Friuli-Venezia Giulia': 1.3,
  'Trentino-Alto Adige': 1.3,
}

/**
 * @param {{ region?: string, place?: string, town?: string, city?: string }} item
 * @param {string} [blob]
 * @returns {number} fattore ≥ 1
 */
export function distanceFactor(item, blob = '') {
  const place = `${item.place || ''} ${item.town || ''} ${item.city || ''} ${blob}`
  if (item.region === 'Lazio' || LAZIO_TOWNS.test(place)) return 1.0
  const f = REGION_PRICE_FACTOR[item.region]
  if (typeof f === 'number') return f
  // regione sconosciuta / estero
  return 1.28
}

/**
 * Applica penalità distanza allo score e aggiorna reasons.
 * @returns {{ score: number, factor: number, effectivePrice: number|null }}
 */
export function applyDistanceScore(item, score, reasons) {
  const blob = `${item.subject || ''} ${item.body || ''}`
  const factor = distanceFactor(item, blob)
  const price = item.price
  const effectivePrice =
    price != null && Number.isFinite(price) ? Math.round(price * factor) : null

  if (factor <= 1.001) {
    // già premiato come Lazio altrove; non doppiare
    return { score, factor, effectivePrice: price ?? null }
  }

  // Penalità: (factor-1)*80 → Puglia 1.2 = −16 pt (come “+200€” su 1000)
  // Extra se il prezzo effettivo spinge fuori budget soft
  let penalty = Math.round((factor - 1) * 80)
  if (effectivePrice != null && price != null) {
    // allinea alla differenza di prezzo percepita
    const delta = effectivePrice - price
    penalty = Math.max(penalty, Math.round(delta / 12.5)) // 200€ → 16 pt
  }

  const next = score - penalty
  if (effectivePrice != null) {
    reasons.push(`lontano (≈${effectivePrice}€ eq.)`)
  } else {
    reasons.push(`lontano ×${factor.toFixed(2)}`)
  }
  return { score: next, factor, effectivePrice }
}
