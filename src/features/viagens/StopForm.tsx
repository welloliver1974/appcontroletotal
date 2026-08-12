import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Trip, TripStop } from '@/data/types'
import { nextStopDay, tripLength } from './viagensUtils'

export interface StopDraft {
  day: number
  time?: string
  title: string
  note?: string
}

/** Add/edit a chronological stop on a trip (day within window, optional time). */
export function StopForm({
  trip,
  mode,
  stop,
  onClose,
  onSubmit,
}: {
  trip: Trip
  mode: 'new' | 'edit'
  stop?: TripStop
  onClose: () => void
  onSubmit: (draft: StopDraft) => Promise<void> | void
}) {
  // Tolerant max: existing stops may be on days past a shrunk window.
  const maxDay = Math.max(tripLength(trip.startDate, trip.endDate), ...trip.stops.map((s) => s.day))
  const [day, setDay] = useState(mode === 'new' ? String(nextStopDay(trip)) : String(stop?.day ?? 1))
  const [time, setTime] = useState(stop?.time ?? '')
  const [title, setTitle] = useState(stop?.title ?? '')
  const [note, setNote] = useState(stop?.note ?? '')

  const dayNum = Number(day)
  const invalidDay = !Number.isInteger(dayNum) || dayNum < 1 || dayNum > maxDay
  const invalid = !title.trim() || invalidDay

  const submit = () => {
    if (invalid) return
    void onSubmit({
      day: dayNum,
      time: time.trim() || undefined,
      title: title.trim(),
      note: note.trim() || undefined,
    })
  }

  return (
    <Modal open onClose={onClose} title={mode === 'edit' ? 'Editar parada' : 'Nova parada'}>
      <div className="space-y-4">
        <div>
          <p className="mb-0.5 text-xs text-zinc-500">
            <span className="font-medium text-cyan-300">{trip.destination}</span> · {trip.startDate} → {trip.endDate}
          </p>
          <p className="text-[11px] text-zinc-600">Dia 1 = primeiro dia da viagem.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="stop-day" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Dia
            </label>
            <input
              id="stop-day"
              type="number"
              min={1}
              max={maxDay}
              className="input-base font-num"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
            {invalidDay && (
              <p className="mt-1 text-[11px] text-rose-300">Use um dia inteiro entre 1 e {maxDay}.</p>
            )}
          </div>
          <div>
            <label htmlFor="stop-time" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Hora <span className="text-zinc-600">(opcional)</span>
            </label>
            <input
              id="stop-time"
              type="time"
              className="input-base font-num"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="stop-title" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Título
          </label>
          <input
            id="stop-title"
            className="input-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex.: Trilha da Lagoinha do Leste"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="stop-note" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Nota <span className="text-zinc-600">(opcional)</span>
          </label>
          <input
            id="stop-note"
            className="input-base"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ex.: levar água e lanche"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={invalid}>
            Salvar parada
          </Button>
        </div>
      </div>
    </Modal>
  )
}