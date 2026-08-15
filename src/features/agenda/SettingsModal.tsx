import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { SettingsPage } from './SettingsPage'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const portalRootRef = useRef<HTMLDivElement>(null)

  // Create portal root on first render
  useEffect(() => {
    if (!portalRootRef.current) {
      const div = document.createElement('div')
      document.body.appendChild(div)
      portalRootRef.current = div
    }
    return () => {
      if (portalRootRef.current) {
        document.body.removeChild(portalRootRef.current)
        portalRootRef.current = null
      }
    }
  }, [])

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

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="glass relative z-10 max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl sm:rounded-2xl"
      >
        <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/80 px-5 py-3.5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="chip bg-rose-500/15 text-rose-300 border-rose-500/30">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="font-display text-sm font-semibold text-zinc-100">Configurações</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">
          <SettingsPage />
        </div>
      </div>
    </div>
  )

  return portalRootRef.current ? createPortal(modalContent, portalRootRef.current) : null
}