const icons = {
  home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"/></svg>`,
  ads: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16v12H4z"/><path d="M8 10h8M8 14h5"/></svg>`,
  rules: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 4h10v16l-5-3-5 3V4z"/></svg>`,
  more: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="18" cy="12" r="1.5" fill="currentColor"/></svg>`,
}

export function mountNav() {
  if (document.querySelector('.dock')) return

  const dock = document.createElement('nav')
  dock.className = 'dock'
  dock.setAttribute('aria-label', 'Navigazione principale')
  dock.innerHTML = `
    <a href="./index.html" data-nav>${icons.home}<span>Home</span></a>
    <a href="./annunci.html" data-nav>${icons.ads}<span>Annunci</span></a>
    <a href="./regole.html" data-nav>${icons.rules}<span>Regole</span></a>
    <a href="#" data-open-sheet data-nav>${icons.more}<span>Altro</span></a>
  `

  const sheet = document.createElement('div')
  sheet.className = 'dock-sheet'
  sheet.innerHTML = `
    <div class="dock-sheet__bg"></div>
    <div class="dock-sheet__panel" role="dialog" aria-label="Menu pagine">
      <div class="dock-sheet__handle"></div>
      <div class="dock-sheet__grid">
        <a href="./annunci.html"><strong>Annunci</strong><span>Rigide · Gommoni · Motori</span></a>
        <a href="./annunci.html?cat=gommoni"><strong>Gommoni</strong><span>Feed pneumatici</span></a>
        <a href="./annunci.html?cat=motori"><strong>Motori</strong><span>Fuoribordo</span></a>
        <a href="./equipaggio.html"><strong>Equipaggio</strong><span>Le tre bestie</span></a>
        <a href="./priorita.html"><strong>Priorità</strong><span>Pesca prima di tutto</span></a>
        <a href="./base.html"><strong>Base</strong><span>Lazio · rimessaggio</span></a>
        <a href="./mercato.html"><strong>Mercato</strong><span>Cosa c’è sotto 4,5k</span></a>
        <a href="./status.html"><strong>Status</strong><span>Punto della situazione</span></a>
        <a href="./mosse.html"><strong>Mosse</strong><span>Cosa facciamo ora</span></a>
        <a href="./regole.html"><strong>Regole</strong><span>Go / no-go</span></a>
      </div>
    </div>
  `

  document.body.append(dock, sheet)
}
