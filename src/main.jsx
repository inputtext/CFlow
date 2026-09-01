import { createRoot } from 'react-dom/client'

import './index.css'
import './styles/theme.css'

import App from './App.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import ClerkGate from './components/ClerkGate.jsx'
import AnalysisUsageGuard from './components/AnalysisUsageGuard.jsx'

import { ClerkProvider } from '@clerk/react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')
}

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
