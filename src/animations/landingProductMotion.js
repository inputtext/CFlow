import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const STATES = [
  { step: '01', line: 1, memory: 'x = 10', output: '—' },
  { step: '02', line: 2, memory: 'x = 10 · y = 20', output: '—' },
  { step: '03', line: 3, memory: 'x = 10 · y = 20 · sum = 30', output: '—' },
  { step: '04', line: 4, memory: 'sum = 30', output: '30' },
]

function initPreview() {
  if (window.location.pathname !== '/') return () => {}
  const preview = document.querySelector('.preview-window')
  if (!preview || preview.dataset.motionReady === 'true') return () => {}
  preview.dataset.motionReady = 'true'

  const code = preview.querySelector('.preview-code')
  const nodes = [...preview.querySelectorAll('.preview-flow__node')]
  const metrics = [...preview.querySelectorAll('.preview-metrics b')]
  const top = preview.querySelector('.preview-window__top')
  if (!code || !nodes.length) return () => {}

  const overlay = document.createElement('div')
  overlay.className = 'preview-live-overlay'
  overlay.innerHTML = `
    <svg class="preview-live-path" viewBox="0 0 520 220" preserveAspectRatio="none" aria-hidden="true">
      <path class="preview-live-path__base" d="M38 35 C170 35 170 185 260 185 S350 35 482 35" />
      <path class="preview-live-path__active" d="M38 35 C170 35 170 185 260 185 S350 35 482 35" />
      <circle class="preview-live-path__packet" cx="38" cy="35" r="6" />
    </svg>
    <div class="preview-live-label">LIVE TRACE / DOMINANT PATH</div>
  `
  preview.appendChild(overlay)

  const replay = document.createElement('button')
  replay.type = 'button'
  replay.className = 'preview-replay'
  replay.textContent = 'REPLAY TRACE ↻'
  replay.setAttribute('aria-label', 'Replay CFlow execution trace')
  top?.appendChild(replay)

  const lineRows = [...code.querySelectorAll('br')]
  let stateIndex = 0
  let timer = 0

  const renderState = (index) => {
    const state = STATES[index]
    stateIndex = index
    code.classList.remove('is-executing')
    void code.offsetWidth
    code.classList.add('is-executing')

    const textNodes = [...code.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE)
    textNodes.forEach((node) => node.parentElement?.classList.remove('preview-code__active'))

    nodes.forEach((node, nodeIndex) => node.classList.toggle('is-active', nodeIndex === Math.min(index, nodes.length - 1)))
    if (metrics[0]) metrics[0].textContent = `${state.step} STEPS`
    if (metrics[1]) metrics[1].textContent = state.memory
    if (metrics[2]) metrics[2].textContent = state.output
    preview.style.setProperty('--preview-progress', `${(index + 1) / STATES.length}`)

    gsap.fromTo(nodes[Math.min(index, nodes.length - 1)], { y: 5, scale: .92 }, { y: 0, scale: 1.04, duration: .28, ease: 'back.out(2)' })
    gsap.to('.preview-live-path__packet', { attr: { cx: index < 2 ? 260 : 482, cy: index < 2 ? 185 : 35 }, duration: .7, ease: 'power2.inOut' })
  }

  const play = () => {
    window.clearInterval(timer)
    stateIndex = 0
    renderState(0)
    timer = window.setInterval(() => {
      stateIndex = (stateIndex + 1) % STATES.length
      renderState(stateIndex)
    }, 1250)
  }

  replay.addEventListener('click', play)
  play()

  const onMove = (event) => {
    const rect = preview.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - .5
    const y = (event.clientY - rect.top) / rect.height - .5
    gsap.to(preview, { rotateX: y * -2.2, rotateY: x * 2.8, transformPerspective: 1100, duration: .45, ease: 'power3.out', overwrite: true })
  }
  const onLeave = () => gsap.to(preview, { rotateX: 0, rotateY: 0, duration: .65, ease: 'power3.out', overwrite: true })
  preview.addEventListener('pointermove', onMove)
  preview.addEventListener('pointerleave', onLeave)

  const reveal = gsap.fromTo(overlay, { opacity: 0, scale: .96 }, { opacity: 1, scale: 1, duration: .7, paused: true, ease: 'power3.out' })
  const trigger = ScrollTrigger.create({
    trigger: preview,
    start: 'top 75%',
    onEnter: () => reveal.play(),
    onEnterBack: () => reveal.play(),
  })

  return () => {
    window.clearInterval(timer)
    replay.removeEventListener('click', play)
    preview.removeEventListener('pointermove', onMove)
    preview.removeEventListener('pointerleave', onLeave)
    trigger.kill()
    reveal.kill()
    overlay.remove()
    replay.remove()
    preview.removeAttribute('data-motion-ready')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPreview, { once: true })
} else {
  window.setTimeout(initPreview, 0)
}
