(() => {
  const init = () => {
    const landing = document.querySelector('.landing')
    if (!landing || landing.dataset.interactionsReady === 'true') return
    landing.dataset.interactionsReady = 'true'

    const cursor = document.createElement('div')
    cursor.className = 'landing-cursor'
    cursor.setAttribute('aria-hidden', 'true')
    landing.appendChild(cursor)

    const canUsePointer = window.matchMedia('(pointer:fine)').matches
    if (!canUsePointer) return

    let raf = 0
    let x = -100
    let y = -100
    let targetX = x
    let targetY = y

    const render = () => {
      raf = 0
      x += (targetX - x) * 0.18
      y += (targetY - y) * 0.18
      landing.style.setProperty('--lf-cursor-x', `${x}px`)
      landing.style.setProperty('--lf-cursor-y', `${y}px`)
      if (Math.abs(targetX - x) > 0.2 || Math.abs(targetY - y) > 0.2) raf = requestAnimationFrame(render)
    }

    const move = (event) => {
      targetX = event.clientX
      targetY = event.clientY
      landing.classList.add('is-pointer-ready')
      if (!raf) raf = requestAnimationFrame(render)
    }

    const over = (event) => {
      if (event.target.closest('button,a,.preview-flow__node,.capability')) landing.classList.add('is-pointer-hover')
    }

    const out = (event) => {
      const from = event.target.closest('button,a,.preview-flow__node,.capability')
      const to = event.relatedTarget?.closest?.('button,a,.preview-flow__node,.capability')
      if (from && !to) landing.classList.remove('is-pointer-hover')
    }

    window.addEventListener('pointermove', move, { passive: true })
    landing.addEventListener('pointerover', over)
    landing.addEventListener('pointerout', out)

    const cleanup = () => {
      window.removeEventListener('pointermove', move)
      landing.removeEventListener('pointerover', over)
      landing.removeEventListener('pointerout', out)
      if (raf) cancelAnimationFrame(raf)
    }

    window.addEventListener('pagehide', cleanup, { once: true })
  }

  const wait = () => {
    if (document.querySelector('.landing')) init()
    else requestAnimationFrame(wait)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wait, { once: true })
  else wait()
})()
