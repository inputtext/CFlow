import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

function initCapabilitiesMotion() {
  const stage = document.querySelector('.scene--capabilities')
  if (!stage || stage.querySelector('.capability-trace')) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const list = stage.querySelector('.capability-list')
  const rows = gsap.utils.toArray('.capability', list)
  if (!rows.length) return

  const overlay = document.createElement('div')
  overlay.className = 'capability-trace'
  overlay.innerHTML = `
    <div class="capability-trace__hud">
      <span class="capability-trace__step">STATE 01 / 04</span>
      <b class="capability-trace__type">VARIABLE</b>
      <small class="capability-trace__caption">PROGRAM STATE TRACE</small>
    </div>
    <svg class="capability-trace__svg" viewBox="0 0 900 520" preserveAspectRatio="none" aria-hidden="true">
      <path class="capability-trace__path" d="M40 90 C210 90 210 90 390 170 S650 250 850 250" />
      <path class="capability-trace__path capability-trace__path--branch" d="M390 170 C390 300 560 320 850 340" />
      <path class="capability-trace__path capability-trace__path--loop" d="M850 340 C690 430 490 430 390 170" />
    </svg>
    <div class="capability-trace__packet" />
    <div class="capability-trace__state">x = 10</div>
  `
  stage.appendChild(overlay)

  const packet = overlay.querySelector('.capability-trace__packet')
  const state = overlay.querySelector('.capability-trace__state')
  const step = overlay.querySelector('.capability-trace__step')
  const type = overlay.querySelector('.capability-trace__type')
  const paths = gsap.utils.toArray('.capability-trace__path', overlay)

  if (reduced) {
    rows.forEach((row) => row.classList.add('is-active'))
    return
  }

  const states = [
    ['STATE 01 / 04', 'VARIABLE', 'x = 10'],
    ['STATE 02 / 04', 'BRANCH', 'x > 5 → TRUE'],
    ['STATE 03 / 04', 'ITERATION', '0 → 1 → 2 → 3'],
    ['STATE 04 / 04', 'CALL STACK', 'main() → calculate()']
  ]

  paths.forEach((path) => {
    const length = path.getTotalLength()
    gsap.set(path, { strokeDasharray: length, strokeDashoffset: length })
  })

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: stage,
      start: 'top 68%',
      end: 'bottom 32%',
      scrub: 1,
      onUpdate: (self) => {
        const index = Math.min(states.length - 1, Math.floor(self.progress * states.length))
        const current = states[index]
        step.textContent = current[0]
        type.textContent = current[1]
        state.textContent = current[2]
        rows.forEach((row, rowIndex) => row.classList.toggle('is-active', rowIndex === index))
      }
    }
  })

  paths.forEach((path, index) => {
    tl.to(path, { strokeDashoffset: 0, duration: 1.1, ease: 'none' }, index * 1.05)
  })

  tl.to(packet, { x: 310, y: 70, duration: .8, ease: 'none' }, 0)
    .to(packet, { x: 560, y: 165, duration: .8, ease: 'none' }, .8)
    .to(packet, { x: 760, y: 270, duration: .8, ease: 'none' }, 1.6)
    .to(packet, { x: 470, y: 390, duration: .9, ease: 'none' }, 2.5)
    .to(packet, { x: 700, y: 315, duration: .8, ease: 'none' }, 3.4)

  return () => {
    tl.scrollTrigger?.kill()
    tl.kill()
    overlay.remove()
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCapabilitiesMotion, { once: true })
} else {
  requestAnimationFrame(initCapabilitiesMotion)
}

export default initCapabilitiesMotion
