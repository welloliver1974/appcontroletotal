import { useEffect, useState } from 'react'
import { Check, ListTodo, Plus, Trash2, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/feedback'
import { api } from '@/data/api'
import { cn } from '@/lib/utils'
import type { DailyHabit } from '@/data/types'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function DailyHabitsCard() {
  const [habits, setHabits] = useState<DailyHabit[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)

  const today = todayIso()

  useEffect(() => {
    api
      .list<DailyHabit>('habits')
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setHabits(res.sort((a, b) => (a.order || 0) - (b.order || 0)))
        } else {
          // Default habits
          setHabits([
            { id: 'hb-1', title: 'Tomar 2L de água', icon: '💧', completedDates: [today], order: 1 },
            { id: 'hb-2', title: 'Treino / Exercício físico 30 min', icon: '🏃', completedDates: [today], order: 2 },
            { id: 'hb-3', title: 'Leitura de 15 páginas', icon: '📖', completedDates: [], order: 3 },
            { id: 'hb-4', title: 'Revisar agenda e prioridades', icon: '🎯', completedDates: [today], order: 4 },
          ])
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [today])

  const toggleHabit = async (habit: DailyHabit) => {
    const isDone = (habit.completedDates || []).includes(today)
    const nextDates = isDone
      ? habit.completedDates.filter((d) => d !== today)
      : [...(habit.completedDates || []), today]

    const updated = { ...habit, completedDates: nextDates }
    setHabits((prev) => prev.map((h) => (h.id === habit.id ? updated : h)))
    await api.update<DailyHabit>('habits', habit.id, { completedDates: nextDates }).catch(() => {})
  }

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    const newHabit: Omit<DailyHabit, 'id'> = {
      title: newTitle.trim(),
      icon: '✨',
      completedDates: [],
      order: habits.length + 1,
    }

    const created = await api.create<DailyHabit>('habits', newHabit).catch(() => ({
      ...newHabit,
      id: `hb-${Date.now()}`,
    }))

    setHabits((prev) => [...prev, created])
    setNewTitle('')
    setAdding(false)
  }

  const handleRemoveHabit = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id))
    await api.remove<DailyHabit>('habits', id).catch(() => {})
  }

  const completedCount = habits.filter((h) => (h.completedDates || []).includes(today)).length
  const progress = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0

  if (loading) return null

  return (
    <Card className="p-4 space-y-3.5 border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ListTodo className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Rotina & Hábitos de Hoje
            </h4>
            <p className="text-[11px] text-zinc-500">
              {completedCount} de {habits.length} concluídos ({progress}%)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Novo</span>
        </button>
      </div>

      {/* Barra de Progresso */}
      <ProgressBar value={progress} tone={progress === 100 ? 'emerald' : 'emerald'} />

      {/* Formulário Rápido de Novo Hábito */}
      {adding && (
        <form onSubmit={handleAddHabit} className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            autoFocus
            placeholder="Ex.: Meditação 10 min, Tomar creatina..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="input-base h-8 text-xs flex-1"
          />
          <Button variant="primary" size="sm" type="submit" className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500">
            Salvar
          </Button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Lista de Hábitos */}
      <div className="space-y-1.5">
        {habits.map((habit) => {
          const isDone = (habit.completedDates || []).includes(today)

          return (
            <div
              key={habit.id}
              className={cn(
                'group flex items-center justify-between p-2.5 rounded-xl border transition-all',
                isDone
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-300'
                  : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700 text-zinc-100',
              )}
            >
              <button
                type="button"
                onClick={() => toggleHabit(habit)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
              >
                <span
                  className={cn(
                    'h-5 w-5 rounded-lg flex items-center justify-center border transition-colors shrink-0',
                    isDone
                      ? 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-sm'
                      : 'border-zinc-700 bg-zinc-800 group-hover:border-zinc-600',
                  )}
                >
                  {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </span>

                <span className="text-xs shrink-0">{habit.icon || '🎯'}</span>

                <span
                  className={cn(
                    'text-xs font-medium truncate',
                    isDone && 'line-through text-zinc-500',
                  )}
                >
                  {habit.title}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleRemoveHabit(habit.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-rose-400 p-1"
                title="Excluir hábito"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
