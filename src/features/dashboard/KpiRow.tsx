import { CalendarClock, NotebookPen, ShoppingBasket, Wrench } from 'lucide-react'
import type { DashboardData } from './dashboardData'
import { upcomingWindowDays } from './dashboardData'
import { KpiCard } from '@/components/ui/KpiCard'
import { cn, isValidIsoDate } from '@/lib/utils'

function useKpis(data: DashboardData) {
  const commitments = data.events.filter((e) => upcomingWindowDays(e.date, 7)).length
  const maintenances = data.assets.filter(
    (a) =>
      (isValidIsoDate(a.nextMaintenance) && upcomingWindowDays(a.nextMaintenance as string, 7)) ||
      (typeof a.lifePct === 'number' && a.lifePct > 0 && a.lifePct <= 20),
  ).length
  const lowStock = data.pantry.filter((i) => i.qty <= i.lowThreshold).length
  const logsCount = data.lifeLog.length
  return [
    {
      icon: CalendarClock,
      label: 'Compromissos em 7 dias',
      value: String(commitments),
      hint: 'agenda',
      soft: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    },
    {
      icon: Wrench,
      label: 'Manutenções a vencer',
      value: String(maintenances),
      hint: 'ativos',
      soft: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    },
    {
      icon: ShoppingBasket,
      label: 'Itens em estoque baixo',
      value: String(lowStock),
      hint: 'despensa',
      soft: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    },
    {
      icon: NotebookPen,
      label: 'Entradas no Life-Log',
      value: String(logsCount),
      hint: 'diário',
      soft: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    },
  ] as const
}

/** 4 transversal KPIs pulling from every module's mock data. */
export function KpiRow({ data, loading }: { data: DashboardData; loading: boolean }) {
  const kpis = useKpis(data)
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {kpis.map((k) => (
        <KpiCard
          key={k.label}
          icon={k.icon}
          label={k.label}
          value={k.value}
          hint={k.hint}
          soft={k.soft}
          loading={loading}
          className={cn('min-w-0')}
        />
      ))}
    </div>
  )
}