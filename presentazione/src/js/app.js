import { mountNav } from './nav.js'
import './sbarco.js'
import '../styles/sbarco.css'

/* Forza viewport mobile se il browser “pensa” di essere desktop */
;(function fixViewport() {
  const w = Math.min(screen.width || 0, window.innerWidth || 0) || window.innerWidth
  const meta = document.querySelector('meta[name="viewport"]')
  if (!meta) return
  // Se il layout è più largo dello schermo fisico, riallinea
  const layoutW = document.documentElement.clientWidth
  if (screen.width && layoutW > screen.width + 40) {
    meta.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
    )
    // trigger reflow
    document.documentElement.style.width = '100%'
  } else {
    meta.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover')
  }
  document.documentElement.classList.add(window.matchMedia('(pointer: coarse)').matches || w < 700 ? 'is-touch' : 'is-desk')
})()

mountNav()

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* splash */
const splash = document.querySelector('.splash')
if (splash) {
  const hide = () => splash.classList.add('is-out')
  if (reduced) hide()
  else window.setTimeout(hide, 900)
  splash.addEventListener('click', hide)
}

/* active dock */
const path = (location.pathname.split('/').pop() || 'index.html').replace(/^\//, '')
const file = !path || path === '/' ? 'index.html' : path
document.querySelectorAll('.dock > a[href]').forEach((el) => {
  const href = el.getAttribute('href') || ''
  if (href === '#' || el.hasAttribute('data-open-sheet')) return
  const target = href.split('/').pop()
  if (target === file) el.classList.add('is-active')
})

/* more sheet */
const sheet = document.querySelector('.dock-sheet')
document.querySelectorAll('[data-open-sheet]').forEach((b) =>
  b.addEventListener('click', (e) => {
    e.preventDefault()
    sheet?.classList.add('is-open')
  }),
)
sheet?.querySelector('.dock-sheet__bg')?.addEventListener('click', () => sheet.classList.remove('is-open'))
sheet?.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => sheet.classList.remove('is-open')),
)

/* reveal */
const revealEls = document.querySelectorAll('[data-reveal]')
if (reduced) {
  revealEls.forEach((el) => el.classList.add('is-in'))
} else if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in')
          io.unobserve(en.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  )
  revealEls.forEach((el, i) => {
    if (!el.style.getPropertyValue('--d')) {
      el.style.setProperty('--d', `${Math.min(i % 6, 5) * 60}ms`)
    }
    io.observe(el)
  })
} else {
  revealEls.forEach((el) => el.classList.add('is-in'))
}

/* counters */
function animateCount(el) {
  const target = parseFloat(el.dataset.count)
  if (Number.isNaN(target)) return
  const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals, 10) : 0
  const prefix = el.dataset.prefix || ''
  const suffix = el.dataset.suffix || ''
  const duration = 1200
  const start = performance.now()
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    el.textContent = prefix + (target * eased).toFixed(decimals) + suffix
    if (t < 1) requestAnimationFrame(tick)
    else el.textContent = prefix + target.toFixed(decimals) + suffix
  }
  if (reduced) el.textContent = prefix + target.toFixed(decimals) + suffix
  else requestAnimationFrame(tick)
}

const countIo = new IntersectionObserver(
  (entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        animateCount(en.target)
        countIo.unobserve(en.target)
      }
    })
  },
  { threshold: 0.4 },
)
document.querySelectorAll('[data-count]').forEach((el) => countIo.observe(el))

/* bars */
const barIo = new IntersectionObserver(
  (entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.style.width = en.target.dataset.width || '0%'
        barIo.unobserve(en.target)
      }
    })
  },
  { threshold: 0.3 },
)
document.querySelectorAll('.bar-fill').forEach((el) => barIo.observe(el))

/* tilt */
if (!reduced && window.matchMedia('(pointer:fine)').matches) {
  document.querySelectorAll('[data-tilt]').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      card.style.transform = `perspective(700px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`
    })
    card.addEventListener('pointerleave', () => {
      card.style.transform = ''
    })
  })
}

document.querySelector('.page')?.classList.add('page-enter')
