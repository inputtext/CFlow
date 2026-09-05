import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const STATES = [
  { line: '02', label: 'DECLARE', code: 'int x = 10;', memory: 'x = 10', accent: 'VARIABLE CREATED' },
  { line: '03', label: 'DECLARE', code: 'int y = 20;', memory: 'y = 20', accent: 'VARIABLE CREATED' },
  { line: '04', label: 'RETURN', code: 'return x + y;', memory: 'x + y = 30', accent: 'VALUE RESOLVED' },
]

const ns = 'http://www.w3.org/2000/svg'

function svgElement(tag, attrs = {}) {
  const node = document.createElementNS(ns, tag)
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value))
  return node
}

function initPreviewUpgrade() {
  const windowEl = document.querySelector('.preview-window')
  if (!windowEl || windowEl.querySelector('.preview-upgrade')) return

  const upgrade = document.createElement('div')
  upgrade.className = 'preview-upgrade'
  upgrade.innerHTML = `
    <div class="preview-upgrade__hud">
      <span>LIVE EXECUTION</span>
      <b class="preview-upgrade__step">STEP 01 / 04</b>
    </div>
    <div class="preview-upgrade__state">
      <small>ACTIVE STATE</small>
      <strong class="preview-upgrade__state-value">x = 10</strong>
      <span class="preview-upgrade__state-label">VARIABLE CREATED</span>
    </div>
    <div class="preview-upgrade__memory">
      <small>MEMORY</small>
      <div class="preview-upgrade__memory-row"><span>STACK</span><b class="preview-upgrade__memory-value">x → 10</b></div>
      <div class="preview-upgrade__memory-row"><span>STACK</span><b>y → 20</b></div>
      <div class="preview-upgrade__memory-row"><span>RESULT</span><b class="preview-upgrade__memory-result">—</b></div>
    </div>
    <div class="preview-upgrade__trace-label">TRACE / PROGRAM STATE</div>
    <div class="preview-upgrade__packet">10</div>
  `

  const trace = svgElement('svg', {
    class: 'preview-upgrade__trace',
    viewBox: '0 0 700 420',
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
  })

  const paths = [
    ['M 86 86 C 190 86 300 145 540 150', 'trace-x'],
    ['M 86 150 C 210 150 340 175 540 150', 'trace-y'],
    ['M 86 214 C 220 214 350 165 540 150', 'trace-result'],
    ['M 540 150 C 560 220 575 275 540 335', 'trace-output'],
  ]

  paths.forEach(([d, className]) => {
    const base = svgElement('path', { d, class: `preview-upgrade__path ${className} is-base` })
    const active = svgElement('path', { d, class: `preview-upgrade__path ${className} is-active` })
    trace.append(base, active)
  })

  upgrade.prepend(trace)
  windowEl.appendChild(upgrade)

  const ctx = gsap.context(() => {
    const activePaths = gsap.utils.toArray('.preview-upgrade__path.is-active')
    const packet = document.querySelector('.preview-upgrade__packet')
    const step = document.querySelector('.preview-upgrade__step')
    const stateValue = document.querySelector('.preview-upgrade__state-value')
    const stateLabel = document.querySelector('.preview-upgrade__state-label')
    const memoryValue = document.querySelector('.preview-upgrade__memory-value')
    const memoryResult = document.querySelector('.preview-upgrade__memory-result')

    activePaths.forEach((path) => {
      const length = path.getTotalLength()
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
    })

    gsap.set(upgrade, { opacity: 0, y: 28 })
    gsap.set(packet, { opacity: 0, scale: .6 })

    const reveal = gsap.timeline({
      scrollTrigger: {
        trigger: windowEl,
        start: 'top 76%',
        end: 'top 35%',
        scrub: 1,
      },
    })

    reveal.to(upgrade, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' })

    const trace = gsap.timeline({
      scrollTrigger: {
        trigger: windowEl,
        start: 'top top',
        end: '+=1500',
        scrub: 1,
        invalidateOnRefresh: true,
      },
    })

    const activate = (index, at) => {
      const state = STATES[index]
      const path = activePaths[index]
      if (!state || !path) return
      trace.to(step, { textContent: `STEP 0${index + 1} / 04`, duration: .01 }, at)
        .to(stateValue, { textContent: state.memory, duration: .08 }, at)
        .to(stateLabel, { textContent: state.accent, duration: .08 }, at)
        .to(path, { strokeDashoffset: 0, duration: .75, ease: 'power2.inOut' }, at + .05)
    }

    activate(0, 0)
    activate(1, .95)
    activate(2, 1.9)

    trace.to(memoryValue, { textContent: 'x → 10 · y → 20', duration: .08 }, 2.35)
      .to(memoryResult, { textContent: '30', duration: .08 }, 2.55)
      .to(packet, { opacity: 1, scale: 1, duration: .15 }, 2.65)
      .to(packet, { x: 90, y: 85, duration: .65, ease: 'power2.inOut' }, 2.8)
      .to(step, { textContent: 'STEP 04 / 04', duration: .01 }, 3.25)
      .to(stateValue, { textContent: 'RETURN 30', duration: .08 }, 3.25)
      .to(stateLabel, { textContent: 'OUTPUT EMITTED', duration: .08 }, 3.25)

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      reveal.progress(1)
      trace.progress(1)
      gsap.set(activePaths, { strokeDashoffset: 0 })
      gsap.set(packet, { opacity: 1, scale: 1 })
    }

    ScrollTrigger.refresh()
  }, windowEl)

  return () => {
    ctx.revert()
    upgrade.remove()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPreviewUpgrade, { once: true })
} else {
  window.setTimeout(initPreviewUpgrade, 0)
}
