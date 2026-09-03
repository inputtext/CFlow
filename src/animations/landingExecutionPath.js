import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

(() => {
  const init = () => {
    const landing = document.querySelector('.landing')
    if (!landing || landing.dataset.executionPathReady === 'true') return !!landing

    landing.dataset.executionPathReady = 'true'

    const scenes = [
      '.hero',
      '#problem',
      '#engine',
      '.execution',
      '.scene--capabilities',
      '#philosophy',
      '.scene--preview',
      '#cta',
      '.landing-footer',
    ]
      .map((selector) => landing.querySelector(selector))
      .filter(Boolean)

    if (scenes.length < 2) return true

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.classList.add('landing-execution-path')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.classList.add('landing-execution-path__route')

    const progress = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    progress.classList.add('landing-execution-path__progress')

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dot.classList.add('landing-execution-path__dot')
    dot.setAttribute('r', '5')

    const nodes = scenes.map(() => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      node.classList.add('landing-execution-path__node')
      node.setAttribute('r', '3')
      svg.appendChild(node)
      return node
    })

    svg.append(path, progress, dot)
    landing.appendChild(svg)

    const buildPath = () => {
      const width = landing.clientWidth
      const height = landing.scrollHeight
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.setAttribute('width', width)
      svg.setAttribute('height', height)

      const points = scenes.map((scene, index) => {
        const sceneTop = scene.getBoundingClientRect().top + window.scrollY
        const sceneHeight = scene.offsetHeight
        const y = Math.min(height - 24, Math.max(24, sceneTop + sceneHeight * (index === 0 ? 0.7 : 0.5)))
        const side = index % 2 === 0 ? 0.88 : 0.12
        const x = width * side
        return { x, y }
      })

      const d = points.map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`
        const previous = points[index - 1]
        const midY = previous.y + (point.y - previous.y) * 0.5
        return `C ${previous.x} ${midY}, ${point.x} ${midY}, ${point.x} ${point.y}`
      }).join(' ')

      path.setAttribute('d', d)
      progress.setAttribute('d', d)
      const length = path.getTotalLength()
      path.style.strokeDasharray = `${length}`
      progress.style.strokeDasharray = `${length}`
      progress.style.strokeDashoffset = `${length}`

      points.forEach((point, index) => {
        nodes[index].setAttribute('cx', point.x)
        nodes[index].setAttribute('cy', point.y)
      })

      dot.dataset.length = String(length)
    }

    const placeDot = (value) => {
      const length = Number(dot.dataset.length || 0)
      if (!length) return
      const point = path.getPointAtLength(length * value)
      dot.setAttribute('cx', point.x)
      dot.setAttribute('cy', point.y)
    }

    buildPath()
    placeDot(0)

    const refresh = () => {
      buildPath()
      ScrollTrigger.refresh()
      const progressValue = ScrollTrigger.maxScroll(window) > 0
        ? window.scrollY / ScrollTrigger.maxScroll(window)
        : 0
      placeDot(progressValue)
    }

    const draw = gsap.to(progress, {
      strokeDashoffset: 0,
      ease: 'none',
      paused: true,
      duration: 1,
    })

    const trigger = ScrollTrigger.create({
      trigger: landing,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        draw.progress(self.progress)
        placeDot(self.progress)
      },
    })

    const onResize = () => {
      buildPath()
      ScrollTrigger.refresh()
    }

    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('orientationchange', refresh, { passive: true })

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      draw.progress(1)
      placeDot(1)
    }

    const cleanup = () => {
      trigger.kill()
      draw.kill()
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', refresh)
      svg.remove()
      delete landing.dataset.executionPathReady
    }

    landing.addEventListener('landing-execution-path:cleanup', cleanup, { once: true })
    return true
  }

  const boot = () => {
    if (init()) return
    requestAnimationFrame(boot)
  }

  boot()
})()
