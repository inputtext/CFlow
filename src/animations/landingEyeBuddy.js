import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

function EyeBuddy() {
  return createElement(
    'div',
    { className: 'landing-eye-buddy', 'aria-hidden': 'true' },
    createElement(
      'div',
      { className: 'landing-eye-buddy__lottie' },
      createElement(DotLottieReact, {
        src: '/cflow-eye-buddy.json',
        autoplay: true,
        loop: true,
        style: { width: '100%', height: '100%' },
      })
    ),
    createElement('span', { className: 'landing-eye-buddy__hello' }, 'HELLO 👋')
  )
}

(() => {
  let root = null
  let mounted = false
  let raf = 0
  let targetX = 0
  let targetY = 0
  let currentX = 0
  let currentY = 0
  let lastScrollY = window.scrollY

  const init = () => {
    if (mounted) return
    const landing = document.querySelector('.landing')
    if (!landing) return
    mounted = true

    const host = document.createElement('div')
    host.className = 'landing-eye-buddy-host'
    landing.appendChild(host)
    root = createRoot(host)
    root.render(createElement(EyeBuddy))

    const tick = () => {
      currentX += (targetX - currentX) * 0.1
      currentY += (targetY - currentY) * 0.1
      host.style.setProperty('--buddy-look-x', `${currentX}px`)
      host.style.setProperty('--buddy-look-y', `${currentY}px`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onPointerMove = (event) => {
      const rect = host.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = Math.max(-1, Math.min(1, (event.clientX - cx) / Math.max(window.innerWidth * 0.45, 1)))
      const dy = Math.max(-1, Math.min(1, (event.clientY - cy) / Math.max(window.innerHeight * 0.45, 1)))
      targetX = dx * 7
      targetY = dy * 5
    }

    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastScrollY
      lastScrollY = y
      host.style.setProperty('--buddy-scroll-tilt', `${Math.max(-3, Math.min(3, delta * 0.2))}deg`)

      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
      const progress = y / max
      host.classList.toggle('is-near-end', progress > 0.92)
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    window.addEventListener('pagehide', () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
      if (root) root.unmount()
    }, { once: true })
  }

  const waitForLanding = () => {
    if (document.querySelector('.landing')) init()
    else requestAnimationFrame(waitForLanding)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForLanding, { once: true })
  else waitForLanding()
})()
