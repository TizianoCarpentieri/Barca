const listEl = document.getElementById('ads-list')
const emptyEl = document.getElementById('ads-empty')
const errEl = document.getElementById('ads-error')
const updatedEl = document.getElementById('ads-updated')
const noteEl = document.getElementById('ads-note')
const statsEl = document.getElementById('ads-stats')
const filtersEl = document.getElementById('ads-filters')

if (!listEl) {
  /* not on annunci page */
} else {
  const isGommoni = location.pathname.includes('gommoni') || document.body.dataset.feed === 'gommoni'
  const isMotori = location.pathname.includes('motori') || document.body.dataset.feed === 'motori'
  let all = []
  let filter = 'all'

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
    const hardMax = isMotori ? 900 : 4500
    return items.filter((it) => {
      if (filter === 'lazio') return it.region === 'Lazio' || /lazio/i.test(it.place || '')
      if (filter === 'alto') return it.fit === 'alto'
      if (filter === 'hard') return it.price != null && it.price <= hardMax
      return true
    })
  }

  function card(it) {
    const fitClass =
      it.fit === 'alto' ? 'ads-fit--alto' : it.fit === 'stretch' ? 'ads-fit--stretch' : 'ads-fit--mid'
    const cv = it.cv != null ? `${it.cv} CV` : 'CV n.d.'
    const len = it.length_m != null ? `${it.length_m} m` : ''
    const brand = it.brand ? String(it.brand) : ''
    const floor = it.floor ? String(it.floor) : ''
    const reasons = (it.reasons || []).slice(0, 4).join(' · ')
    const ph = isMotori ? 'MOTORE' : isGommoni ? 'GOMMONE' : 'BARCA'
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

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function render() {
    const items = applyFilter(all)
    listEl.innerHTML = items.map(card).join('')
    emptyEl.hidden = items.length > 0
    // re-trigger reveal
    listEl.querySelectorAll('[data-reveal]').forEach((el, i) => {
      el.style.setProperty('--d', `${Math.min(i, 8) * 40}ms`)
      requestAnimationFrame(() => el.classList.add('is-in'))
    })
  }

  filtersEl?.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filter = btn.getAttribute('data-filter') || 'all'
      filtersEl.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('is-on', b === btn))
      render()
    })
  })

  const base = import.meta.env.BASE_URL || './'
  const feedFile = isMotori ? 'motori.json' : isGommoni ? 'gommoni.json' : 'annunci.json'
  const candidates = [
    `${base}data/${feedFile}`,
    `./data/${feedFile}`,
    `data/${feedFile}`,
    `/Barca/data/${feedFile}`,
  ]

  async function load() {
    let lastErr
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: 'no-cache' })
        if (!res.ok) throw new Error(`${res.status} ${url}`)
        return await res.json()
      } catch (e) {
        lastErr = e
      }
    }
    throw lastErr || new Error('Feed non trovato')
  }

  load()
    .then((data) => {
      all = data.items || []
      updatedEl.textContent = `Aggiornato ${when(data.updated_at)}`
      const s = data.stats || {}
      noteEl.textContent =
        data.filters?.note ||
        (isMotori
          ? 'Motori fuoribordo piccoli. 4 tempi e gambo corto preferiti. Adatti gommoni 3.3-4m e barche no-patente.'
          : isGommoni
            ? 'Gommoni pneumatici (no RIB rigido). Lunghezza ≥3.3m, ≥4 pax, trasportabili auto, pesca. Paiolato alluminio o airdeck preferiti.'
            : 'Filtri automatici: no gommone, prezzo low-budget, preferenza scafo rigido / Lazio.')
      statsEl.hidden = false
      statsEl.innerHTML = `
        <div class="ads-stats__item"><strong>${s.shown ?? all.length}</strong><span>in lista</span></div>
        <div class="ads-stats__item"><strong>${s.lazio_in_shown ?? '—'}</strong><span>Lazio</span></div>
        <div class="ads-stats__item"><strong>${s.scanned_unique ?? '—'}</strong><span>scansionati</span></div>
      `
      filtersEl.hidden = false
      document.getElementById('ads-stamp')?.classList.add('stamp--ok')
      render()
    })
    .catch((e) => {
      updatedEl.textContent = 'Feed non disponibile'
      errEl.hidden = false
      errEl.textContent = `Impossibile caricare gli annunci. (${e.message || e}) Riprova dopo il prossimo aggiornamento automatico.`
    })
}
