import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import App from './app/App'
import { db } from '@/data/db'
import { initBackupScheduler } from '@/lib/backupScheduler'
import { initBackgroundSync } from '@/lib/backgroundSync'

// Mock backend: ensure the local "database" is seeded before first render.
db.init()

// Init background services (backup scheduler + offline queue sync).
initBackupScheduler()
initBackgroundSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register Service Worker for PWA (production only)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/sw.js').then(
    (reg) => console.log('[PWA] Service Worker registered:', reg.scope),
    (err) => console.error('[PWA] Service Worker registration failed:', err)
  )
}