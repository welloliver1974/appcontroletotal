import { useEffect, useState } from 'react'
import { Calendar, Clock, MapPin, Tag } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { todayStr } from '@/lib/utils'
import type { AgendaEvent } from '@/data/types'

interface EventModalProps {
  event?: AgendaEvent | null
  onClose: () => void
  onSave: (event: Omit<AgendaEvent, 'id'>) => void
}

const CATEGORIES = [
  { value: 'reuniao', label: 'Reunião' },
  { value: 'pessoal', label: 'Pessoal' },
  { value: 'habit', label: 'Hábito' },
  { value: 'viagem', label: 'Viagem' },
] as const

function EventForm({ event, onSubmit }: {
  event?: AgendaEvent | null
  onSubmit: (data: Omit<AgendaEvent, 'id'>) => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd] = useState('')
  const [category, setCategory] = useState<AgendaEvent['category']>('pessoal')
  const [location, setLocation] = useState('')
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDate(event.date)
      setTimeStart(event.timeStart)
      setTimeEnd(event.timeEnd ?? '')
      setCategory(event.category)
      setLocation(event.location ?? '')
      setCompleted(Boolean(event.completed))
    } else {
      // Default to today
      setDate(todayStr())
      setTimeStart('09:00')
      setTimeEnd('10:00')
      setCompleted(false)
    }
  }, [event])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date || !timeStart) return

    onSubmit({
      title: title.trim(),
      date,
      timeStart,
      timeEnd: timeEnd || undefined,
      category,
      location: location.trim() || undefined,
      completed,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Título</label>
        <input
          type="text"
          className="input-base w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do evento"
          required
          autoFocus
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            <Calendar className="h-4 w-4 inline mr-1" /> Data
          </label>
          <input
            type="date"
            className="input-base w-full"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            <Clock className="h-4 w-4 inline mr-1" /> Início
          </label>
          <input
            type="time"
            className="input-base w-full"
            value={timeStart}
            onChange={(e) => setTimeStart(e.target.value)}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          <Clock className="h-4 w-4 inline mr-1" /> Término (opcional)
        </label>
        <input
          type="time"
          className="input-base w-full"
          value={timeEnd}
          onChange={(e) => setTimeEnd(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          <Tag className="h-4 w-4 inline mr-1" /> Categoria
        </label>
        <select
          className="input-base w-full"
          value={category}
          onChange={(e) => setCategory(e.target.value as AgendaEvent['category'])}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          <MapPin className="h-4 w-4 inline mr-1" /> Local (opcional)
        </label>
        <input
          type="text"
          className="input-base w-full"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Ex: Online (Meet), Clínica São Lucas, Casa"
        />
      </div>

      <div className="flex items-center gap-2.5 pt-2">
        <input
          type="checkbox"
          id="event-completed-checkbox"
          checked={completed}
          onChange={(e) => setCompleted(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500/20"
        />
        <label htmlFor="event-completed-checkbox" className="text-xs font-medium text-zinc-300 cursor-pointer select-none">
          Marcar como compromisso concluído / realizado
        </label>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
        <Button type="submit" variant="primary">
          {event ? 'Salvar alterações' : 'Criar evento'}
        </Button>
      </div>
    </form>
  )
}

export function EventModal({ event, onClose, onSave }: EventModalProps) {
  return (
    <Modal
      open={true}
      onClose={onClose}
      title={event ? 'Editar evento' : 'Novo evento'}
    >
      <EventForm
        event={event}
        onSubmit={(data) => {
          onSave(data)
          onClose()
        }}
      />
    </Modal>
  )
}