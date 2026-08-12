import { Clock, Pencil, Plane, Plus, Trash2 } from 'lucide-react'
import type { Trip, TripStop } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { IconTile } from '@/components/ui/primitives'
import { cn, relativeDayLabel, shortDate } from '@/lib/utils'
import { usePendingDelete } from '@/lib/usePendingDelete'
import { STATUS, dateForDay, rangeLabel, sortStops, tripLength } from './viagensUtils'

const CYAN_SOFT = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'

/** One trip: header, date range, and an inline day-by-day itinerary timeline. */
export function TripCard({
  trip,
  onEdit,
  onRemove,
  onNewStop,
  onEditStop,
  onRemoveStop,
}: {
  trip: Trip
  onEdit: () => void
  onRemove: (id: string) => void
  onNewStop: () => void
  onEditStop: (stop: TripStop) => void
  onRemoveStop: (stopId: string) => void
}) {
  // Two independent guards: one for the trip itself, one shared by stop rows.
  const { pendingDelete: pendingTrip, request: requestTrip } = usePendingDelete()
  const { pendingDelete: pendingStop, request: requestStop } = usePendingDelete()

  const status = STATUS[trip.status]
  const stops = sortStops(trip.stops)
  const days = [...new Set(stops.map((s) => s.day))]

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <IconTile icon={Plane} size="sm" className={CYAN_SOFT} />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">{trip.destination}</p>
        <span className={cn('chip shrink-0 px-2 py-0.5 text-[10px]', status.chip)}>{status.label}</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="font-num text-zinc-400">{rangeLabel(trip)}</span>
        <span className="font-num text-zinc-600">{tripLength(trip.startDate, trip.endDate)} dias</span>
        <span className="text-zinc-500">{relativeDayLabel(trip.startDate)}</span>
      </div>

      {stops.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-800 px-4 py-4 text-center">
          <p className="text-xs text-zinc-500">Sem itinerário ainda.</p>
          <Button variant="soft" size="sm" onClick={onNewStop}>
            <Plus className="h-3.5 w-3.5" /> Adicionar parada
          </Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {days.map((day) => (
            <li key={day}>
              <div className="mb-0.5 flex items-center gap-2 px-1">
                <span className="eyebrow text-cyan-400">Dia {day}</span>
                <span className="text-[10px] uppercase tracking-wide text-zinc-600">
                  {shortDate(dateForDay(trip, day))}
                </span>
              </div>
              <div className="space-y-0.5">
                {stops
                  .filter((s) => s.day === day)
                  .map((stop) => (
                    <div
                      key={stop.id}
                      className="flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="mt-1 flex w-3 shrink-0 justify-center" aria-hidden>
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400/70" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {stop.time && (
                            <span className="inline-flex items-center gap-1 font-num text-[10px] text-cyan-300/80">
                              <Clock className="h-3 w-3" /> {stop.time}
                            </span>
                          )}
                          <p className="text-xs font-medium text-zinc-200">{stop.title}</p>
                        </div>
                        {stop.note && <p className="mt-0.5 text-[11px] text-zinc-500">{stop.note}</p>}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar parada"
                          onClick={() => onEditStop(stop)}
                          className="h-6 w-6 hover:text-cyan-300"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {pendingStop === stop.id ? (
                          <Button
                            variant="danger"
                            size="sm"
                            className="h-6 px-1.5 text-[10px]"
                            onClick={() => requestStop(stop.id, () => void onRemoveStop(stop.id))}
                          >
                            Remover?
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir parada"
                            onClick={() => requestStop(stop.id, () => void onRemoveStop(stop.id))}
                            className="h-6 w-6 hover:text-rose-300"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-800/70 pt-2">
        <Button variant="soft" size="sm" className="h-7 px-2 text-[11px]" onClick={onNewStop}>
          <Plus className="h-3.5 w-3.5" /> Parada
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          {pendingTrip === trip.id ? (
            <Button
              variant="danger"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={() => requestTrip(trip.id, () => void onRemove(trip.id))}
            >
              Remover?
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Excluir viagem"
              onClick={() => requestTrip(trip.id, () => void onRemove(trip.id))}
              className="h-7 w-7 hover:text-rose-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}