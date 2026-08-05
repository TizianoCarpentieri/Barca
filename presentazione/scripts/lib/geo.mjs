/**
 * Distanza / costo-equivalente rispetto alla base Bestie (Ardea–Pomezia, Lazio).
 * factor 1.0 = locale; 1.2 = come se costasse +20% (es. 1000€ → ~1200€).
 */

export const LAZIO_TOWNS =
  /\b(anzio|nettuno|pomezia|ardea|fiumicino|roma|ostia|circeo|san\s*felice|sperlonga|gaeta|formia|latina|civitavecchia|santa\s*marinella|ladispoli|torvaianica|aprilia|pomezia|torvaianica|minturno|fondi|sezze|sabaudia|terracina|cori|valentano|viterbo|rieti|frosinone)\b/i

/** Moltiplicatore prezzo equivalente per regione (oltre Lazio). */
export const REGION_PRICE_FACTOR = {
  Lazio: 1.0,
  Toscana: 1.12,
  Umbria: 1.12,
  Abruzzo: 1.12,
  Marche: 1.15,
  Campania: 1.12,
  Molise: 1.18,
  'Emilia-Romagna': 1.18,
  Liguria: 1.18,
  Basilicata: 1.2,
  Puglia: 1.2,
  Calabria: 1.25,
  Sicilia: 1.3,
  Sardegna: 1.32,
  Lombardia: 1.28,
  Piemonte: 1.3,
  'Valle d\'Aosta': 1.35,
  Veneto: 1.28,
  'Friuli-Venezia Giulia': 1.3,
  'Trentino-Alto Adige': 1.32,
}

/**
 * @param {{ region?: string, place?: string, town?: string, city?: string }} item
 * @param {string} [blob]
 * @returns {number} factor >= 1
 */
export function distanceFactor(item, blob = '') {
  const place = `${item.place || ''} ${item.town || ''} ${item.city || ''} ${blob}`
  if (item.region === 'Lazio' || LAZIO_TOWNS.test(place)) return 1.0
  const f = REGION_PRICE_FACTOR[item.region]
  if (typeof f === 'number') return f
  // regione sconosciuta / estero
  return 1.25
}

/**
 * Prezzo equivalente “a casa nostra” (più alto se lontano).
 */
export function effectivePrice(item, blob = '') {
  if (item.price == null) return null
  return Math.round(item.price * distanceFactor(item, blob))
}

/**
 * Applica penalità score in base alla distanza.
 * Stesso annuncio a 1000€ in Puglia ≈ come 1200€ in Lazio → score più basso.
 * @returns {{ score: number, factor: number, effective_price: number|null, reason: string|null }}
 */
export function applyDistanceScore(item, score, blob = '') {
  const factor = distanceFactor(item, blob)
  const eff = item.price != null ? Math.round(item.price * factor) : null
  if (factor <= 1.01) {
    return {
      score,
      factor: 1,
      effective_price: item.price ?? null,
      reason: null,
    }
  }
  // Penalità proporzionale: (factor-1)*80 → Puglia 1.2 = −16 pt
  // Extra se il delta prezzo equivalente è grosso
  let penalty = Math.round((factor - 1) * 80)
  if (item.price != null && eff != null) {
    const delta = eff - item.price
    // ogni 100€ di “sovrapprezzo distanza” ≈ −3 pt aggiuntivi (cap)
    penalty += Math.min(20, Math.round(delta / 100) * 3)
  }
  penalty = Math.min(45, Math.max(6, penalty))
  const reason =
    eff != null
      ? `lontano (×${factor.toFixed(2)} ≈${eff}€)`
      : `lontano (×${factor.toFixed(2)})`
  return {
    score: score - penalty,
    factor,
    effective_price: eff,
    reason,
  }
}
