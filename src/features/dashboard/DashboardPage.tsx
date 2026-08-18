import { useEffect, useState } from 'react'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/feedback'
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
    <div className="space-y-6">
      <Skeleton className="h-16 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
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

export function DashboardPage() {
  const data = useDashboardData()
  const module = MODULE_BY_ID.dashboard
  const [refreshKey, setRefreshKey] = useState(0)

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
    <div className="space-y-6 pb-8">
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

          {/* Resumo Matinal do Hermes IA */}
          <HermesBriefingCard data={data} />

          {/* Linha de KPIs Rápidos */}
          <KpiRow data={data} loading={false} />

          {/* Layout Principal em 2 Colunas */}
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Coluna da Esquerda: Foco Pessoal & Rotina (7 colunas) */}
            <div className="space-y-5 lg:col-span-7">
              <DailyHabitsCard key={`habits-${refreshKey}`} />
              <UpcomingCard data={data} />
              <RecentLogCard data={data} />
            </div>

            {/* Coluna da Direita: Finanças, Radar de Alertas & Compras (5 colunas) */}
            <div className="space-y-5 lg:col-span-5">
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