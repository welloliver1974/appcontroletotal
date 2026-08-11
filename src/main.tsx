import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import App from './app/App'
import { db } from '@/data/db'

// Mock backend: ensure the local "database" is seeded before first render.
db.init()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)