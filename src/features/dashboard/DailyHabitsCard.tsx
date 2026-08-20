import { useEffect, useState } from 'react'
import { Check, ListTodo, Plus, Trash2, X } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/feedback'
import { api } from '@/data/api'
import { toast } from '@/stores/toastStore'
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
        if (Array.isArray(res)) {
          setHabits(res.sort((a, b) => (a.order || 0) - (b.order || 0)))
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar hábitos:', err)
      })
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
    toast.success('Hábito adicionado à rotina!')
  }

  const handleRemoveHabit = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id))
    try {
      await api.remove<DailyHabit>('habits', id)
      toast.success('Hábito removido 🗑️')
    } catch (err) {
      console.error('Erro ao remover hábito:', err)
    }
  }

  const completedCount = habits.filter((h) => (h.completedDates || []).includes(today)).length
  const progress = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0

  if (loading) return null

  return (
    <Card className="p-3.5 sm:p-4 space-y-3 sm:space-y-3.5 border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20 w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ListTodo className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 truncate">
              Rotina & Hábitos de Hoje
            </h4>
            <p className="text-[11px] text-zinc-500 truncate">
              {completedCount} de {habits.length} concluídos ({progress}%)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdding(!adding)}
          className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Novo</span>
        </button>
      </div>

      {/* Barra de Progresso */}
      <ProgressBar value={progress} tone={progress === 100 ? 'emerald' : 'emerald'} />

      {/* Formulário Rápido de Novo Hábito */}
      {adding && (
        <form onSubmit={handleAddHabit} className="flex items-center gap-1.5 pt-1 w-full min-w-0">
          <input
            type="text"
            autoFocus
            placeholder="Ex.: Meditação 10 min, Tomar creatina..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="input-base h-8 text-xs flex-1 min-w-0"
          />
          <Button variant="primary" size="sm" type="submit" className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 shrink-0">
            Salvar
          </Button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Lista de Hábitos */}
      {habits.length === 0 ? (
        <p className="py-3 text-center text-xs text-zinc-500 break-words px-2">
          Nenhum hábito cadastrado. Toque em <span className="text-emerald-400 font-semibold">+ Novo</span> para criar sua rotina diária.
        </p>
      ) : (
        <div className="space-y-1.5 w-full min-w-0">
          {habits.map((habit) => {
            const isDone = (habit.completedDates || []).includes(today)

            return (
              <div
                key={habit.id}
                className={cn(
                  'group flex items-center justify-between p-2 sm:p-2.5 rounded-xl border transition-all min-w-0 w-full overflow-hidden',
                  isDone
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-300'
                    : 'bg-zinc-900/80 border-zinc-800/80 hover:border-zinc-700 text-zinc-100',
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleHabit(habit)}
                  className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 text-left overflow-hidden"
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
                      'text-xs font-medium truncate min-w-0 flex-1',
                      isDone && 'line-through text-zinc-500',
                    )}
                  >
                    {habit.title}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRemoveHabit(habit.id)}
                  className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-rose-400 p-1 shrink-0 ml-1"
                  title="Excluir hábito"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
