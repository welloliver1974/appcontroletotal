import { useEffect, useState } from 'react'
import { CalendarDays, Eye, Wallet } from 'lucide-react'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/feedback'
import { cn } from '@/lib/utils'
import {
  checkPantryExpiringNotifications,
  checkTodayEventsNotifications,
  checkUpcomingEventsReminders,
} from '@/lib/notifications'
import { useDashboardData } from './dashboardData'
import { KpiRow } from './KpiRow'
import { AlertsGrid } from './Alerts'
import { RecentLogCard, UpcomingCard } from './Widgets'
import { HermesBriefingCard } from './HermesBriefingCard'
import { DailyHabitsCard } from './DailyHabitsCard'
import { DashboardQuickActions } from './DashboardQuickActions'
import { FinanceQuickSummaryCard } from './FinanceQuickSummaryCard'
import { QuickShoppingListCard } from './QuickShoppingListCard'
import { ActiveTripCard } from './ActiveTripCard'
import { PwaInstallBanner } from '@/components/pwa/PwaInstallBanner'

function todayLabel() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4 w-full">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 w-full">
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

type MobileTab = 'all' | 'routine' | 'finance'

export function DashboardPage() {
  const data = useDashboardData()
  const module = MODULE_BY_ID.dashboard
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('routine')

  useEffect(() => {
    if (data) {
      checkTodayEventsNotifications(data.events)
      checkPantryExpiringNotifications(data.pantry)
      checkUpcomingEventsReminders(data.events)

      const interval = setInterval(() => {
        checkUpcomingEventsReminders(data.events)
      }, 60000)

      return () => clearInterval(interval)
    }
  }, [data])

  return (
    <div className="space-y-4 sm:space-y-6 pb-8 w-full min-w-0 max-w-full overflow-hidden">
      <PageHeader module={module}>
        <span className="chip mt-1 hidden sm:inline-flex capitalize">
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {todayLabel()}
        </span>
      </PageHeader>

      {/* Banner inteligente de instalação no celular */}
      <PwaInstallBanner />

      {!data ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Barra de Ações Rápidas em 1 Toque */}
          <DashboardQuickActions onRefresh={() => setRefreshKey((k) => k + 1)} />

          {/* Painel Dinâmico do Modo Viagem (exibido apenas quando houver viagem ativa hoje) */}
          <ActiveTripCard trips={data.trips} />

          {/* Resumo Matinal do Hermes IA */}
          <HermesBriefingCard data={data} />

          {/* Linha de KPIs Rápidos */}
          <KpiRow data={data} loading={false} />

          {/* Seletor de visualização mobile (Tabs Rápidas para celular) */}
          <div className="lg:hidden w-full min-w-0 pt-1">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-md">
              <button
                type="button"
                onClick={() => setActiveMobileTab('routine')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all truncate',
                  activeMobileTab === 'routine'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                <CalendarDays className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                <span className="truncate">Rotina & Agenda</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMobileTab('finance')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all truncate',
                  activeMobileTab === 'finance'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200',
                )}
              >
                <Wallet className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Finanças & Radar</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMobileTab('all')}
                className={cn(
                  'flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg text-xs font-semibold transition-all shrink-0',
                  activeMobileTab === 'all'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                    : 'text-zinc-500 hover:text-zinc-300',
                )}
                title="Mostrar todos os cards"
              >
                <Eye className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Todos</span>
              </button>
            </div>
          </div>

          {/* Layout Principal: 2 Colunas no Desktop, Tabbed/Filtrado no Mobile */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-12 items-start w-full min-w-0">
            {/* Coluna da Esquerda: Foco Pessoal & Rotina (7 colunas no desktop) */}
            <div
              className={cn(
                'space-y-4 sm:space-y-5 lg:col-span-7 min-w-0 w-full',
                activeMobileTab === 'finance' ? 'hidden lg:block' : 'block',
              )}
            >
              <DailyHabitsCard key={`habits-${refreshKey}`} />
              <UpcomingCard data={data} />
              <RecentLogCard data={data} />
            </div>

            {/* Coluna da Direita: Finanças, Radar de Alertas & Compras (5 colunas no desktop) */}
            <div
              className={cn(
                'space-y-4 sm:space-y-5 lg:col-span-5 min-w-0 w-full',
                activeMobileTab === 'routine' ? 'hidden lg:block' : 'block',
              )}
            >
              <FinanceQuickSummaryCard key={`finance-${refreshKey}`} />
              <AlertsGrid data={data} />
              <QuickShoppingListCard key={`shopping-${refreshKey}`} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}