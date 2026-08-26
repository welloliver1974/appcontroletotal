import { useState, useMemo } from 'react'
import type { KeyboardEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  MoreHorizontal,
  Plus,
} from 'lucide-react'
import type { AgendaEvent } from '@/data/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

type ViewMode = 'month' | 'week' | 'list'

const CATEGORY_COLORS: Record<AgendaEvent['category'], string> = {
  reuniao: 'bg-blue-500 text-white',
  pessoal: 'bg-emerald-500 text-white',
  habit: 'bg-violet-500 text-white',
  viagem: 'bg-cyan-500 text-white',
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
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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

function DayCell({
  date,
  events,
  today,
  selectedDate,
  currentMonth,
  currentYear,
  onClick,
  onCreate,
}: {
  date: Date
  events: AgendaEvent[]
  today: string
  selectedDate: string | null
  currentMonth: number
  currentYear: number
  onClick: (date: Date) => void
  onCreate: (date: string) => void
}) {
  const dateStr = formatDate(date)
  const isToday = dateStr === today
  const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear
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
        'relative min-h-[56px] sm:min-h-[72px] md:min-h-[100px] w-full p-1 sm:p-1.5 md:p-2 transition-all flex flex-col items-center md:items-start rounded-xl border border-transparent',
        !isCurrentMonth && 'bg-zinc-950/30 text-zinc-600 opacity-40',
        isCurrentMonth && 'bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-200 border-zinc-800/40',
        isToday && 'border-rose-500/60 bg-rose-500/10 shadow-sm shadow-rose-500/20 font-bold',
        isSelected && 'border-indigo-500 bg-indigo-500/20 ring-1 ring-indigo-500',
      )}
    >
      <div className="flex items-center justify-between w-full">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
            isToday
              ? 'bg-rose-500 text-white'
              : isSelected
              ? 'bg-indigo-500 text-white'
              : isCurrentMonth
              ? 'text-zinc-200'
              : 'text-zinc-600',
          )}
        >
          {date.getDate()}
        </span>

        {/* Quick add button (desktop only) */}
        {isCurrentMonth && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCreate(dateStr)
            }}
            className="hidden md:flex h-5 w-5 rounded-full bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors items-center justify-center opacity-0 group-hover:opacity-100"
            aria-label="Adicionar evento"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Mobile Indicator Dots (clean, high-density, no squishing!) */}
      {dayEvents.length > 0 && (
        <div className="flex items-center justify-center gap-1 mt-1.5 md:hidden">
          {dayEvents.slice(0, 3).map((event, idx) => (
            <span
              key={idx}
              className={cn(
                'h-1.5 w-1.5 rounded-full shadow-sm',
                event.category === 'reuniao'
                  ? 'bg-blue-400'
                  : event.category === 'pessoal'
                  ? 'bg-emerald-400'
                  : event.category === 'viagem'
                  ? 'bg-cyan-400'
                  : 'bg-violet-400',
              )}
            />
          ))}
          {dayEvents.length > 3 && (
            <span className="h-1 w-1 rounded-full bg-zinc-400" />
          )}
        </div>
      )}

      {/* Desktop Detailed Pills */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden space-y-1 mt-1.5 w-full">
        {dayEvents.slice(0, 3).map((event) => (
          <div
            key={event.id}
            className={cn(
              'h-5 px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 shadow-sm',
              CATEGORY_COLORS[event.category],
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="font-mono text-[9px] opacity-80 shrink-0">{event.timeStart}</span>
            <span className="truncate">{event.title}</span>
          </div>
        ))}
        {dayEvents.length > 3 && (
          <div className="text-[9px] text-zinc-400 text-center font-medium">
            +{dayEvents.length - 3} mais
          </div>
        )}
      </div>
    </div>
  )
}

function WeekDayCell({
  date,
  events,
  today,
  selectedDate,
  onClick,
  onCreate,
}: {
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
  const dayEvents = events
    .filter((e) => e.date === dateStr)
    .sort((a, b) => a.timeStart.localeCompare(b.timeStart))

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="flex flex-col min-w-[130px] sm:min-w-[140px] md:min-w-0 md:flex-1 h-full rounded-2xl border border-zinc-800/80 bg-zinc-900/50 overflow-hidden">
      <button
        type="button"
        onClick={() => onClick(date)}
        className={cn(
          'p-2.5 text-center transition-colors border-b border-zinc-800/80 flex items-center justify-between md:flex-col md:justify-center',
          isToday
            ? 'bg-rose-500/15 text-rose-300 font-semibold'
            : 'text-zinc-300 hover:bg-zinc-800/50',
          isSelected && 'bg-indigo-500/20 text-indigo-200',
        )}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          {dayNames[date.getDay()]}
        </span>
        <span className={cn('text-sm md:text-base font-bold', isToday && 'text-rose-400')}>
          {date.getDate()}
        </span>
      </button>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[220px]">
        {dayEvents.map((event) => (
          <div
            key={event.id}
            className={cn(
              'p-2 rounded-xl text-xs cursor-pointer hover:opacity-90 shadow-md space-y-0.5',
              CATEGORY_COLORS[event.category],
            )}
            onClick={(e) => {
              e.stopPropagation()
              onClick(date)
            }}
          >
            <div className="flex items-center justify-between text-[10px] font-mono opacity-90">
              <span>{event.timeStart}</span>
              {event.timeEnd && <span>{event.timeEnd}</span>}
            </div>
            <div className="font-semibold text-xs leading-snug line-clamp-2">{event.title}</div>
            {event.location && (
              <div className="text-[10px] opacity-80 truncate flex items-center gap-1">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
        ))}
        {dayEvents.length === 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCreate(dateStr)
            }}
            className="w-full h-full min-h-[60px] flex flex-col items-center justify-center text-zinc-600 hover:text-zinc-400 border border-dashed border-zinc-800/60 rounded-xl transition-colors gap-1 py-4"
          >
            <Plus className="h-4 w-4 opacity-50" />
            <span className="text-[10px]">Livre</span>
          </button>
        )}
      </div>
    </div>
  )
}

function ListView({
  events,
  today,
  onEdit,
  onCreate,
}: {
  events: AgendaEvent[]
  today: string
  onEdit: (event: AgendaEvent) => void
  onCreate: () => void
}) {
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.timeStart.localeCompare(b.timeStart)
    })
  }, [events])

  if (sortedEvents.length === 0) {
    return (
      <Card className="p-8 text-center border-zinc-800 bg-zinc-900/50 space-y-3">
        <Calendar className="h-10 w-10 mx-auto text-zinc-600" />
        <h3 className="font-semibold text-sm text-zinc-200">Nenhum evento agendado</h3>
        <p className="text-zinc-500 text-xs">Crie seu primeiro compromisso tocando no botão abaixo.</p>
        <Button variant="primary" size="sm" onClick={onCreate} className="gap-1.5 text-xs bg-indigo-600">
          <Plus className="h-3.5 w-3.5" />
          <span>Novo Evento</span>
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-2.5">
      {sortedEvents.map((event) => {
        const isPast = event.date < today
        const isToday = event.date === today
        return (
          <div
            key={event.id}
            onClick={() => onEdit(event)}
            className={cn(
              'flex items-center justify-between p-3 sm:p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 transition-all cursor-pointer shadow-lg shadow-black/20 gap-3',
              isPast && 'opacity-60 bg-zinc-950/40',
              isToday && 'border-rose-500/40 bg-rose-950/15',
            )}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className={cn(
                  'h-10 w-10 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold',
                  isToday
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-zinc-800 text-zinc-300 border border-zinc-700',
                )}
              >
                <span className="text-[9px] uppercase tracking-tighter">
                  {new Date(event.date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).slice(0, 3)}
                </span>
                <span className="text-xs font-num font-bold leading-none">
                  {event.date.slice(8, 10)}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={cn('font-semibold text-xs truncate', event.completed ? 'line-through text-zinc-400' : 'text-zinc-100')}>
                    {event.title}
                  </h4>
                  {event.completed && (
                    <span className="chip text-[9px] py-0 px-1.5 rounded-md uppercase font-semibold bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      Concluído
                    </span>
                  )}
                  <span
                    className={cn(
                      'chip text-[9px] py-0 px-1.5 rounded-md uppercase font-semibold',
                      event.category === 'reuniao'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : event.category === 'pessoal'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : event.category === 'viagem'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        : 'bg-violet-500/20 text-violet-300 border-violet-500/30',
                    )}
                  >
                    {CATEGORY_LABELS[event.category]}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-zinc-500" />
                    {event.timeStart}
                    {event.timeEnd ? ` – ${event.timeEnd}` : ''}
                  </span>
                  {event.location && (
                    <span className="flex items-center gap-1 truncate max-w-[150px] sm:max-w-xs">
                      <MapPin className="h-3 w-3 text-zinc-500" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-zinc-200 shrink-0"
              aria-label="Editar"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        )
      })}
    </div>
  )
}

export function CalendarView({ events, onCreateEvent, onEditEvent }: CalendarViewProps) {
  const [view, setView] = useState<ViewMode>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const today = formatDate(new Date())
  const [selectedDate, setSelectedDate] = useState<string>(today)

  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate])
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate])

  const selectedDayEvents = useMemo(() => {
    return events
      .filter((e) => e.date === selectedDate)
      .sort((a, b) => a.timeStart.localeCompare(b.timeStart))
  }, [events, selectedDate])

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
    <div className="flex flex-col space-y-4">
      {/* Responsive Calendar Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('prev')}
            className="h-8 w-8 text-zinc-300 hover:text-white"
            aria-label="Período anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="text-center min-w-[140px] sm:min-w-[180px]">
            <p className="font-semibold text-sm sm:text-base text-zinc-100 capitalize">
              {view === 'month'
                ? currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                : `${weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`}
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('next')}
            className="h-8 w-8 text-zinc-300 hover:text-white"
            aria-label="Próximo período"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToday}
            className="h-8 px-2.5 text-xs text-zinc-300 hover:text-white border border-zinc-800"
          >
            Hoje
          </Button>

          {/* View mode switcher */}
          <div className="flex items-center gap-1 bg-zinc-950/80 rounded-xl p-1 border border-zinc-800/80">
            <button
              onClick={() => setView('month')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                view === 'month'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              Mês
            </button>
            <button
              onClick={() => setView('week')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                view === 'week'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              Semana
            </button>
            <button
              onClick={() => setView('list')}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                view === 'list'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200',
              )}
            >
              Lista
            </button>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onCreateEvent(selectedDate)}
            className="h-8 px-2.5 sm:px-3 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Novo Evento</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Calendar Grid / Content */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-2 sm:p-3 shadow-lg shadow-black/20">
        {view === 'month' && (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div
                  key={day}
                  className="text-center text-[10px] sm:text-xs text-zinc-500 py-1.5 font-bold uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((day) => (
                <DayCell
                  key={formatDate(day)}
                  date={day}
                  events={events}
                  today={today}
                  selectedDate={selectedDate}
                  currentMonth={currentDate.getMonth()}
                  currentYear={currentDate.getFullYear()}
                  onClick={(d) => setSelectedDate(formatDate(d))}
                  onCreate={onCreateEvent}
                />
              ))}
            </div>

            {/* Selected Day Agenda Drawer (Mobile-first friendly) */}
            <div className="mt-4 pt-4 border-t border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-rose-400" />
                  <span>
                    Compromissos de{' '}
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                    })}
                  </span>
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCreateEvent(selectedDate)}
                  className="h-7 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>Adicionar</span>
                </Button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-4 text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-zinc-800/40">
                  Nenhum compromisso marcado para este dia.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onEditEvent(ev)}
                      className="flex items-center justify-between p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/70 hover:border-zinc-700 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <span
                          className={cn(
                            'h-2.5 w-2.5 rounded-full shrink-0',
                            ev.category === 'reuniao'
                              ? 'bg-blue-400'
                              : ev.category === 'pessoal'
                              ? 'bg-emerald-400'
                              : ev.category === 'viagem'
                              ? 'bg-cyan-400'
                              : 'bg-violet-400',
                          )}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-100 truncate">{ev.title}</p>
                          <p className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span className="flex items-center gap-1 font-mono">
                              <Clock className="h-3 w-3 text-zinc-500" />
                              {ev.timeStart}
                              {ev.timeEnd ? ` – ${ev.timeEnd}` : ''}
                            </span>
                            {ev.location && <span className="truncate">📍 {ev.location}</span>}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md border border-zinc-800 text-zinc-400 capitalize shrink-0 ml-2">
                        {CATEGORY_LABELS[ev.category]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {view === 'week' && (
          <div className="overflow-x-auto pb-2 no-scrollbar">
            <div className="flex gap-2 min-w-[700px] md:min-w-full">
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
          </div>
        )}

        {view === 'list' && (
          <ListView
            events={events}
            today={today}
            onEdit={onEditEvent}
            onCreate={() => onCreateEvent(today)}
          />
        )}
      </div>
    </div>
  )
}
