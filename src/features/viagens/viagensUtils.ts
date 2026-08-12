import type { Place, Trip, TripStatus, TripStop } from '@/data/types'
import { shortDate, todayStr } from '@/lib/utils'

const DAY = 86_400_000

export const STATUS: Record<TripStatus, { label: string; chip: string }> = {
  planejado: { label: 'Planejado', chip: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
  confirmado: { label: 'Confirmado', chip: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  realizado: { label: 'Realizado', chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
}

/** Coming trips first (by startDate), realized trips last (by endDate, newest first). */
export function sortTrips(trips: Trip[]): Trip[] {
  return [...trips].sort((a, b) => {
    const aDone = a.status === 'realizado' ? 1 : 0
    const bDone = b.status === 'realizado' ? 1 : 0
    if (aDone !== bDone) return aDone - bDone
    if (aDone === 1 && bDone === 1) return b.endDate.localeCompare(a.endDate)
    return a.startDate.localeCompare(b.startDate)
  })
}

/** Planned/confirmed trip that hasn't fully ended yet (relative to today). */
export function isUpcomingTrip(trip: Trip): boolean {
  return trip.status !== 'realizado' && trip.endDate >= todayStr()
}

export function upcomingCount(trips: Trip[]): number {
  return trips.filter(isUpcomingTrip).length
}

export function realizedCount(trips: Trip[]): number {
  return trips.filter((t) => t.status === 'realizado').length
}

export function totalStops(trips: Trip[]): number {
  return trips.reduce((sum, t) => sum + t.stops.length, 0)
}

/** First non-realized trip by startDate — used by the "próxima viagem" KPI. */
export function nextTrip(trips: Trip[]): Trip | undefined {
  return sortTrips(trips).find((t) => t.status !== 'realizado')
}

/** Chronological order: day asc, missing time treated as the end of the day. */
export function sortStops(stops: TripStop[]): TripStop[] {
  return [...stops].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day
    return (a.time ?? '99:99').localeCompare(b.time ?? '99:99')
  })
}

/** Whole days inside [start, end], inclusive (min 1 for a same-day trip). */
export function tripLength(startDate: string, endDate: string): number {
  const [sy, sm, sd] = startDate.split('-').map((p) => Number(p))
  const [ey, em, ed] = endDate.split('-').map((p) => Number(p))
  const diff = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / DAY)
  return Math.max(1, diff + 1)
}

/** YYYY-MM-DD for a 1-based day inside the trip window. */
export function dateForDay(trip: Trip, day: number): string {
  const [y, m, d] = trip.startDate.split('-').map((p) => Number(p))
  return new Date(Date.UTC(y, m - 1, d + (day - 1))).toISOString().slice(0, 10)
}

/** "10 ago → 15 ago" date range for a trip. */
export function rangeLabel(trip: Trip): string {
  return `${shortDate(trip.startDate)} → ${shortDate(trip.endDate)}`
}

/** Next free day for a new stop: last used day + 1, clamped to the trip window. */
export function nextStopDay(trip: Trip): number {
  const used = trip.stops.reduce((m, s) => Math.max(m, s.day), 0)
  return Math.min(Math.max(used + 1, 1), tripLength(trip.startDate, trip.endDate))
}

/** Places to visit first, then already-visited; each group alphabetical. */
export function sortPlaces(places: Place[]): Place[] {
  return [...places].sort((a, b) => {
    if (a.visited !== b.visited) return a.visited ? 1 : -1
    return a.name.localeCompare(b.name)
  })
}

/** UUID for nested stops (api.create generates its own for top-level rows). */
export function newStopId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `stp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}