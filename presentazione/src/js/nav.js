const icons = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/></svg>`,
  ads: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5"/></svg>`,
  rules: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4h10v16l-5-3-5 3V4z"/></svg>`,
  more: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="18" cy="12" r="1.5" fill="currentColor"/></svg>`,
}

export const ADS_PAGES = ['annunci.html', 'accessori.html', 'gommoni.html', 'motori.html', 'vele.html']
export const DOCK_PAGES = ['index.html', 'regole.html', ...ADS_PAGES]

export function mountNav() {
  if (document.querySelector('.dock')) return

  const dock = document.createElement('nav')
  dock.className = 'dock'
  dock.setAttribute('aria-label', 'Navigazione principale')
  dock.innerHTML = `
    <a href="./index.html" data-nav>${icons.home}<span>Home</span></a>
    <a href="./annunci.html" data-nav data-nav-ads>${icons.ads}<span>Annunci</span></a>
    <a href="./regole.html" data-nav>${icons.rules}<span>Regole</span></a>
    <button type="button" class="dock-more-btn" data-open-sheet data-nav aria-expanded="false" aria-controls="dock-sheet">
      ${icons.more}<span>Altro</span>
    </button>
  `

  const sheet = document.createElement('div')
  sheet.className = 'dock-sheet'
  sheet.id = 'dock-sheet'
  sheet.innerHTML = `
    <div class="dock-sheet__bg"></div>
    <div class="dock-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="dock-sheet-title">
      <div class="dock-sheet__handle"></div>
      <h2 class="dock-sheet__title" id="dock-sheet-title">Altre pagine</h2>
      <p class="dock-sheet__label">Caccia</p>
      <div class="dock-sheet__grid">
        <a href="./annunci.html?cat=gommoni"><strong>Gommoni</strong><span>Pneumatici piano A</span></a>
        <a href="./annunci.html?cat=motori"><strong>Motori</strong><span>Fuoribordo no-patente</span></a>
        <a href="./annunci.html?cat=rigide"><strong>Rigide</strong><span>Piano B condizionale</span></a>
        <a href="./annunci.html?cat=vele"><strong>Vele</strong><span>Sogno Comet 770</span></a>
        <a href="./accessori.html"><strong>Accessori</strong><span>Pesca, bimini, sicurezza</span></a>
      </div>
      <p class="dock-sheet__label">Manifesto</p>
      <div class="dock-sheet__grid">
        <a href="./status.html"><strong>Status</strong><span>Punto della situazione</span></a>
        <a href="./equipaggio.html"><strong>Equipaggio</strong><span>Le tre bestie</span></a>
        <a href="./priorita.html"><strong>Priorità</strong><span>Pesca prima di tutto</span></a>
        <a href="./base.html"><strong>Base</strong><span>Trasporto e casa</span></a>
        <a href="./mercato.html"><strong>Mercato</strong><span>Cosa si trova sotto 2k</span></a>
        <a href="./mosse.html"><strong>Mosse</strong><span>Cosa facciamo ora</span></a>
        <a href="./documenti.html"><strong>Documenti</strong><span>Patto, costi, punti di lancio</span></a>
        <a href="./simulazioni.html"><strong>Simulazioni</strong><span>Nodi e scuola di coperta</span></a>
      </div>
    </div>
  `

  document.body.append(dock, sheet)
}
