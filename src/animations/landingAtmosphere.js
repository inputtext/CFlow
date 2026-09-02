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

    return true
  }

  const boot = () => {
    if (init()) return
    requestAnimationFrame(boot)
  }

  boot()
})()
