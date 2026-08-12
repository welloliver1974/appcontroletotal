import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn, isoOffset } from '@/lib/utils'
import type { Trip, TripStatus } from '@/data/types'
import { STATUS } from './viagensUtils'

export interface TripDraft {
  destination: string
  startDate: string
  endDate: string
  status: TripStatus
}

/** Active chip classes for each status — kept literal so Tailwind compiles them. */
const STATUS_ACTIVE: Record<TripStatus, string> = {
  planejado: 'border-zinc-500/50 bg-zinc-500/20 text-zinc-200',
  confirmado: 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200',
  realizado: 'border-emerald-500/60 bg-emerald-500/20 text-emerald-200',
}

/** Create/edit modal for a trip (destination, dates, status). Stops live in StopForm. */
export function TripForm({
  mode,
  trip,
  onClose,
  onSubmit,
}: {
  mode: 'new' | 'edit'
  trip?: Trip
  onClose: () => void
  onSubmit: (draft: TripDraft) => Promise<void> | void
}) {
  const [destination, setDestination] = useState(trip?.destination ?? '')
  const [startDate, setStartDate] = useState(trip?.startDate ?? isoOffset(7))
  const [endDate, setEndDate] = useState(trip?.endDate ?? isoOffset(9))
  const [status, setStatus] = useState<TripStatus>(trip?.status ?? 'planejado')

  const invalidRange = startDate > endDate
  const invalid = !destination.trim() || !startDate || !endDate || invalidRange

  const submit = () => {
    if (invalid) return
    void onSubmit({ destination: destination.trim(), startDate, endDate, status })
  }

  return (
    <Modal open onClose={onClose} title={mode === 'edit' ? 'Editar viagem' : 'Nova viagem'}>
      <div className="space-y-4">
        <div>
          <label htmlFor="trip-dest" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Destino
          </label>
          <input
            id="trip-dest"
            className="input-base"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="ex.: Florianópolis — SC"
            autoFocus
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Status</span>
          <div className="flex items-center gap-2">
            {(Object.keys(STATUS) as TripStatus[]).map((s) => {
              const active = s === status
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium capitalize transition-colors',
                    active
                      ? STATUS_ACTIVE[s]
                      : 'border-zinc-800 bg-white/5 text-zinc-500 hover:bg-white/10',
                  )}
                >
                  {STATUS[s].label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="trip-start" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Início
            </label>
            <input
              id="trip-start"
              type="date"
              className="input-base"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="trip-end" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Fim
            </label>
            <input
              id="trip-end"
              type="date"
              className="input-base"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        {invalidRange && (
          <p className="text-xs text-rose-300">A data de fim precisa ser a partir da data de início.</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={invalid}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}