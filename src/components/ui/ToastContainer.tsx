import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useToastStore } from '@/stores/toastStore'
import { cn } from '@/lib/utils'

const TOAST_BG: Record<string, string> = {
  success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200',
  error: 'bg-rose-500/15 border-rose-500/30 text-rose-200',
  info: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200',
  warning: 'bg-amber-500/15 border-amber-500/30 text-amber-200',
}

const TOAST_ICON: Record<string, React.ReactNode> = {
  success: '✓',
  error: '!',
  info: 'ⓘ',
  warning: '⚠',
}

/**
 * Toast notification container.
 * Rendered via portal into document.body so it floats above the app shell
 * regardless of router/layout boundaries.
 */
export function ToastContainer() {
  const { toasts, remove } = useToastStore()

  if (!toasts.length) return null

  return createPortal(
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm shadow-xl shadow-black/30 backdrop-blur',
            'animate-in slide-in-from-bottom-2 fade-in-0',
            TOAST_BG[t.type],
          )}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold">
            {TOAST_ICON[t.type]}
          </span>
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="rounded p-0.5 text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
            aria-label="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}