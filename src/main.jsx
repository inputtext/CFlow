import { createRoot } from 'react-dom/client'

import './index.css'
import './styles/theme.css'
import './styles/theme-palettes.css'
import './styles/theme-refinement.css'
import './styles/home-themes.css'
import './styles/ink-contrast.css'
import './styles/theme-control.css'

import App from './App.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import ClerkGate from './components/ClerkGate.jsx'
import AnalysisUsageGuard from './components/AnalysisUsageGuard.jsx'
import LandingPage from './landing/LandingPage.jsx'
import { initLandingSmoothScroll } from './animations/landingSmoothScroll.js'

import { ClerkProvider } from '@clerk/react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')
}

const isLanding = window.location.pathname === '/'

function Workspace() {
  return (
    <ClerkGate>
      <AnalysisUsageGuard>
        <App />
      </AnalysisUsageGuard>
    </ClerkGate>
  )
}

// The existing workspace intentionally owns the viewport scroll. The landing
// page is a document-scrolling experience, so switch the global shell only
// when the landing route is active. This keeps the existing app untouched.
if (isLanding) {
  document.documentElement.style.overflow = 'auto'
  document.body.style.overflow = 'auto'
  const root = document.getElementById('root')
  if (root) {
    root.style.height = 'auto'
    root.style.minHeight = '100%'
  }
  initLandingSmoothScroll()
}

document.addEventListener('click', (event) => {
  const logo = event.target.closest('header h1')
  if (!logo || isLanding) return
  window.location.assign('/')
})

createRoot(document.getElementById('root')).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    {isLanding ? <LandingPage /> : <Workspace />}
    {!isLanding && <ThemeToggle />}
  </ClerkProvider>
)
