import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { AuthGate } from '@/components/auth/AuthGate'
import { AppShell } from '@/components/layout/AppShell'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { Skeleton } from '@/components/ui/feedback'

const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const HojePage = lazy(() => import('@/features/hoje/HojePage').then((m) => ({ default: m.HojePage })))
const FitPage = lazy(() => import('@/features/fit/FitPage').then((m) => ({ default: m.FitPage })))
const LifeLogPage = lazy(() => import('@/features/life-log/LifeLogPage').then((m) => ({ default: m.LifeLogPage })))
const ManutencaoPage = lazy(() => import('@/features/manutencao/ManutencaoPage').then((m) => ({ default: m.ManutencaoPage })))
const DespensaPage = lazy(() => import('@/features/despensa/DespensaPage').then((m) => ({ default: m.DespensaPage })))
const FinancasPage = lazy(() => import('@/features/financas/FinancasPage').then((m) => ({ default: m.FinancasPage })))
const ViagensPage = lazy(() => import('@/features/viagens/ViagensPage').then((m) => ({ default: m.ViagensPage })))
const AgendaPage = lazy(() => import('@/features/agenda/AgendaPage').then((m) => ({ default: m.AgendaPage })))
const ShareTargetHandler = lazy(() => import('@/features/life-log/ShareTargetHandler').then((m) => ({ default: m.ShareTargetHandler })))

function PageLoading() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}

export default function App() {
  const isTrusted = useAuthStore((s) => s.isTrusted)
  const initAuth = useAuthStore((s) => s.initAuth)

  useEffect(() => {
    initAuth()
  }, [initAuth])

  // Pré-carregamento silencioso das abas em segundo plano durante o tempo ocioso (Idle)
  // Garante que o primeiro clique em qualquer aba seja 100% instantâneo sem nenhum atraso de download
  useEffect(() => {
    if (!isTrusted) return

    const preloadModules = () => {
      void import('@/features/dashboard/DashboardPage')
      void import('@/features/despensa/DespensaPage')
      void import('@/features/financas/FinancasPage')
      void import('@/features/agenda/AgendaPage')
      void import('@/features/fit/FitPage')
      void import('@/features/life-log/LifeLogPage')
      void import('@/features/manutencao/ManutencaoPage')
      void import('@/features/viagens/ViagensPage')
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = (window as unknown as { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(preloadModules, { timeout: 2000 })
      return () => {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id)
      }
    } else {
      const timer = setTimeout(preloadModules, 1200)
      return () => clearTimeout(timer)
    }
  }, [isTrusted])

  return (
    <BrowserRouter>
      {isTrusted ? (
        <>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/hoje" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/hoje" element={<HojePage />} />
                <Route path="/fit" element={<FitPage />} />
                <Route path="/life-log" element={<LifeLogPage />} />
                <Route path="/manutencao" element={<ManutencaoPage />} />
                <Route path="/despensa" element={<DespensaPage />} />
                <Route path="/financas" element={<FinancasPage />} />
                <Route path="/viagens" element={<ViagensPage />} />
                <Route path="/agenda" element={<AgendaPage />} />
                <Route path="/share-target" element={<ShareTargetHandler />} />
                <Route path="*" element={<Navigate to="/hoje" replace />} />
              </Route>
            </Routes>
          </Suspense>
          <ToastContainer />
        </>
      ) : (
        <>
          <AuthGate />
          <ToastContainer />
        </>
      )}
    </BrowserRouter>
  )
}