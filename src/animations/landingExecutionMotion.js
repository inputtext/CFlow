import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const steps = [
  { id: '01', label: 'DECLARE X', value: 'x = 10' },
  { id: '02', label: 'DECLARE Y', value: 'y = 20' },
  { id: '03', label: 'COMPUTE SUM', value: '10 + 20 → 30' },
  { id: '04', label: 'EMIT OUTPUT', value: '30' },
]

function makeSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('exec-fx__svg')
  svg.setAttribute('viewBox', '0 0 1000 520')
  svg.setAttribute('preserveAspectRatio', 'none')
  svg.setAttribute('aria-hidden', 'true')

  const paths = [
    ['M 185 116 C 360 116 470 150 770 255', 'exec-fx__path exec-fx__path--x'],
    ['M 185 188 C 370 188 480 190 770 255', 'exec-fx__path exec-fx__path--y'],
    ['M 185 260 C 390 260 520 300 770 255', 'exec-fx__path exec-fx__path--sum'],
    ['M 770 255 C 810 300 820 365 770 410', 'exec-fx__path exec-fx__path--output'],
  ]

  paths.forEach(([d, className]) => {
    const base = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    base.setAttribute('d', d)
    base.setAttribute('class', `${className} is-base`)
    const active = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    active.setAttribute('d', d)
    active.setAttribute('class', `${className} is-active`)
    svg.append(base, active)
  })

  return svg
}

function initExecutionMotion() {
  const stage = document.querySelector('.execution__stage')
  if (!stage || stage.querySelector('.exec-fx')) return

  const fx = document.createElement('div')
  fx.className = 'exec-fx'
  fx.innerHTML = `
    <div class="exec-fx__hud">
      <span class="exec-fx__step">STEP 01 / 04</span>
      <span class="exec-fx__mode">LIVE STATE TRACE</span>
    </div>
    <div class="exec-fx__chip exec-fx__chip--x">x = 10</div>
    <div class="exec-fx__chip exec-fx__chip--y">y = 20</div>
    <div class="exec-fx__chip exec-fx__chip--sum">10 + 20</div>
    <div class="exec-fx__chip exec-fx__chip--result">30</div>
    <div class="exec-fx__pulse"></div>
    <div class="exec-fx__caption">SOURCE → MEMORY → COMPUTE → OUTPUT</div>
  `
  fx.prepend(makeSvg())
  stage.appendChild(fx)

  const ctx = gsap.context(() => {
    const chips = gsap.utils.toArray('.exec-fx__chip')
    const activePaths = gsap.utils.toArray('.exec-fx__path.is-active')
    const basePaths = gsap.utils.toArray('.exec-fx__path.is-base')
    const pulse = document.querySelector('.exec-fx__pulse')
    const hudStep = document.querySelector('.exec-fx__step')
    const memoryCards = gsap.utils.toArray('.memory-card')
    const result = document.querySelector('.exec-result')

    basePaths.forEach((path) => {
      const length = path.getTotalLength()
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: 0 })
    })
    activePaths.forEach((path) => {
      const length = path.getTotalLength()
      gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
    })

    gsap.set(chips, { opacity: 0, scale: .72 })
    gsap.set(pulse, { opacity: 0, scale: .2 })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: '+=2400',
        scrub: 1,
        invalidateOnRefresh: true,
      },
    })

    const activate = (index, at) => {
      const chip = chips[index]
      const path = activePaths[index]
      const card = memoryCards[index]
      const step = steps[index]
      if (!chip || !path) return

      tl.to(hudStep, { textContent: `STEP ${step.id} / 04`, duration: .01 }, at)
      tl.to(chip, { opacity: 1, scale: 1, duration: .18, ease: 'back.out(2)' }, at)
      tl.to(path, { strokeDashoffset: 0, duration: .6, ease: 'power2.inOut' }, at + .05)
      if (card) tl.to(card, { boxShadow: '0 0 0 3px #b9d7ff, 6px 6px 0 #fff9f0', duration: .2 }, at + .38)
      if (index < 3) tl.to(chip, { opacity: .32, duration: .18 }, at + .72)
    }

    activate(0, 0)
    activate(1, .9)
    activate(2, 1.8)

    tl.to(chips[2], { scale: 1.08, backgroundColor: '#ffe3a3', duration: .25 }, 2.45)
      .to(pulse, { opacity: 1, scale: 1, duration: .2 }, 2.55)
      .to(pulse, { x: 150, y: 150, duration: .55, ease: 'power2.inOut' }, 2.7)
      .to(chips[3], { opacity: 1, scale: 1, duration: .3, ease: 'back.out(2)' }, 3.05)
      .to(hudStep, { textContent: 'STEP 04 / 04', duration: .01 }, 3.05)
      .to(result, { boxShadow: '0 0 0 3px #b9d7ff, 8px 8px 0 #fff9f0', duration: .25 }, 3.12)
      .to('.exec-fx__caption', { opacity: 1, duration: .2 }, 3.2)

    ScrollTrigger.refresh()

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) {
      tl.scrollTrigger?.disable()
      gsap.set(chips, { opacity: 1, scale: 1 })
      gsap.set(activePaths, { strokeDashoffset: 0 })
      gsap.set(pulse, { opacity: 1, scale: 1 })
    }
  }, stage)

  return () => {
    ctx.revert()
    fx.remove()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExecutionMotion, { once: true })
} else {
  window.setTimeout(initExecutionMotion, 0)
}
