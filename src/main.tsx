import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import App from './app/App'
import { db } from '@/lib/db'
import { initBackupScheduler } from '@/lib/backupScheduler'
import { initBackgroundSync } from '@/lib/backgroundSync'
import { loadHermesConfigFromCloud } from '@/lib/hermes'
import { useThemeStore } from '@/stores/themeStore'

// Initialize active theme
const savedTheme = useThemeStore.getState().theme
if (typeof document !== 'undefined' && savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme)
}

// Database adapter seeds local data only when Supabase is not configured.
db.init()

// Init background services (backup scheduler + offline queue sync + hermes cloud config).
initBackupScheduler()
initBackgroundSync()
void loadHermesConfigFromCloud()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for PWA (automatic & immediate)
if ('serviceWorker' in navigator) {
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  }).catch(() => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('[PWA] SW register fallback failed:', err)
    })
  })
}
