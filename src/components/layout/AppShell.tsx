import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUiStore } from '@/stores/uiStore'
import { useOfflineQueueStore } from '@/stores/offlineQueueStore'
import { toast } from '@/stores/toastStore'
import { MODULES } from '@/lib/modules'
import { Sidebar } from './Sidebar'
import { NavRail } from './NavRail'
import { BottomNav } from './BottomNav'
import { Header } from './Header'
import { CommandPalette } from './CommandPalette'
import { QuickAddModal } from './QuickAddModal'
import { HermesChatDrawer } from '@/components/hermes/HermesChatDrawer'

/**
 * Responsive app shell:
 * mobile → bottom nav · tablet → rail · desktop → sidebar.
 * Owns global shortcuts: ⌘K omnibox, ⌘N quick add, Alt+1..6 modules.
 */
export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const setCommandOpen = useUiStore((s) => s.setCommandOpen)
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen)
  const setOnline = useOfflineQueueStore((s) => s.setOnline)
  const retryAll = useOfflineQueueStore((s) => s.retryAll)

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      toast.success('Conexão restabelecida! Sincronizando dados com o Supabase... 🚀')
      void retryAll()
    }
    const handleOffline = () => {
      setOnline(false)
      toast.warning('Você está offline. As alterações serão salvas localmente e sincronizadas depois. 📴')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline, retryAll])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      const k = e.key.toLowerCase()
      if (mod && k === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      } else if (mod && k === 'n') {
        e.preventDefault()
        setQuickAddOpen(true)
      } else if (e.altKey && /^[1-7]$/.test(e.key)) {
        e.preventDefault()
        const m = MODULES[Number(e.key) - 1]
        if (m) navigate(m.path)
      } else if (e.key === 'Escape') {
        setCommandOpen(false)
        setQuickAddOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate, setCommandOpen, setQuickAddOpen])

  return (
    <div className="flex min-h-dvh flex-col md:pl-16 lg:pl-64 w-full max-w-full overflow-x-hidden">
      <Sidebar />
      <NavRail />
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 sm:px-5 pb-24 sm:pb-28 pt-4 sm:pt-5 md:px-6 md:pb-12 lg:px-8 lg:pt-7 overflow-x-hidden">
        <Outlet />
      </main>
      <BottomNav />
      <CommandPalette />
      <QuickAddModal />
      <HermesChatDrawer />
    </div>
  )
}