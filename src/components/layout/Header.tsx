import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Search, Settings } from 'lucide-react'
import { MODULE_BY_PATH } from '@/lib/modules'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { Omnibox } from './Omnibox'
import { SettingsModal } from '@/features/agenda/SettingsModal'

/** Global header: current module chip · Neural Omnibox · Hermes sync · quick add (+) · settings. */
export function Header() {
  const location = useLocation()
  const setCommandOpen = useUiStore((s) => s.setCommandOpen)
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen)
  const module = MODULE_BY_PATH[location.pathname]
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-zinc-800/70 bg-zinc-950/70 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4 md:px-6">
          {/* Current module chip (context) */}
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', module?.solid ?? 'bg-zinc-500')} />
            <span className="truncate text-sm font-semibold text-zinc-200">
              {module?.label ?? 'AppControleTotal'}
            </span>
          </div>

          {/* Neural Omnibox */}
          <div className="mx-auto hidden w-full max-w-lg md:block">
            <Omnibox />
          </div>
          <button
            onClick={() => setCommandOpen(true)}
            className="btn-ghost ml-auto md:ml-0 md:hidden"
            aria-label="Busca neural"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Hermes sync badge */}
          <span className="chip hidden sm:inline-flex">
            <span className="pulse-dot" />
            Hermes Sync Active
          </span>

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="btn-ghost ml-1 md:ml-2"
            aria-label="Configurações"
          >
            <Settings className="h-5 w-5" />
          </button>

          {/* Quick add */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-colors hover:bg-indigo-400 active:scale-95"
            aria-label="Adição rápida (���N)"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}