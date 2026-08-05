const listEl = document.getElementById('ads-list')
const emptyEl = document.getElementById('ads-empty')
const errEl = document.getElementById('ads-error')
const updatedEl = document.getElementById('ads-updated')
const noteEl = document.getElementById('ads-note')
const statsEl = document.getElementById('ads-stats')
const filtersEl = document.getElementById('ads-filters')
const catsEl = document.getElementById('ads-cats')
const stampEl = document.getElementById('ads-stamp')
const hardChipEl = document.getElementById('ads-hard-chip')
const howEl = document.getElementById('ads-how')

if (!listEl) {
  /* not on annunci page */
} else {
  const FEEDS = {
    rigide: {
      file: 'annunci.json',
      label: 'Rigide',
      stamp: 'Rigide',
      hardMax: 4500,
      hardLabel: '≤4.500€',
      ph: 'BARCA',
      fallbackNote:
        'Scafo rigido (gozzo/open/lancia). No gommone/RIB. Prezzo low-budget, preferenza Lazio, CV ≤40,8 se dichiarato.',
      how: 'Feed scafi rigidi: scarta gommoni/RIB e motori soli, prezzi ~800–4.500€ (stretch 5.500), ordina per fit (Lazio, gozzo/open, CV).',
    },
    gommoni: {
      file: 'gommoni.json',
      label: 'Gommoni',
      stamp: 'Gommoni',
      hardMax: 4500,
      hardLabel: '≤4.500€',
      ph: 'GOMMONE',
      fallbackNote:
        'Gommoni pneumatici (no RIB rigido). ≥3.3 m, ≥4 pax, trasportabili auto, pesca. Paiolato alluminio o airdeck. Ref Argo-Evo 360 a 970€ (−20% usato).',
      how: 'Feed gommoni: no RIB scafo rigido, lunghezza ideale 3.5–3.8 m, paiolato alluminio > airdeck, chiglia gonfiabile. Usato ≈ nuovo deve costare almeno −20%.',
    },
    motori: {
      file: 'motori.json',
      label: 'Motori',
      stamp: 'Motori',
      hardMax: 900,
      hardLabel: '≤900€',
      ph: 'MOTORE',
      fallbackNote:
        'Fuoribordo piccoli. 4 tempi e gambo corto preferiti. Ideale 5–20 CV, max 40,8. Adatti a gommoni e barche no-patente.',
      how: 'Feed motori: fuoribordo ≤40,8 CV (ideale 5–20), 4 tempi preferiti, gambo corto, marche buone. Verifica ore e revisione.',
    },
  }

  function detectCat() {
    const q = new URLSearchParams(location.search).get('cat')
    if (q && FEEDS[q]) return q
    const h = (location.hash || '').replace(/^#/, '').toLowerCase()
    if (h && FEEDS[h]) return h
    if (location.pathname.includes('gommoni') || document.body.dataset.feed === 'gommoni') return 'gommoni'
    if (location.pathname.includes('motori') || document.body.dataset.feed === 'motori') return 'motori'
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
      const d = new Date(iso)
      return d.toLocaleString('it-IT', {
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

  function applyFilter(items) {
    const hardMax = FEEDS[cat].hardMax
    return items.filter((it) => {
      if (filter === 'lazio') return it.region === 'Lazio' || /lazio/i.test(it.place || '')
      if (filter === 'alto') return it.fit === 'alto'
      if (filter === 'hard') return it.price != null && it.price <= hardMax
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
    const cv = it.cv != null ? `${it.cv} CV` : 'CV n.d.'
    const len = it.length_m != null ? `${it.length_m} m` : ''
    const brand = it.brand ? String(it.brand) : ''
    const floor = it.floor ? String(it.floor) : ''
    const reasons = (it.reasons || []).slice(0, 4).join(' · ')
    const ph = FEEDS[cat].ph
    const img = it.image
      ? `<img class="ads-card__img" src="${it.image}" alt="" loading="lazy" decoding="async" width="640" height="400" />`
      : `<div class="ads-card__img ads-card__img--ph" aria-hidden="true">${ph}</div>`

    return `<article class="ads-card" data-reveal>
      <a class="ads-card__link" href="${it.url}" target="_blank" rel="noopener noreferrer">
        <div class="ads-card__media">${img}
          <span class="ads-fit ${fitClass}">${it.fit || '—'}</span>
        </div>
        <div class="ads-card__body">
          <div class="ads-card__price">${euro(it.price)}</div>
          <h2 class="ads-card__title">${escapeHtml(it.subject)}</h2>
          <p class="ads-card__place">${escapeHtml(it.place || 'Italia')}</p>
          <div class="ads-card__tags">
            <span>${escapeHtml(cv)}</span>
            ${len ? `<span>${escapeHtml(len)}</span>` : ''}
            ${brand ? `<span>${escapeHtml(brand)}</span>` : ''}
            ${floor ? `<span>${escapeHtml(floor)}</span>` : ''}
            <span>score ${it.score ?? '—'}</span>
          </div>
          ${reasons ? `<p class="ads-card__why">${escapeHtml(reasons)}</p>` : ''}
          <span class="ads-card__cta">Apri su Subito →</span>
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

  function syncUi() {
    const conf = FEEDS[cat]
    catsEl?.querySelectorAll('[data-cat]').forEach((b) => {
      const on = b.getAttribute('data-cat') === cat
      b.classList.toggle('is-on', on)
      b.setAttribute('aria-selected', on ? 'true' : 'false')
    })
    if (stampEl) stampEl.textContent = conf.stamp
    if (hardChipEl) {
      hardChipEl.textContent = conf.hardLabel
      hardChipEl.setAttribute('data-filter', 'hard')
    }
    if (howEl) {
      howEl.innerHTML = `${conf.how}
        <strong style="color:var(--foam)"> I CV e i documenti vanno sempre controllati a mano.</strong>`
    }
    document.title = `Annunci · ${conf.label} — Progetto Barca`
  }

  function setFilterChip(name) {
    filter = name
    filtersEl?.querySelectorAll('[data-filter]').forEach((b) => {
      b.classList.toggle('is-on', b.getAttribute('data-filter') === name)
    })
  }

  filtersEl?.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setFilterChip(btn.getAttribute('data-filter') || 'all')
      render()
    })
  })

  catsEl?.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = btn.getAttribute('data-cat')
      if (!next || !FEEDS[next] || next === cat) return
      cat = next
      const url = new URL(location.href)
      url.searchParams.set('cat', cat)
      url.hash = ''
      history.replaceState(null, '', url.pathname + url.search)
      setFilterChip('all')
      loadCat()
    })
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
    filtersEl.hidden = true
    stampEl?.classList.remove('stamp--ok')
  }

  function applyData(data) {
    const conf = FEEDS[cat]
    all = data.items || []
    updatedEl.textContent = `Aggiornato ${when(data.updated_at)}`
    noteEl.textContent = data.filters?.note || conf.fallbackNote
    const s = data.stats || {}
    statsEl.hidden = false
    statsEl.innerHTML = `
      <div class="ads-stats__item"><strong>${s.shown ?? all.length}</strong><span>in lista</span></div>
      <div class="ads-stats__item"><strong>${s.lazio_in_shown ?? '—'}</strong><span>Lazio</span></div>
      <div class="ads-stats__item"><strong>${s.scanned_unique ?? '—'}</strong><span>scansionati</span></div>
    `
    filtersEl.hidden = false
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
        errEl.textContent = `Impossibile caricare gli annunci. (${e.message || e}) Riprova dopo il prossimo aggiornamento automatico.`
      })
  }

  loadCat()
}
