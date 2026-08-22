import { extractSailInventory } from '../../scripts/feed-normalizers.mjs'
import { distanceFactor } from '../../scripts/geo-score.mjs'

const listEl = document.getElementById('ads-list')
const emptyEl = document.getElementById('ads-empty')
const errEl = document.getElementById('ads-error')
const updatedEl = document.getElementById('ads-updated')
const noteEl = document.getElementById('ads-note')
const statsEl = document.getElementById('ads-stats')
const filtersEl = document.getElementById('ads-filters')
const filterGroupsEl = document.getElementById('ads-filter-groups')
const filterSummaryEl = document.getElementById('ads-filter-summary')
const catsEl = document.getElementById('ads-cats')
const stampEl = document.getElementById('ads-stamp')
const howEl = document.getElementById('ads-how')

if (!listEl) {
  /* not on annunci page */
} else {
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

    if (FEEDS[cat]?.noDistancePenalty) {
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
      noDistancePenalty: true,
        fallbackNote:
        'Accessori nautici per barche piccole (Subito). Score su rapporto prezzo vs nuovo, condizione, marca, spedizione/distanza.',
      how: 'Feed accessori (Subito): ecoscandagli, portacanne, bimini, ancore, sicurezza, pompe… Score premia quanto sei sotto il prezzo nuovo di riferimento.',
    },
    vele: {
      file: 'vele.json',
      label: 'Vele',
      stamp: 'Vele · sogno',
      hardMax: 9000,
      hardLabel: '≤9.000€',
      fitHigh: 55,
      ph: 'VELA',
      fallbackNote:
        'Sogno parallelo, non piano A. Cabinati 6,5–9 m, ref Comet 770. Hard ≤9.000€, stretch 10.000. L’ormeggio Lazio è il vero costo.',
      how: 'Feed vele (osservazione). Classe Comet 770, Lazio preferito, ausiliario ≤40,8 CV. Non è una shortlist d’acquisto: prima i preventivi porto.',
    },
  }

  function detectCat() {
    if (location.pathname.includes('accessori')) return 'accessori'
    const q = new URLSearchParams(location.search).get('cat')
    if (q && FEEDS[q]) return q
    const h = (location.hash || '').replace(/^#/, '').toLowerCase()
    if (h && FEEDS[h]) return h
    if (location.pathname.includes('gommoni')) return 'gommoni'
    if (location.pathname.includes('motori')) return 'motori'
    if (location.pathname.includes('vele')) return 'vele'
    return 'rigide'
  }

  function isAccess() { return cat === 'accessori' }

  let cat = detectCat()
  let all = []
  const activeFilters = new Set()
  let destFilter = 'all'
  let tipFilter = 'all'
  const TIP_LABEL = {}
  const cache = {}

  const DEST_LABELS = {
    elettronica: 'Elettronica',
    pesca: 'Pesca',
    sicurezza: 'Sicurezza & dotazione',
    scafo: 'Scafo & comfort',
    motore: 'Motore & manutenzione',
  }
  const DEST_TIPS = {
    elettronica: ['fishfinder', 'fishfinder-deeper', 'plotter', 'supporto', 'radio-vhf', 'binocolo'],
    pesca: ['portacanne-kit', 'portacanne-poppa', 'killbag', 'sedile', 'galleggianti', 'canne-mulinelli'],
    sicurezza: ['ancora', 'giubbotto', 'estintore', 'fanali', 'cime'],
    scafo: ['bimini', 'ombrellone', 'telone', 'parabordi'],
    motore: ['pompa-sentina', 'elica', 'batteria', 'tanica', 'kit-riparazione', 'cassetta-attrezzi'],
  }

  const option = (key, label, kind = 'toggle') => ({ key, label, kind })

  function filterGroups() {
    if (cat === 'rigide') return [
      { label: 'Dove e quando', hint: 'Prima le occasioni raggiungibili', options: [option('lazio', 'Lazio'), option('recent', 'Ultimi 7 giorni')] },
      { label: 'Adatta alle Bestie', hint: 'Ingombri e patente', options: [option('alto', 'Fit alto'), option('rigida-compatta', 'Compatta ≤5 m'), option('no-patente', 'Motore ≤40,8 CV')] },
      { label: 'Budget', hint: 'Tetto del track rigide', options: [option('hard', FEEDS[cat].hardLabel)] },
    ]
    if (cat === 'gommoni') return [
      { label: 'Configurazione', hint: 'Prima forma e dotazione', options: [option('gommone-target', 'Target 3,3–3,9 m'), option('bundle', 'Motore incluso'), option('pavimento', 'Pavimento dichiarato')] },
      { label: 'Affare', hint: 'Poi qualità e prezzo', options: [option('alto', 'Fit alto'), option('hard', FEEDS[cat].hardLabel)] },
      { label: 'Logistica', hint: 'Infine distanza e freschezza', options: [option('lazio', 'Lazio'), option('recent', 'Ultimi 7 giorni')] },
    ]
    if (cat === 'motori') return [
      { label: 'Potenza', hint: 'Prima la fascia corretta', options: [option('motore-sweet', 'Sweet 9,9–15 CV'), option('motore-compatibile', 'Compatibile 6–20 CV')] },
      { label: 'Configurazione', hint: 'Poi le caratteristiche chiave', options: [option('quattro-tempi', '4 tempi'), option('gambo-corto', 'Gambo corto')] },
      { label: 'Affare e distanza', hint: 'Infine convenienza pratica', options: [option('alto', 'Fit alto'), option('hard', FEEDS[cat].hardLabel), option('lazio', 'Lazio'), option('recent', 'Ultimi 7 giorni')] },
    ]
    if (cat === 'vele') return [
      { label: 'Tipo', hint: 'Prima la forma', options: [option('vele-cabinato', 'Cabinato'), option('vele-comet', 'Classe 6,5–9 m')] },
      { label: 'Patente e budget', hint: 'Poi i vincoli Bestie', options: [option('no-patente', 'Ausiliario ≤40,8 CV'), option('hard', FEEDS[cat].hardLabel), option('alto', 'Fit alto')] },
      { label: 'Logistica', hint: 'Infine distanza e freschezza', options: [option('lazio', 'Lazio'), option('recent', 'Ultimi 7 giorni')] },
    ]

    const destOptions = Object.entries(DEST_LABELS).map(([key, label]) => option(key, label, 'dest'))
    const tipIds = destFilter === 'all' ? [] : (DEST_TIPS[destFilter] || [])
    const tipOptions = tipIds.map((key) => option(key, TIP_LABEL[key] || key, 'tip'))
    return [
      { label: 'Uso', hint: '1. Scegli la famiglia', options: destOptions },
      { label: 'Tipologia', hint: destFilter === 'all' ? '2. Prima scegli un uso' : '2. Affina la famiglia scelta', options: tipOptions },
      { label: 'Occasione', hint: '3. Restringi solo se serve', options: [option('alto', 'Fit alto'), option('recent', 'Ultimi 7 giorni')] },
    ]
  }

  function matchesFilter(it, key) {
    if (key === 'recent') return isRecent(it)
    if (key === 'lazio') return it.region === 'Lazio' || /lazio/i.test(it.place || '')
    if (key === 'alto') return it.fit === 'alto'
    if (key === 'hard') return hardMax() != null && it.price != null && it.price <= hardMax()
    if (key === 'rigida-compatta') return it.length_m != null && it.length_m <= 5
    if (key === 'no-patente') {
      if (cat === 'vele') return it.cv == null || it.cv <= 40.8
      return it.cv != null && it.cv <= 40.8
    }
    if (key === 'gommone-target') return it.length_m >= 3.3 && it.length_m <= 3.9
    if (key === 'bundle') return Boolean(it.has_engine)
    if (key === 'pavimento') return Boolean(it.floor)
    if (key === 'motore-sweet') return it.cv >= 9.9 && it.cv <= 15
    if (key === 'motore-compatibile') return it.cv >= 6 && it.cv <= 20
    if (key === 'quattro-tempi') return Boolean(it.four_stroke)
    if (key === 'gambo-corto') return it.shaft === 'corto'
    if (key === 'vele-cabinato') return it.sail_type === 'cabinato'
    if (key === 'vele-comet') return it.length_m != null && it.length_m >= 6.5 && it.length_m <= 9
    return true
  }

  function optionCount(item) {
    if (item.kind === 'dest') return all.filter((it) => it.dest === item.key).length
    if (item.kind === 'tip') {
      return all.filter((it) => it.category === item.key && (destFilter === 'all' || it.dest === destFilter)).length
    }
    return all.filter((it) => matchesFilter(it, item.key)).length
  }

  function isOptionActive(item) {
    if (item.kind === 'dest') return destFilter === item.key
    if (item.kind === 'tip') return tipFilter === item.key
    return activeFilters.has(item.key)
  }

  function activeFilterCount() {
    return activeFilters.size + (destFilter === 'all' ? 0 : 1) + (tipFilter === 'all' ? 0 : 1)
  }

  function updateFilterSummary(resultCount) {
    if (!filterSummaryEl) return
    const count = activeFilterCount()
    filterSummaryEl.textContent = count
      ? `${count} filtr${count === 1 ? 'o attivo' : 'i attivi'} · ${resultCount} risultati`
      : `Nessun filtro · ${resultCount} risultati`
    const reset = filtersEl?.querySelector('[data-filter-reset]')
    if (reset) reset.disabled = count === 0
  }

  function renderFilterTree() {
    if (!filterGroupsEl) return
    filterGroupsEl.innerHTML = filterGroups().map((group, index) => {
      const controls = group.options.length
        ? group.options.map((item) => {
            const count = optionCount(item)
            const on = isOptionActive(item)
            return `<button type="button" class="ads-chip${on ? ' is-on' : ''}" data-filter-key="${escapeHtml(item.key)}" data-filter-kind="${item.kind}" aria-pressed="${on}"${count === 0 ? ' disabled' : ''}>
              <span>${escapeHtml(item.label)}</span><small>${count}</small>
            </button>`
          }).join('')
        : `<p class="ads-filter-branch__empty">Scegli una voce nel livello precedente.</p>`
      return `<section class="ads-filter-branch" data-filter-level="${index + 1}">
        <header><span>${index + 1}</span><div><strong>${escapeHtml(group.label)}</strong><small>${escapeHtml(group.hint)}</small></div></header>
        <div class="ads-filter-branch__options">${controls}</div>
      </section>`
    }).join('')
    updateFilterSummary(applyFilter(all).length)
  }

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

  const NOW = new Date()
  const isRecent = (it) => {
    try { const d = new Date(it.date); return (NOW - d) / 86400000 < 7 } catch { return false }
  }
  const isNewBadge = (it) => {
    try { const d = new Date(it.date); return (NOW - d) / 86400000 < 2 } catch { return false }
  }

  function hardMax() {
    return FEEDS[cat].hardMax
  }

  function applyFilter(items) {
    return items.filter((it) => {
      if (isAccess() && destFilter !== 'all' && it.dest !== destFilter) return false
      if (isAccess() && tipFilter !== 'all' && it.category !== tipFilter) return false
      return [...activeFilters].every((key) => matchesFilter(it, key))
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
    const sailType = it.sail_type ? String(it.sail_type) : ''
    const sails = Array.isArray(it.sails) && it.sails.length
      ? it.sails
      : extractSailInventory(`${it.subject || ''} ${it.body || ''}`)
    const catLabel = it.category_label ? String(it.category_label) : ''
    const cond = it.condition ? String(it.condition) : ''
    const ratio = it.ratio != null ? `${Math.round(it.ratio * 100)}% del nuovo` : ''
    const src = it.source === 'ebay'
      ? 'eBay'
      : it.source === 'subito' || /subito\.it/i.test(it.url || '')
        ? 'Subito'
        : ''
    const bundle = it.has_engine ? 'motore incluso' : ''
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
          ${isNewBadge(it) ? `<span class="ads-new">Nuovo</span>` : ''}
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
            ${it.dest_label ? `<span class="ads-tag--dest">${escapeHtml(it.dest_label)}</span>` : ''}
            ${catLabel ? `<span>${escapeHtml(catLabel)}</span>` : ''}
            ${cond ? `<span>${escapeHtml(cond)}</span>` : ''}
            ${cv ? `<span>${escapeHtml(cv)}</span>` : ''}
            ${len ? `<span>${escapeHtml(len)}</span>` : ''}
            ${brand ? `<span>${escapeHtml(brand)}</span>` : ''}
            ${ratio ? `<span>${escapeHtml(ratio)}</span>` : ''}
            ${floor ? `<span>${escapeHtml(floor)}</span>` : ''}
            ${sailType ? `<span>${escapeHtml(sailType)}</span>` : ''}
            ${sails.map((s) => `<span>${escapeHtml(s)}</span>`).join('')}
            ${bundle ? `<span>${escapeHtml(bundle)}</span>` : ''}
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
    updateFilterSummary(items.length)
    listEl.innerHTML = items.map(card).join('')
    emptyEl.hidden = items.length > 0
    listEl.querySelectorAll('[data-reveal]').forEach((el, i) => {
      el.style.setProperty('--d', `${Math.min(i, 8) * 40}ms`)
      requestAnimationFrame(() => el.classList.add('is-in'))
    })
  }

  function indexTipLabels(items) {
    for (const it of items) {
      if (it.category && !TIP_LABEL[it.category]) TIP_LABEL[it.category] = it.category_label || it.category
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
    if (howEl) {
      howEl.innerHTML = `${conf.how}
        <strong style="color:var(--foam)"> Verifica sempre documenti e stato.</strong>`
    }
    document.title = `Annunci · ${conf.label} — Progetto Barca`
  }

  function resetFilters() {
    activeFilters.clear()
    destFilter = 'all'
    tipFilter = 'all'
  }

  filtersEl?.addEventListener('click', (e) => {
    const reset = e.target.closest('[data-filter-reset]')
    if (reset) {
      resetFilters()
      renderFilterTree()
      render()
      return
    }
    const btn = e.target.closest('[data-filter-key]')
    if (!btn || !filtersEl.contains(btn) || btn.disabled) return
    const key = btn.getAttribute('data-filter-key')
    const kind = btn.getAttribute('data-filter-kind') || 'toggle'
    if (kind === 'dest') {
      destFilter = destFilter === key ? 'all' : key
      tipFilter = 'all'
    } else if (kind === 'tip') {
      tipFilter = tipFilter === key ? 'all' : key
    } else if (activeFilters.has(key)) {
      activeFilters.delete(key)
    } else {
      activeFilters.add(key)
    }
    renderFilterTree()
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
    resetFilters()
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

    if (isAccess()) indexTipLabels(all)

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
    renderFilterTree()
    stampEl?.classList.add('stamp--ok')
    render()
  }

  function loadCat() {
    syncUi()
    showLoading()
    fetchFeed(FEEDS[cat].file)
      .then(applyData)
      .catch((e) => {
        all = []
        updatedEl.textContent = 'Feed non disponibile'
        errEl.hidden = false
        errEl.textContent = `Impossibile caricare gli annunci. (${e.message || e})`
      })
  }

  function assertTabsMatchFeeds() {
    if (!catsEl) return
    const buttons = [...catsEl.querySelectorAll('[data-cat]')].map((el) => el.getAttribute('data-cat'))
    if (!buttons.length) return
    const expected = Object.keys(FEEDS).filter((key) => key !== 'accessori')
    const missing = expected.filter((key) => !buttons.includes(key))
    const extra = buttons.filter((key) => !FEEDS[key])
    if (missing.length || extra.length) {
      console.error('[annunci] tab/FEEDS mismatch', { missing, extra })
    }
  }

  assertTabsMatchFeeds()
  loadCat()
}
