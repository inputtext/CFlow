import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

const DOG_LOTTIE = 'data:application/zip;base64,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'

function EyeBuddy() {
  return createElement(
    'div',
    { className: 'landing-eye-buddy', 'aria-hidden': 'true' },
    createElement(
      'div',
      { className: 'landing-eye-buddy__lottie' },
      createElement(DotLottieReact, {
        src: DOG_LOTTIE,
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

    const buddy = host

    const tick = () => {
      currentX += (targetX - currentX) * 0.1
      currentY += (targetY - currentY) * 0.1
      buddy.style.setProperty('--buddy-look-x', `${currentX}px`)
      buddy.style.setProperty('--buddy-look-y', `${currentY}px`)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onPointerMove = (event) => {
      const rect = buddy.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      targetX = Math.max(-4, Math.min(4, (event.clientX - cx) / 70))
      targetY = Math.max(-3, Math.min(3, (event.clientY - cy) / 90))
    }

    const onScroll = () => {
      const y = window.scrollY
      const delta = y - lastScrollY
      lastScrollY = y
      buddy.style.setProperty('--buddy-scroll-tilt', `${Math.max(-2.5, Math.min(2.5, delta * 0.2))}deg`)

      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
      const progress = y / max
      buddy.classList.toggle('is-near-end', progress > 0.92)
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
