import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import type { LifeLogEntry } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/feedback'
import { SectionHeader } from '@/components/ui/primitives'
import { cn, fuzzyScore, shortDateTime } from '@/lib/utils'
import { usePendingDelete } from '@/lib/usePendingDelete'

function Mood({ value }: { value: LifeLogEntry['mood'] }) {
  return (
    <span className="flex shrink-0 gap-0.5" aria-label={`humor ${value}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            i <= value ? 'bg-emerald-400' : 'bg-zinc-700/70',
          )}
        />
      ))}
    </span>
  )
}

/** Diary entries: fuzzy search + tag filter + list with edit/delete. */
export function LogsSection({
  logs,
  onNew,
  onEdit,
  onRemove,
  className,
}: {
  logs: LifeLogEntry[]
  onNew: () => void
  onEdit: (entry: LifeLogEntry) => void
  onRemove: (id: string) => Promise<void> | void
  className?: string
}) {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const { pendingDelete, request } = usePendingDelete()

  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of logs) for (const t of l.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
    return counts
  }, [logs])

  const filtered = useMemo(() => {
    const base = activeTag ? logs.filter((l) => l.tags.includes(activeTag)) : logs
    const q = query.trim()
    if (!q) {
      return [...base].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return base
      .map((l) => ({
        l,
        score: Math.max(
          fuzzyScore(q, l.title),
          fuzzyScore(q, l.body),
          fuzzyScore(q, l.tags.join(' ')),
        ),
      }))
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score || b.l.createdAt.localeCompare(a.l.createdAt))
      .map((h) => h.l)
  }, [logs, query, activeTag])

  return (
    <section className={cn('space-y-3', className)}>
      <SectionHeader
        eyebrow="Anotações"
        title="Diário pessoal"
        action={
          <Button variant="primary" size="sm" onClick={onNew}>
            <Plus className="h-3.5 w-3.5" /> Nova anotação
          </Button>
        }
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          className="input-base pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por título, texto ou tag…"
          aria-label="Buscar anotações"
        />
      </div>

      {tagCounts.size > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTag(null)}
            className={cn(
              'chip transition-colors',
              !activeTag && 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
            )}
          >
            Todas
          </button>
          {[...tagCounts.entries()]
            .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
            .map(([tag, count]) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={cn(
                  'chip transition-colors',
                  activeTag === tag
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'hover:border-zinc-600 hover:text-zinc-200',
                )}
              >
                #{tag} <span className="font-num opacity-60">{count}</span>
              </button>
            ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-5 w-5" />}
          title={query || activeTag ? 'Nenhum resultado' : 'Sem anotações'}
          description={
            query || activeTag
              ? 'Tente outra palavra ou remova o filtro de tag.'
              : 'Registre o primeiro dia do seu diário.'
          }
          action={
            !query && !activeTag ? (
              <Button variant="primary" size="sm" onClick={onNew}>
                <Plus className="h-3.5 w-3.5" /> Nova anotação
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((l) => (
            <div key={l.id} className="card card-hover flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-100">{l.title}</p>
                  <p className="mt-0.5 font-num text-xs text-zinc-500">{shortDateTime(l.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon" aria-label="Editar anotação" onClick={() => onEdit(l)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {pendingDelete === l.id ? (
                    <Button variant="danger" size="sm" onClick={() => request(l.id, () => void onRemove(l.id))}>
                      Remover?
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir anotação"
                      onClick={() => request(l.id, () => void onRemove(l.id))}
                      className="hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {l.body && <p className="line-clamp-2 text-sm leading-relaxed text-zinc-400">{l.body}</p>}
              <div className="mt-auto flex items-center justify-between gap-2">
                <Mood value={l.mood} />
                <div className="flex flex-wrap justify-end gap-1">
                  {l.tags.map((t) => (
                    <span key={t} className="chip px-2 py-0.5 text-[10px]">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}