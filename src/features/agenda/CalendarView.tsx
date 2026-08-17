import { useState, useMemo } from 'react'
import type { KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, Tag, MoreHorizontal } from 'lucide-react'
import type { AgendaEvent } from '@/data/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type ViewMode = 'month' | 'week' | 'list'

const CATEGORY_COLORS: Record<AgendaEvent['category'], string> = {
  reuniao: 'bg-blue-500',
  pessoal: 'bg-emerald-500',
  habit: 'bg-violet-500',
  viagem: 'bg-cyan-500',
}

const CATEGORY_LABELS: Record<AgendaEvent['category'], string> = {
  reuniao: 'Reunião',
  pessoal: 'Pessoal',
  habit: 'Hábito',
  viagem: 'Viagem',
}

interface CalendarViewProps {
  events: AgendaEvent[]
  onCreateEvent: (date?: string) => void
  onEditEvent: (event: AgendaEvent) => void
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getMonthDays(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDay = firstDay.getDay()

  const days: Date[] = []
  // Previous month days
  for (let i = startingDay - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i))
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i))
  }
  // Next month days to fill grid
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month, daysInMonth + days.length - startingDay + 1))
  }
  return days
}

function getWeekDays(date: Date): Date[] {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - day + 1)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }
  return days
}

function DayCell({ date, events, today, selectedDate, onClick, onCreate }: {
  date: Date
  events: AgendaEvent[]
  today: string
  selectedDate: string | null
  onClick: (date: Date) => void
  onCreate: (date: string) => void
}) {
  const dateStr = formatDate(date)
  const isToday = dateStr === today
  const isCurrentMonth = date.getMonth() === new Date().getMonth()
  const isSelected = dateStr === selectedDate
  const dayEvents = events.filter((e) => e.date === dateStr)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onClick(date)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(date)}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative h-24 w-full p-2 transition-all flex flex-col',
        !isCurrentMonth && 'bg-zinc-900/50 text-zinc-500',
        isCurrentMonth && 'hover:bg-zinc-800/50',
        isToday && 'ring-2 ring-rose-500/50',
        isSelected && 'bg-rose-500/10',
      )}
    >
      <span className={cn(
        'text-sm font-medium',
        isToday ? 'text-rose-400' : isCurrentMonth ? 'text-zinc-100' : 'text-zinc-500'
      )}>
        {date.getDate()}
      </span>
      <div className="flex-1 overflow-hidden space-y-1 mt-1">
        {dayEvents.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className={cn(
              'h-5 px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1',
              CATEGORY_COLORS[event.category]
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-900/50" />
            {event.timeStart} {event.title}
          </div>
        ))}
        {dayEvents.length > 3 && (
          <div className="text-[10px] text-zinc-500 text-center pt-0.5">
            +{dayEvents.length - 3} mais
          </div>
        )}
      </div>
      {isCurrentMonth && !isToday && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onCreate(dateStr); }}
          className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors flex items-center justify-center"
          aria-label="Adicionar evento"
        >
          <Calendar className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

function WeekDayCell({ date, events, today, selectedDate, onClick, onCreate }: {
  date: Date
  events: AgendaEvent[]
  today: string
  selectedDate: string | null
  onClick: (date: Date) => void
  onCreate: (date: string) => void
}) {
  const dateStr = formatDate(date)
  const isToday = dateStr === today
  const isSelected = dateStr === selectedDate
  const dayEvents = events.filter((e) => e.date === dateStr).sort((a, b) => a.timeStart.localeCompare(b.timeStart))

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="flex flex-col h-full">
      <button
        type="button"
        onClick={() => onClick(date)}
        className={cn(
          'px-3 py-2 text-center transition-colors',
          isToday ? 'bg-rose-500/10 text-rose-400 font-semibold' : 'text-zinc-300 hover:bg-zinc-800/50',
          isSelected && 'bg-rose-500/10'
        )}
      >
        <div className="text-xs text-zinc-500 uppercase">{dayNames[date.getDay()]}</div>
        <div className={cn('text-lg font-medium', isToday && 'text-rose-400')}>{date.getDate()}</div>
      </button>
      <div className="flex-1 overflow-y-auto p-1 space-y-1 border-l border-zinc-800">
        {dayEvents.map((event) => (
          <div
            key={event.id}
            className={cn(
              'px-2 py-1.5 rounded-r-lg text-xs cursor-pointer hover:opacity-80',
              CATEGORY_COLORS[event.category]
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <span className="font-medium">{event.timeStart}</span>
              {event.timeEnd && <span className="text-zinc-200/70">–{event.timeEnd}</span>}
            </div>
            <div className="font-medium truncate">{event.title}</div>
            {event.location && <div className="text-[10px] opacity-80 truncate">{event.location}</div>}
          </div>
        ))}
        {dayEvents.length === 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCreate(dateStr); }}
            className="w-full h-full flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <Calendar className="h-4 w-4 opacity-50" />
          </button>
        )}
      </div>
    </div>
  )
}

function ListView({ events, today, onEdit }: {
  events: AgendaEvent[]
  today: string
  onEdit: (event: AgendaEvent) => void
}) {
  const sortedEvents = useMemo(() => [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.timeStart.localeCompare(b.timeStart)
  }), [events])

  if (sortedEvents.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Calendar className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
        <h3 className="font-medium text-zinc-100 mb-1">Nenhum evento</h3>
        <p className="text-zinc-500 text-sm">Crie seu primeiro evento clicando no +</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {sortedEvents.map((event) => {
        const isPast = event.date < today
        return (
          <Card
            key={event.id}
            className={cn(
              'flex items-center gap-4 p-4 transition-colors hover:bg-zinc-800/50',
              isPast && 'opacity-60'
            )}
          >
            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0', CATEGORY_COLORS[event.category])}>
              <Tag className="h-5 w-5 text-zinc-900" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-zinc-100 truncate">{event.title}</h4>
                <span className={cn('chip text-[10px]', CATEGORY_COLORS[event.category].replace('bg-', 'bg-').replace('500', '500/20'), 'text-zinc-100')}>
                  {CATEGORY_LABELS[event.category]}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(event.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {event.timeStart}{event.timeEnd ? ` – ${event.timeEnd}` : ''}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => onEdit(event)} aria-label="Editar">
                <MoreHorizontal className="h-4 w-4 rotate-90" />
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export function CalendarView({ events, onCreateEvent, onEditEvent }: CalendarViewProps) {
  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const today = formatDate(new Date())

  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate])
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  const navigate = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (view === 'month') {
        d.setMonth(d.getMonth() + (direction === 'next' ? 1 : -1))
      } else {
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7))
      }
      return d
    })
  }

  const goToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(today)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with navigation */}
      <div className="flex items-center justify-between gap-4 p-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('prev')} aria-label="Período anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center min-w-[180px]">
            <p className="font-display text-lg font-semibold text-zinc-100">
              {view === 'month'
                ? currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                : `${weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} – ${weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
            </p>
            <p className="text-xs text-zinc-500">{view === 'month' ? 'Visão mensal' : view === 'week' ? 'Visão semanal' : 'Lista'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate('next')} aria-label="Próximo período">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={goToday}>
            Hoje
          </Button>
          <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
            {(['month', 'week', 'list'] as ViewMode[]).map((v) => (
              <Button
                key={v}
                variant={view === v ? 'primary' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setView(v)}
              >
                {v === 'month' && <Calendar className="h-4 w-4" />}
                {v === 'week' && <Calendar className="h-4 w-4" />}
                {v === 'list' && <Calendar className="h-4 w-4" />}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {view === 'month' && (
          <div className="grid grid-cols-7 gap-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
              <div key={day} className="text-center text-xs text-zinc-500 py-2 font-medium uppercase">
                {day}
              </div>
            ))}
            {monthDays.map((day) => (
              <DayCell
                key={day.toISOString()}
                date={day}
                events={events}
                today={today}
                selectedDate={selectedDate}
                onClick={(d) => setSelectedDate(formatDate(d))}
                onCreate={onCreateEvent}
              />
            ))}
          </div>
        )}

        {view === 'week' && (
          <div className="grid grid-cols-7 gap-1 h-[calc(100vh-300px)] min-h-[500px]">
            {weekDays.map((day) => (
              <WeekDayCell
                key={day.toISOString()}
                date={day}
                events={events}
                today={today}
                selectedDate={selectedDate}
                onClick={(d) => setSelectedDate(formatDate(d))}
                onCreate={onCreateEvent}
              />
            ))}
          </div>
        )}

        {view === 'list' && (
          <ListView
            events={events}
            today={today}
            onEdit={onEditEvent}
          />
        )}
      </div>
    </div>
  )
}
