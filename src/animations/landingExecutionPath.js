/*
 * Landing-only execution path.
 * Uses native scroll math so it stays isolated from the landing GSAP timelines.
 */
(() => {
  const init = () => {
    const landing = document.querySelector('.landing')
    if (!landing || landing.dataset.executionPathReady === 'true') return !!landing

    const scenes = [
      '.hero', '#problem', '#engine', '.execution', '.scene--capabilities',
      '#philosophy', '.scene--preview', '#cta', '.landing-footer',
    ].map((selector) => landing.querySelector(selector)).filter(Boolean)

    const heroCode = landing.querySelector('.hero-code')
    if (scenes.length < 2 || !heroCode) return true
    landing.dataset.executionPathReady = 'true'

    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.classList.add('landing-execution-path')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')

    const route = document.createElementNS(ns, 'path')
    route.classList.add('landing-execution-path__route')
    const progress = document.createElementNS(ns, 'path')
    progress.classList.add('landing-execution-path__progress')
    const arrow = document.createElementNS(ns, 'path')
    arrow.classList.add('landing-execution-path__arrow')
    arrow.setAttribute('d', 'M -11 -6 L 0 0 L -11 6')
    const dot = document.createElementNS(ns, 'circle')
    dot.classList.add('landing-execution-path__dot')
    dot.setAttribute('r', '4')

    const nodes = scenes.map(() => {
      const node = document.createElementNS(ns, 'circle')
      node.classList.add('landing-execution-path__node')
      node.setAttribute('r', '3')
      svg.appendChild(node)
      return node
    })
    svg.append(route, progress, arrow, dot)
    landing.appendChild(svg)

    let length = 0
    let points = []
    let rafId = 0

    const buildPath = () => {
      const width = landing.clientWidth
      const height = landing.scrollHeight
      if (!width || !height) return
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
      svg.setAttribute('width', width)
      svg.setAttribute('height', height)

      const heroRect = heroCode.getBoundingClientRect()
      const start = {
        x: heroRect.right - Math.min(28, heroRect.width * .08),
        y: heroRect.top + heroRect.height * .68 + window.scrollY,
      }

      points = [start, ...scenes.slice(1).map((scene, index) => {
        const rect = scene.getBoundingClientRect()
        const y = Math.min(height - 24, Math.max(24, rect.top + window.scrollY + scene.offsetHeight * .5))
        return { x: width * (index % 2 === 0 ? .86 : .14), y }
      })]

      const d = points.map((point, index) => {
        if (!index) return `M ${point.x} ${point.y}`
        const previous = points[index - 1]
        const midY = previous.y + (point.y - previous.y) * .5
        return `C ${previous.x} ${midY}, ${point.x} ${midY}, ${point.x} ${point.y}`
      }).join(' ')

      route.setAttribute('d', d)
      progress.setAttribute('d', d)
      length = route.getTotalLength()
      route.style.strokeDasharray = `${length}`
      progress.style.strokeDasharray = `${length}`
      points.forEach((point, index) => {
        nodes[index].setAttribute('cx', point.x)
        nodes[index].setAttribute('cy', point.y)
      })
      update(window.scrollY)
    }

    const lengthAtY = (targetY) => {
      if (!length) return 0
      const minY = points[0].y
      const maxY = points[points.length - 1].y
      const y = Math.max(minY, Math.min(maxY, targetY))
      let low = 0
      let high = length
      for (let i = 0; i < 14; i += 1) {
        const middle = (low + high) / 2
        if (route.getPointAtLength(middle).y < y) low = middle
        else high = middle
      }
      return (low + high) / 2
    }

    const update = (scrollY) => {
      if (!length || !points.length) return
      const cursorY = Math.max(points[0].y, Math.min(points[points.length - 1].y, scrollY + window.innerHeight * .52))
      const current = lengthAtY(cursorY)

      // The active stroke grows from the main.cpp card as the user scrolls.
      progress.style.strokeDasharray = `${length}`
      progress.style.strokeDashoffset = `${Math.max(0, length - current)}`

      const point = route.getPointAtLength(current)
      const previous = route.getPointAtLength(Math.max(0, current - 12))
      const angle = Math.atan2(point.y - previous.y, point.x - previous.x) * 180 / Math.PI
      arrow.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${angle})`)
      dot.setAttribute('cx', point.x)
      dot.setAttribute('cy', point.y)

      const range = Math.max(1, points[points.length - 1].y - points[0].y)
      nodes.forEach((node, index) => {
        const distance = Math.abs(points[index].y - cursorY) / range
        node.style.opacity = String(distance < .055 ? .95 : distance < .14 ? .4 : .08)
      })
    }

    const onScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => { rafId = 0; update(window.scrollY) })
    }
    const onResize = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => { rafId = 0; buildPath() })
    }

    buildPath()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('orientationchange', onResize, { passive: true })

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      progress.style.strokeDashoffset = '0'
      const end = route.getPointAtLength(length)
      arrow.setAttribute('transform', `translate(${end.x} ${end.y})`)
      dot.setAttribute('cx', end.x)
      dot.setAttribute('cy', end.y)
    }
  }

  const boot = () => {
    if (init()) return
    requestAnimationFrame(boot)
  }
  boot()
})()
