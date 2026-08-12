import { CalendarDays, Coins, Gauge, History } from 'lucide-react'
import type { Asset, MaintenanceRecord } from '@/data/types'
import { formatBRL, relativeDayLabel } from '@/lib/utils'
import { KpiCard } from '@/components/ui/KpiCard'
import { countUpcoming, totalSpent } from './maintUtils'

const ORANGE_SOFT = 'bg-orange-500/15 text-orange-300 border-orange-500/30'

/** Manutenção summary: assets, upcoming, records, total spent (BRL). */
export function Kpis({ assets, records }: { assets: Asset[]; records: MaintenanceRecord[] }) {
  const latestDate = records.reduce((m, r) => (r.date > m ? r.date : m), records[0]?.date ?? '')
  const avgLife = assets.length
    ? Math.round(assets.reduce((s, a) => s + a.lifePct, 0) / assets.length)
    : 0

  const kpis = [
    {
      icon: Gauge,
      label: 'Ativos',
      value: String(assets.length),
      hint: avgLife ? `vida útil média ${avgLife}%` : 'nenhum',
      soft: ORANGE_SOFT,
    },
    {
      icon: CalendarDays,
      label: 'Próximas manutenções',
      value: String(countUpcoming(assets)),
      hint: 'vencidas + 30 dias',
      soft: ORANGE_SOFT,
    },
    {
      icon: History,
      label: 'Registros',
      value: String(records.length),
      hint: latestDate ? relativeDayLabel(latestDate) : 'sem registros',
      soft: ORANGE_SOFT,
    },
    {
      icon: Coins,
      label: 'Total gasto',
      value: formatBRL(totalSpent(records)),
      hint: 'em manutenções',
      soft: ORANGE_SOFT,
    },
  ] as const

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {kpis.map((k) => (
        <KpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} hint={k.hint} soft={k.soft} />
      ))}
    </div>
  )
}