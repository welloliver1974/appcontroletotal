import { CalendarDays, Check, MapPin, Plane } from 'lucide-react'
import type { Place, Trip } from '@/data/types'
import { KpiCard } from '@/components/ui/KpiCard'
import { relativeDayLabel } from '@/lib/utils'
import { nextTrip, totalStops, upcomingCount } from './viagensUtils'

const CYAN_SOFT = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'

/** Viagens summary: trips, upcoming, itinerary stops, visited places. */
export function Kpis({ trips, places }: { trips: Trip[]; places: Place[] }) {
  const nt = nextTrip(trips)
  const visited = places.filter((p) => p.visited).length

  const kpis = [
    {
      icon: Plane,
      label: 'Viagens',
      value: String(trips.length),
      hint: nt ? `próxima ${relativeDayLabel(nt.startDate)}` : 'sem próximas',
      soft: CYAN_SOFT,
    },
    {
      icon: CalendarDays,
      label: 'Próximas',
      value: String(upcomingCount(trips)),
      hint: 'não realizadas · daqui pra frente',
      soft: CYAN_SOFT,
    },
    {
      icon: MapPin,
      label: 'Paradas',
      value: String(totalStops(trips)),
      hint: 'no itinerário',
      soft: CYAN_SOFT,
    },
    {
      icon: Check,
      label: 'Visitados',
      value: String(visited),
      hint: `de ${places.length} lugares salvos`,
      soft: CYAN_SOFT,
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