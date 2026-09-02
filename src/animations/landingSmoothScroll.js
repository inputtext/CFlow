import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initLandingSmoothScroll() {
  const lenis = new Lenis({
    autoRaf: false,
    anchors: true,
    smoothWheel: true,
  })

  const onScroll = () => ScrollTrigger.update()
  lenis.on('scroll', onScroll)

  const tick = (time) => {
    lenis.raf(time * 1000)
  }

  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  return () => {
    lenis.off('scroll', onScroll)
    gsap.ticker.remove(tick)
    lenis.destroy()
  }
}
