import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus, Search, Settings, Smartphone } from 'lucide-react'
import { MODULE_BY_PATH } from '@/lib/modules'
import { useUiStore } from '@/stores/uiStore'
import { useOfflineQueueStore } from '@/stores/offlineQueueStore'
import { useSupabase } from '@/lib/db'
import { checkStandalone } from '@/lib/pwa'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'
import { Omnibox } from './Omnibox'
import { SettingsModal } from '@/features/agenda/SettingsModal'

/** Global header: current module chip · Neural Omnibox · Hermes sync · quick add (+) · settings. */
export function Header() {
  const location = useLocation()
  const setCommandOpen = useUiStore((s) => s.setCommandOpen)
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen)
  const isOnline = useOfflineQueueStore((s) => s.isOnline)
  const isSyncing = useOfflineQueueStore((s) => s.isSyncing)
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
              {module?.label ?? 'Life OS Hub'}
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

          {/* Cloud / Sync Status Badge */}
          {isSyncing ? (
            <span className="chip hidden sm:inline-flex items-center gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-300">
              <span className="h-2 w-2 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              Sincronizando...
            </span>
          ) : !isOnline ? (
            <span className="chip hidden sm:inline-flex items-center gap-1.5 border-rose-500/30 bg-rose-500/10 text-rose-300">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              Modo Offline
            </span>
          ) : useSupabase ? (
            <span className="chip hidden sm:inline-flex items-center gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Supabase Nuvem
            </span>
          ) : (
            <span className="chip hidden sm:inline-flex items-center gap-1.5">
              <span className="pulse-dot" />
              Hermes Local
            </span>
          )}

          {/* Install Button (when not standalone) */}
          {!checkStandalone() && (
            <button
              onClick={() => {
                const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent || '')
                if (isIosDevice) {
                  toast.info('No iPhone: toque no ícone de Compartilhar ⎋ e em "Adicionar à Tela de Início ➕"!')
                } else {
                  toast.info('Para instalar: toque no menu dos 3 pontinhos do navegador e escolha "Instalar Aplicativo / Adicionar à Tela Inicial". 📲')
                }
              }}
              className="chip hidden sm:inline-flex items-center gap-1 border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors"
              title="Instalar App no Celular ou PC"
            >
              <Smartphone className="h-3 w-3 text-indigo-400" />
              <span>Instalar App</span>
            </button>
          )}

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