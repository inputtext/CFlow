/* Isolated landing-page micro playground. It never touches the real CFlow workspace. */
(() => {
  const init = () => {
    const landing = document.querySelector('.landing')
    const actions = landing?.querySelector('.hero__actions')
    if (!landing || !actions || landing.dataset.miniPlaygroundReady === 'true') return !!actions
    landing.dataset.miniPlaygroundReady = 'true'

    const trigger = document.createElement('button')
    trigger.type = 'button'
    trigger.className = 'landing-mini-playground__trigger'
    trigger.textContent = 'TRY A TINY FLOW →'
    actions.appendChild(trigger)

    const overlay = document.createElement('div')
    overlay.className = 'landing-mini-playground'
    overlay.setAttribute('aria-hidden', 'true')
    overlay.innerHTML = `
      <div class="landing-mini-playground__panel" role="dialog" aria-modal="true" aria-label="CFlow mini playground">
        <div class="landing-mini-playground__top">
          <span>C·FLOW / MINI PLAYGROUND</span>
          <button type="button" class="landing-mini-playground__close">ESC / CLOSE</button>
        </div>
        <div class="landing-mini-playground__grid">
          <div class="landing-mini-playground__editor" aria-label="Mini playground code editor">
            <div class="landing-mini-playground__line"><i>01</i><code contenteditable="true" spellcheck="false">int x = 10;</code></div>
            <div class="landing-mini-playground__line"><i>02</i><code contenteditable="true" spellcheck="false">int y = 20;</code></div>
            <div class="landing-mini-playground__line"><i>03</i><code contenteditable="true" spellcheck="false">int sum = x + y;</code></div>
          </div>
          <div class="landing-mini-playground__side">
            <button type="button" class="landing-mini-playground__run">RUN FLOW →</button>
            <div class="landing-mini-playground__state">
              <div class="landing-mini-playground__label">MEMORY / LIVE STATE</div>
              <div class="landing-mini-playground__values">
                <div class="landing-mini-playground__value">x<b>10</b></div>
                <div class="landing-mini-playground__value">y<b>20</b></div>
                <div class="landing-mini-playground__value">sum<b>30</b></div>
              </div>
            </div>
            <div class="landing-mini-playground__output">OUTPUT <b>30</b></div>
            <div class="landing-mini-playground__trace">
              <span class="is-active">01 / DECLARE x = 10</span>
              <span>02 / DECLARE y = 20</span>
              <span>03 / CALCULATE sum</span>
              <span>04 / RETURN 30</span>
            </div>
          </div>
        </div>
      </div>`
    landing.appendChild(overlay)

    const lines = [...overlay.querySelectorAll('.landing-mini-playground__editor code')]
    const values = [...overlay.querySelectorAll('.landing-mini-playground__value b')]
    const output = overlay.querySelector('.landing-mini-playground__output b')
    const trace = [...overlay.querySelectorAll('.landing-mini-playground__trace span')]
    const run = overlay.querySelector('.landing-mini-playground__run')
    const close = overlay.querySelector('.landing-mini-playground__close')

    const readValue = (text, name, fallback) => {
      const match = text.match(new RegExp(`int\\s+${name}\\s*=\\s*(-?\\d+)`))
      return match ? Number(match[1]) : fallback
    }

    const execute = () => {
      const x = readValue(lines[0].textContent, 'x', 10)
      const y = readValue(lines[1].textContent, 'y', 20)
      const sum = x + y
      values[0].textContent = String(x)
      values[1].textContent = String(y)
      values[2].textContent = String(sum)
      output.textContent = String(sum)
      trace.forEach((item, index) => item.classList.toggle('is-active', index === 3))
      trace[0].textContent = `01 / DECLARE x = ${x}`
      trace[1].textContent = `02 / DECLARE y = ${y}`
      trace[2].textContent = `03 / CALCULATE sum = ${sum}`
      trace[3].textContent = `04 / RETURN ${sum}`
    }

    const open = () => {
      overlay.classList.add('is-open')
      overlay.setAttribute('aria-hidden', 'false')
      close.focus()
    }
    const dismiss = () => {
      overlay.classList.remove('is-open')
      overlay.setAttribute('aria-hidden', 'true')
      trigger.focus()
    }

    trigger.addEventListener('click', open)
    close.addEventListener('click', dismiss)
    run.addEventListener('click', execute)
    overlay.addEventListener('click', (event) => { if (event.target === overlay) dismiss() })
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && overlay.classList.contains('is-open')) dismiss() })
    lines.forEach((line) => line.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') execute() }))

    return true
  }

  const boot = () => {
    if (init()) return
    requestAnimationFrame(boot)
  }
  boot()
})()
