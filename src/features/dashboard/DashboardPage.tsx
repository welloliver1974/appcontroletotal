import { useEffect } from 'react'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/feedback'
import { checkPantryExpiringNotifications, checkTodayEventsNotifications, checkUpcomingEventsReminders } from '@/lib/notifications'
import { useDashboardData } from './dashboardData'
import { KpiRow } from './KpiRow'
import { AlertsGrid } from './Alerts'
import { LifeInsights } from './LifeInsights'
import { EmailsCard, RecentLogCard, UpcomingCard } from './Widgets'
import { HermesBriefingCard } from './HermesBriefingCard'

function todayLabel() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-3 w-24 rounded-full" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <div>
        <Skeleton className="mb-3 h-4 w-40 rounded-full" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

/** Fase 1 — Dashboard polido: KPIs, radar de alertas, widgets e Life Insights. */
export function DashboardPage() {
  const data = useDashboardData()
  const module = MODULE_BY_ID.dashboard

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
    <div className="space-y-6">
      <PageHeader
        module={module}
      >
        <span className="chip mt-1 hidden sm:inline-flex">
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400" />
          {todayLabel()}
        </span>
      </PageHeader>

      {!data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <HermesBriefingCard data={data} />
          <KpiRow data={data} loading={false} />
          <AlertsGrid data={data} />
          <div className="grid gap-3 lg:grid-cols-3">
            <UpcomingCard data={data} />
            <EmailsCard data={data} />
            <RecentLogCard data={data} />
          </div>
          <LifeInsights data={data} />
        </>
      )}
    </div>
  )
}