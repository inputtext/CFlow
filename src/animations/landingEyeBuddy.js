import { createElement } from 'react'
import { createRoot } from 'react-dom/client'

function FooterHello() {
  return createElement(
    'div',
    { className: 'landing-eye-buddy', 'aria-hidden': 'true' },
    createElement('span', { className: 'landing-eye-buddy__hello' }, 'HELLO 👋')
  )
}

(() => {
  let root = null
  let mounted = false

  const init = () => {
    if (mounted) return
    const landing = document.querySelector('.landing')
    const footer = landing?.querySelector('.landing-footer')
    if (!landing || !footer) return
    mounted = true

    const host = document.createElement('div')
    host.className = 'landing-eye-buddy-host'
    footer.appendChild(host)
    root = createRoot(host)
    root.render(createElement(FooterHello))

    window.addEventListener('pagehide', () => {
      if (root) root.unmount()
    }, { once: true })
  }

  const waitForLanding = () => {
    if (document.querySelector('.landing-footer')) init()
    else requestAnimationFrame(waitForLanding)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForLanding, { once: true })
  } else {
    waitForLanding()
  }
})()
