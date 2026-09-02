import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

const SAMPLE_LOTTIE = 'https://lottie.host/4db68bbd-31f6-4cd8-84eb-189de081159a/IGmMCqhzpt.lottie'

function MicroLottie({ label }) {
  return createElement(
    'div',
    { className: 'landing-micro-lottie', 'aria-hidden': 'true', title: label },
    createElement(DotLottieReact, {
      src: SAMPLE_LOTTIE,
      autoplay: true,
      loop: true,
      style: { width: '100%', height: '100%' },
    })
  )
}

(() => {
  let mounted = false

  const mount = () => {
    if (mounted) return
    const landing = document.querySelector('.landing')
    if (!landing) return
    mounted = true

    const capabilityCard = landing.querySelector('.capability-system__card:first-child')
    if (capabilityCard && !capabilityCard.querySelector('.landing-micro-lottie-host')) {
      const host = document.createElement('span')
      host.className = 'landing-micro-lottie-host'
      capabilityCard.appendChild(host)
      createRoot(host).render(createElement(MicroLottie, { label: 'Program state animation' }))
    }

    const previewSignal = landing.querySelector('.preview-window__signal')
    if (previewSignal && !previewSignal.querySelector('.landing-micro-lottie-host')) {
      const host = document.createElement('span')
      host.className = 'landing-micro-lottie-host'
      previewSignal.insertBefore(host, previewSignal.firstChild)
      createRoot(host).render(createElement(MicroLottie, { label: 'Execution state animation' }))
    }
  }

  const waitForLanding = () => {
    if (document.querySelector('.landing')) mount()
    else requestAnimationFrame(waitForLanding)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForLanding, { once: true })
  else waitForLanding()
})()
