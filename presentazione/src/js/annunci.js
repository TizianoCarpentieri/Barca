const listEl = document.getElementById('ads-list')
const emptyEl = document.getElementById('ads-empty')
const errEl = document.getElementById('ads-error')
const updatedEl = document.getElementById('ads-updated')
const noteEl = document.getElementById('ads-note')
const statsEl = document.getElementById('ads-stats')
const filtersEl = document.getElementById('ads-filters')
const catsEl = document.getElementById('ads-cats')
const stampEl = document.getElementById('ads-stamp')
const howEl = document.getElementById('ads-how')

if (!listEl) {
  /* not on annunci page */
} else {
  /* ——— geo: base Ardea/Pomezia (allineato a scripts/geo-score.mjs) ——— */
  const LAZIO_TOWNS =
    /\b(anzio|nettuno|pomezia|ardea|fiumicino|roma|ostia|circeo|san\s*felice|sperlonga|gaeta|formia|latina|civitavecchia|santa\s*marinella|ladispoli|torvaianica|aprilia|minturno|fondi|terracina|sabaudia)\b/i
  const REGION_PRICE_FACTOR = {
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
    "Valle d'Aosta": 1.32,
    Veneto: 1.28,
    'Friuli-Venezia Giulia': 1.3,
    'Trentino-Alto Adige': 1.3,
  }

  function distanceFactor(it) {
    const place = `${it.place || ''} ${it.town || ''} ${it.city || ''}`
    if (it.region === 'Lazio' || LAZIO_TOWNS.test(place)) return 1.0
    const f = REGION_PRICE_FACTOR[it.region]
    return typeof f === 'number' ? f : 1.28
  }

  /** Ricalcola score se il JSON non ha ancora distance_factor (o per coerenza UI). */
  function withGeoScore(it) {
    const factor =
      it.distance_factor != null && it.distance_factor > 0 ? it.distance_factor : distanceFactor(it)
    const price = it.price
    const effectivePrice =
      it.effective_price != null
        ? it.effective_price
        : price != null
          ? Math.round(price * factor)
          : null

    // Accessori: niente penalità distanza (oggetti spedibili via Subito)
    if (cat === 'accessori') {
      return { ...it, distance_factor: 1, effective_price: effectivePrice }
    }

    // Se il feed ha già applicato la distanza (reason lontano / distance_factor), non doppiare
    const already =
      it.distance_factor != null ||
      (it.reasons || []).some((r) => /lontano/i.test(String(r)))

    let score = it.score ?? 0
    const reasons = [...(it.reasons || [])]
    if (!already && factor > 1.001) {
      let penalty = Math.round((factor - 1) * 80)
      if (effectivePrice != null && price != null) {
        penalty = Math.max(penalty, Math.round((effectivePrice - price) / 12.5))
      }
      score -= penalty
      if (effectivePrice != null) reasons.push(`lontano (≈${effectivePrice}€ eq.)`)
    }

    const fit =
      it.status === 'stretch'
        ? 'stretch'
        : score >= (FEEDS[cat]?.fitHigh ?? 55) && it.status !== 'weak'
          ? 'alto'
          : score >= 45
            ? 'medio'
            : 'basso'

    return {
      ...it,
      score,
      reasons,
      distance_factor: factor,
      effective_price: effectivePrice,
      fit,
    }
  }

  const FEEDS = {
    rigide: {
      file: 'annunci.json',
      label: 'Rigide',
      stamp: 'Rigide',
      hardMax: 4500,
      hardLabel: '≤4.500€',
      ph: 'BARCA',
      fallbackNote:
        'Scafo rigido. Score ridotto se lontano da Ardea/Pomezia (es. 1000€ in Puglia ≈ 1200€).',
      how: 'Feed scafi rigidi. Score anche in base alla distanza dalla base Lazio (Ardea/Pomezia).',
    },
    gommoni: {
      file: 'gommoni.json',
      label: 'Gommoni',
      stamp: 'Gommoni',
      hardMax: 1500,
      hardLabel: '≤1.500€',
      ph: 'GOMMONE',
      fallbackNote:
        'Gommoni pneumatici. Distanza da casa pesa sullo score (Puglia ×1.2). Ref Argo 970€ (−20% usato).',
      how: 'Feed gommoni. Lontano dalla base = prezzo equivalente più alto e score più basso.',
    },
    motori: {
      file: 'motori.json',
      label: 'Motori',
      stamp: 'Motori',
      hardMax: 1200,
      hardLabel: '≤1.200€',
      ph: 'MOTORE',
      fallbackNote:
        'Fuoribordo da 6 CV in su (niente 2.5/4). Sweet 9.9–15 CV, ideale 8–20. Hard ≤1.200€. Lazio preferito.',
      how: 'Feed motori per gommoni 3.5–4 m: scarta sotto 6 CV. Target 9.9–15–20. Hard ≤1.200€.',
    },
    accessori: {
      file: 'accessori.json',
      label: 'Accessori',
      stamp: 'Accessori',
      hardMax: null,
      fitHigh: 65,
      ph: 'ACCESSORIO',
      hasEngine: false,
        fallbackNote:
        'Accessori nautici per barche piccole (Subito). Score su rapporto prezzo vs nuovo, condizione, marca, spedizione/distanza.',
      how: 'Feed accessori (Subito): ecoscandagli, portacanne, bimini, ancore, sicurezza, pompe… Score premia quanto sei sotto il prezzo nuovo di riferimento.',
    },
  }

  function detectCat() {
    const q = new URLSearchParams(location.search).get('cat')
    if (q && FEEDS[q]) return q
    const h = (location.hash || '').replace(/^#/, '').toLowerCase()
    if (h && FEEDS[h]) return h
    if (location.pathname.includes('gommoni')) return 'gommoni'
    if (location.pathname.includes('motori')) return 'motori'
    return 'rigide'
  }

  let cat = detectCat()
  let all = []
  let filter = 'all'
  const cache = {}

  const euro = (n) =>
    n == null
      ? 'n.d.'
      : new Intl.NumberFormat('it-IT', {
          style: 'currency',
          currency: 'EUR',
          maximumFractionDigits: 0,
        }).format(n)

  const when = (iso) => {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString('it-IT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  function hardMax() {
    return FEEDS[cat].hardMax
  }

  function applyFilter(items) {
    const max = hardMax()
    return items.filter((it) => {
      if (filter === 'lazio') return it.region === 'Lazio' || /lazio/i.test(it.place || '')
      if (filter === 'alto') return it.fit === 'alto'
      if (filter === 'hard') return max != null && it.price != null && it.price <= max
      return true
    })
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function card(it) {
    const fitClass =
      it.fit === 'alto' ? 'ads-fit--alto' : it.fit === 'stretch' ? 'ads-fit--stretch' : 'ads-fit--mid'
    const cv = it.cv != null ? `${it.cv} CV` : null
    const len = it.length_m != null ? `${it.length_m} m` : ''
    const brand = it.brand ? String(it.brand) : ''
    const floor = it.floor ? String(it.floor) : ''
    const catLabel = it.category_label ? String(it.category_label) : ''
    const cond = it.condition ? String(it.condition) : ''
    const ratio = it.ratio != null ? `${Math.round(it.ratio * 100)}% del nuovo` : ''
    const src = it.source === 'subito' ? 'Subito' : ''
    const reasons = (it.reasons || []).slice(0, 4).join(' · ')
    const ph = FEEDS[cat].ph
    const img = it.image
      ? `<img class="ads-card__img" src="${it.image}" alt="" loading="lazy" decoding="async" width="640" height="400" />`
      : `<div class="ads-card__img ads-card__img--ph" aria-hidden="true">${ph}</div>`

    const showEq =
      it.effective_price != null &&
      it.price != null &&
      it.distance_factor > 1.05 &&
      it.effective_price !== it.price

    return `<article class="ads-card" data-reveal>
      <a class="ads-card__link" href="${it.url}" target="_blank" rel="noopener noreferrer">
        <div class="ads-card__media">${img}
          <span class="ads-fit ${fitClass}">${it.fit || '—'}</span>
        </div>
        <div class="ads-card__body">
          <div class="ads-card__price">${euro(it.price)}${
            showEq
              ? `<span class="ads-card__eq" title="Prezzo equivalente a casa (distanza)"> ≈${euro(it.effective_price)}</span>`
              : ''
          }</div>
          <h2 class="ads-card__title">${escapeHtml(it.subject)}</h2>
          <p class="ads-card__place">${escapeHtml(it.place || 'Italia')}</p>
          <div class="ads-card__tags">
            ${src ? `<span class="ads-tag--src">${escapeHtml(src)}</span>` : ''}
            ${catLabel ? `<span>${escapeHtml(catLabel)}</span>` : ''}
            ${cond ? `<span>${escapeHtml(cond)}</span>` : ''}
            ${cv ? `<span>${escapeHtml(cv)}</span>` : ''}
            ${len ? `<span>${escapeHtml(len)}</span>` : ''}
            ${brand ? `<span>${escapeHtml(brand)}</span>` : ''}
            ${ratio ? `<span>${escapeHtml(ratio)}</span>` : ''}
            ${floor ? `<span>${escapeHtml(floor)}</span>` : ''}
            <span>score ${it.score ?? '—'}</span>
          </div>
          ${reasons ? `<p class="ads-card__why">${escapeHtml(reasons)}</p>` : ''}
          <span class="ads-card__cta">Apri su ${src || 'Subito'} →</span>
        </div>
      </a>
    </article>`
  }

  function render() {
    const items = applyFilter(all)
    listEl.innerHTML = items.map(card).join('')
    emptyEl.hidden = items.length > 0
    listEl.querySelectorAll('[data-reveal]').forEach((el, i) => {
      el.style.setProperty('--d', `${Math.min(i, 8) * 40}ms`)
      requestAnimationFrame(() => el.classList.add('is-in'))
    })
  }

  function syncHardChip() {
    const conf = FEEDS[cat]
    const hardBtn =
      document.getElementById('ads-hard-chip') ||
      filtersEl?.querySelector('[data-filter="hard"]')
    if (hardBtn) {
      if (conf.hardMax == null) {
        hardBtn.hidden = true
      } else {
        hardBtn.hidden = false
        hardBtn.textContent = conf.hardLabel
        hardBtn.dataset.hardMax = String(conf.hardMax)
      }
    }
  }

  function syncUi() {
    const conf = FEEDS[cat]
    catsEl?.querySelectorAll('[data-cat]').forEach((b) => {
      const on = b.getAttribute('data-cat') === cat
      b.classList.toggle('is-on', on)
      b.setAttribute('aria-selected', on ? 'true' : 'false')
    })
    if (stampEl) stampEl.textContent = conf.stamp
    syncHardChip()
    if (howEl) {
      howEl.innerHTML = `${conf.how}
        <strong style="color:var(--foam)"> Verifica sempre documenti e stato.</strong>`
    }
    document.title = `Annunci · ${conf.label} — Progetto Barca`
  }

  function setFilterChip(name) {
    filter = name
    filtersEl?.querySelectorAll('[data-filter]').forEach((b) => {
      b.classList.toggle('is-on', b.getAttribute('data-filter') === name)
    })
  }

  filtersEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]')
    if (!btn || !filtersEl.contains(btn)) return
    setFilterChip(btn.getAttribute('data-filter') || 'all')
    render()
  })

  catsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]')
    if (!btn || !catsEl.contains(btn)) return
    const next = btn.getAttribute('data-cat')
    if (!next || !FEEDS[next] || next === cat) return
    cat = next
    const url = new URL(location.href)
    history.replaceState(null, '', `${url.pathname}?cat=${encodeURIComponent(cat)}`)
    setFilterChip('all')
    loadCat()
  })

  const base = import.meta.env.BASE_URL || './'

  function candidatesFor(file) {
    return [
      `${base}data/${file}`,
      `./data/${file}`,
      `data/${file}`,
      `/Barca/data/${file}`,
    ]
  }

  async function fetchFeed(file) {
    if (cache[file]) return cache[file]
    let lastErr
    for (const url of candidatesFor(file)) {
      try {
        const res = await fetch(url, { cache: 'no-cache' })
        if (!res.ok) throw new Error(`${res.status} ${url}`)
        const data = await res.json()
        cache[file] = data
        return data
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr || new Error('Feed non trovato')
  }

  function showLoading() {
    updatedEl.textContent = 'Caricamento…'
    listEl.innerHTML = ''
    emptyEl.hidden = true
    errEl.hidden = true
    errEl.textContent = ''
    statsEl.hidden = true
    if (filtersEl) filtersEl.hidden = true
    stampEl?.classList.remove('stamp--ok')
  }

  function applyData(data) {
    const conf = FEEDS[cat]
    all = (data.items || []).map(withGeoScore)
    all.sort((a, b) => b.score - a.score || (a.price || 9e9) - (b.price || 9e9))

    updatedEl.textContent = `Aggiornato ${when(data.updated_at)}`
    noteEl.textContent = data.filters?.note || conf.fallbackNote
    const s = data.stats || {}
    const lazioN = all.filter((x) => x.region === 'Lazio' || /lazio/i.test(x.place || '')).length
    statsEl.hidden = false
    statsEl.innerHTML = `
      <div class="ads-stats__item"><strong>${s.shown ?? all.length}</strong><span>in lista</span></div>
      <div class="ads-stats__item"><strong>${s.lazio_in_shown ?? lazioN}</strong><span>Lazio</span></div>
      <div class="ads-stats__item"><strong>${s.scanned_unique ?? '—'}</strong><span>scansionati</span></div>
    `
    if (filtersEl) filtersEl.hidden = false
    syncHardChip()
    stampEl?.classList.add('stamp--ok')
    render()
  }

  function loadCat() {
    syncUi()
    showLoading()
    // assicurati che il chip hard sia aggiornato anche a filtri hidden
    syncHardChip()
    fetchFeed(FEEDS[cat].file)
      .then(applyData)
      .catch((e) => {
        all = []
        updatedEl.textContent = 'Feed non disponibile'
        errEl.hidden = false
        errEl.textContent = `Impossibile caricare gli annunci. (${e.message || e})`
      })
  }

  loadCat()
}
