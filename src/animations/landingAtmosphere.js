/* Optional landing atmosphere. Adds presentation-only details without touching existing section logic. */
(() => {
  const init = () => {
    const landing = document.querySelector('.landing')
    if (!landing || landing.dataset.atmosphereReady === 'true') return !!landing
    landing.dataset.atmosphereReady = 'true'

    const hero = landing.querySelector('.hero')
    if (hero && !hero.querySelector('.landing-greeting')) {
      const greeting = document.createElement('div')
      greeting.className = 'landing-greeting'
      greeting.innerHTML = '<span>HELLO, BUILDER.</span><b>READY TO TRACE?</b>'
      hero.appendChild(greeting)

      const telemetry = document.createElement('div')
      telemetry.className = 'landing-floating-status'
      telemetry.innerHTML = '<span class="landing-floating-status__dot"></span><span>LIVE TRACE</span><b>001</b>'
      hero.appendChild(telemetry)
    }

    const sections = [
      ['problem', 'STATIC SOURCE', '→', 'LIVE EXECUTION', '→', 'VISIBLE STATE'],
      ['scene--capabilities', 'VARIABLES', '→', 'BRANCHES', '→', 'LOOPS', '→', 'FUNCTIONS'],
      ['philosophy', 'READ LESS', '→', 'WATCH MORE', '→', 'UNDERSTAND FLOW'],
    ]

    sections.forEach(([targetClass, ...words]) => {
      const section = landing.querySelector(`.${targetClass}`)
      if (!section || section.nextElementSibling?.classList.contains('landing-marquee--atmosphere')) return
      const marquee = document.createElement('div')
      marquee.className = 'landing-marquee landing-marquee--atmosphere'
      marquee.setAttribute('aria-hidden', 'true')
      const text = words.join(' ')
      marquee.innerHTML = `<div>${text} &nbsp;&nbsp; ${text} &nbsp;&nbsp; ${text} &nbsp;&nbsp;</div>`
      section.insertAdjacentElement('afterend', marquee)
    })

    if (!landing.querySelector('.landing-scanline')) {
      const cursor = document.createElement('div')
      cursor.className = 'landing-scanline'
      cursor.setAttribute('aria-hidden', 'true')
      landing.appendChild(cursor)
    }

    // Presentation-only depth system. It uses the browser's single animation
    // frame pipeline and CSS individual `translate`, so existing GSAP `transform`
    // animations remain untouched.
    if (!landing.querySelector('.landing-depth-bg')) {
      const depthSections = landing.querySelectorAll('.scene, .execution')
      const layers = []

      depthSections.forEach((section, index) => {
        section.classList.add('landing-depth-section')

        if (!section.classList.contains('hero')) {
          const background = document.createElement('div')
          background.className = 'landing-depth-bg'
          background.setAttribute('aria-hidden', 'true')
          section.prepend(background)
          layers.push({ element: background, section, speed: 0.045, range: 42 })
        }

        const middle = document.createElement('div')
        middle.className = 'landing-depth-mid'
        middle.setAttribute('aria-hidden', 'true')
        middle.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><b>DEPTH / ${section.classList.contains('execution') ? 'EXECUTION' : 'FLOW'}</b>`
        section.appendChild(middle)
        layers.push({ element: middle, section, speed: 0.085, range: 68 })

        const foregroundTargets = section.querySelectorAll('.display, .hero-code, .engine-flow, .execution__stage, .capability-list, .problem-visual, .philosophy-line, .preview-window, .cta .primary-button')
        foregroundTargets.forEach((element) => {
          if (element === middle || element.classList.contains('landing-depth-bg')) return
          element.classList.add('landing-depth-foreground')
          layers.push({ element, section, speed: 0.018, range: 18 })
        })
      })

      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
      let rafId = 0
      let active = true

      const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

      const render = () => {
        rafId = 0
        if (!active || reducedMotion.matches) return

        const viewportCenter = window.innerHeight * 0.5
        layers.forEach(({ element, section, speed, range }) => {
          const rect = section.getBoundingClientRect()
          const sectionCenter = rect.top + rect.height * 0.5
          const distance = viewportCenter - sectionCenter
          const offset = clamp(distance * speed, -range, range)
          element.style.translate = `0 ${offset.toFixed(2)}px`
        })
      }

      const requestRender = () => {
        if (!rafId && active) rafId = requestAnimationFrame(render)
      }

      const onScroll = requestRender
      const onResize = requestRender
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onResize, { passive: true })
      reducedMotion.addEventListener?.('change', requestRender)
      requestRender()

      landing._depthCleanup = () => {
        active = false
        if (rafId) cancelAnimationFrame(rafId)
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onResize)
        reducedMotion.removeEventListener?.('change', requestRender)
        layers.forEach(({ element }) => {
          element.style.translate = ''
        })
      }
    }

    return true
  }

  const boot = () => {
    if (init()) return
    requestAnimationFrame(boot)
  }

  boot()
})()
