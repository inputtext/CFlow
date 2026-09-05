import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initLandingSmoothScroll() {
  const lenis = new Lenis({
    autoRaf: false,
    anchors: true,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    lerp: 0.075,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.05,
    syncTouch: false,
  })

  // Keep ScrollTrigger on the exact same frame as Lenis so scrubbed scenes,
  // pinned execution and the document position never fight each other.
  const onScroll = () => ScrollTrigger.update()
  lenis.on('scroll', onScroll)

  const tick = (time) => {
    lenis.raf(time * 1000)
  }

  // One animation clock for the entire landing page. This avoids creating a
  // second RAF loop just for scrolling and keeps scroll work synchronized with
  // the GSAP animations already running on the page.
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  return () => {
    lenis.off('scroll', onScroll)
    gsap.ticker.remove(tick)
    lenis.destroy()
  }
}
