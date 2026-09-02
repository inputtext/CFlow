import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const init = () => {
  const philosophy = document.querySelector('.philosophy')
  const preview = document.querySelector('.scene--preview')
  const cta = document.querySelector('.cta')
  if (!philosophy || !preview || !cta) return
  if (document.querySelector('.closing-trace')) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const wrap = document.createElement('div')
  wrap.className = 'closing-trace'
  wrap.innerHTML = '<span>SCROLL / EXECUTION CONTINUES</span><i></i><b></b>'
  preview.appendChild(wrap)

  const ctx = gsap.context(() => {
    if (reduced) return

    gsap.timeline({
      scrollTrigger: { trigger: philosophy, start: 'top 75%', end: 'bottom 25%', scrub: 1 }
    })
      .from('.philosophy .display', { y: 110, opacity: 0, scale: .94, duration: 1 })
      .from('.philosophy-line', { x: 80, opacity: 0, duration: .6 }, .35)

    gsap.timeline({
      scrollTrigger: { trigger: preview, start: 'top 75%', end: 'bottom 25%', scrub: 1 }
    })
      .from('.scene--preview .preview-copy', { x: -80, opacity: 0, duration: .8 })
      .from('.preview-window', { x: 100, rotateY: -12, rotateZ: 2, opacity: 0, duration: 1 }, .05)
      .to('.preview-window', { rotateY: 0, rotateZ: 0, duration: 1 }, .8)
      .from('.preview-flow__connector', { scaleY: 0, transformOrigin: 'top', stagger: .15, duration: .35 }, .55)

    gsap.timeline({
      scrollTrigger: { trigger: cta, start: 'top 78%', end: 'bottom 40%', scrub: 1 }
    })
      .from('.cta .display', { y: 130, opacity: 0, duration: 1 })
      .from('.cta .cta-button', { y: 35, scale: .86, opacity: 0, duration: .6 }, .5)
      .from('.cta__microcopy', { opacity: 0, y: 15, duration: .4 }, .65)

    gsap.to('.closing-trace b', {
      x: 280,
      repeat: -1,
      duration: 2.2,
      ease: 'none'
    })
  }, document.body)

  return () => { ctx.revert(); wrap.remove() }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true })
else requestAnimationFrame(init)

export default init
