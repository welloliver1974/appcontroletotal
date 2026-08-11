import { BookOpen, CalendarDays, NotebookPen, Smile } from 'lucide-react'
import type { ReadingEntry, LifeLogEntry } from '@/data/types'
import { KpiCard } from '@/components/ui/KpiCard'
import { avgMood, distinctDays } from './logUtils'

const EMERALD_SOFT = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'

/** Life-Log summary: total, distinct days, average mood, active readings. */
export function Kpis({
  logs,
  reading,
}: {
  logs: LifeLogEntry[]
  reading: ReadingEntry[]
}) {
  const kpis = [
    {
      icon: NotebookPen,
      label: 'Anotações',
      value: String(logs.length),
      hint: 'total',
      soft: EMERALD_SOFT,
    },
    {
      icon: CalendarDays,
      label: 'Dias registrados',
      value: String(distinctDays(logs)),
      hint: 'dias distintos',
      soft: EMERALD_SOFT,
    },
    {
      icon: Smile,
      label: 'Humor médio',
      value: avgMood(logs),
      hint: 'média 1–5',
      soft: EMERALD_SOFT,
    },
    {
      icon: BookOpen,
      label: 'Leituras ativas',
      value: String(reading.filter((r) => r.status === 'lendo').length),
      hint: 'em andamento',
      soft: EMERALD_SOFT,
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