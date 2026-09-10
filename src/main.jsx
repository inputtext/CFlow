import { createRoot } from 'react-dom/client'

import './index.css'
import './styles/theme.css'
import './styles/theme-palettes.css'
import './styles/theme-refinement.css'
import './styles/home-themes.css'
import './styles/theme-control.css'

import App from './App.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import ClerkGate from './components/ClerkGate.jsx'
import AnalysisUsageGuard from './components/AnalysisUsageGuard.jsx'

import { ClerkProvider } from '@clerk/react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const CFLOW_API_URL = String(import.meta.env.VITE_CFLOW_API_URL || '').replace(/\/$/, '')

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')
}

// Keep the existing C·FLOW application code intact while allowing its
// analyzer endpoint to move from localhost in development to Render in
// production. Local development continues to use localhost:5000.
if (CFLOW_API_URL) {
  const nativeFetch = window.fetch.bind(window)
  const localApiPrefix = 'http://localhost:5000'
  window.fetch = (input, init) => {
    if (typeof input === 'string' && input.startsWith(localApiPrefix)) {
      return nativeFetch(`${CFLOW_API_URL}${input.slice(localApiPrefix.length)}`, init)
    }
    return nativeFetch(input, init)
  }
}

// The workspace logo returns to the C·FLOW language-selection home.
document.addEventListener('click', (event) => {
  const logo = event.target.closest('header h1')
  if (!logo) return
  window.location.assign('/')
})

createRoot(document.getElementById('root')).render(
  <>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ClerkGate>
        <AnalysisUsageGuard>
          <App />
        </AnalysisUsageGuard>
      </ClerkGate>
    </ClerkProvider>

    <ThemeToggle />
  </>
)
