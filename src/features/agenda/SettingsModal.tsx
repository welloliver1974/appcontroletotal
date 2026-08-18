import { useEffect } from 'react'
import { X, Shield } from 'lucide-react'
import { createPortal } from 'react-dom'
import { SettingsPage } from './SettingsPage'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  initialSection?: 'hermes' | 'calendar' | 'backup' | 'webhook' | 'pwa' | 'theme' | 'notifications'
}

export function SettingsModal({ open, onClose, initialSection = 'hermes' }: SettingsModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="glass relative z-10 flex flex-col h-[90vh] max-h-[850px] w-full max-w-5xl overflow-hidden rounded-2xl sm:rounded-3xl border border-zinc-800 shadow-2xl shadow-black/80"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-950/80 px-5 py-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="chip bg-rose-500/15 text-rose-300 border-rose-500/30">
              <Shield className="h-4 w-4" />
            </div>
            <h2 className="font-display text-sm font-semibold text-zinc-100">Configurações do Life OS</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950/40">
          <SettingsPage initialSection={initialSection} />
        </div>
      </div>
    </div>,
    document.body,
  )
}