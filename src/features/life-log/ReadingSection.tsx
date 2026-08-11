import { BookMarked, BookOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import type { ReadingEntry } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState, ProgressBar } from '@/components/ui/feedback'
import { IconTile } from '@/components/ui/primitives'
import { cn, shortDateTime } from '@/lib/utils'
import { usePendingDelete } from './useLifeLogData'

const EMERALD_SOFT = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'

/** Reading records: "Retome seu livro" hint + list with progress, edit/delete. */
export function ReadingSection({
  reading,
  onNew,
  onEdit,
  onRemove,
  className,
}: {
  reading: ReadingEntry[]
  onNew: () => void
  onEdit: (entry: ReadingEntry) => void
  onRemove: (id: string) => Promise<void> | void
  className?: string
}) {
  const { pendingDelete, request } = usePendingDelete()

  const lendo = [...reading.filter((r) => r.status === 'lendo')].sort(
    (a, b) => b.progress - a.progress || b.updatedAt.localeCompare(a.updatedAt),
  )
  const encerrado = reading
    .filter((r) => r.status === 'encerrado')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const resume = lendo.slice(0, 3)

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title="Leitura"
        subtitle={`${lendo.length} em andamento · ${encerrado.length} concluídas`}
        action={
          <Button variant="soft" size="sm" onClick={onNew}>
            <Plus className="h-3.5 w-3.5" /> Nova
          </Button>
        }
      />

      {reading.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<BookOpen className="h-5 w-5" />}
            title="Nenhuma leitura"
            description="Adicione um livro para acompanhar o progresso."
            action={
              <Button variant="primary" size="sm" onClick={onNew}>
                <Plus className="h-3.5 w-3.5" /> Nova leitura
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {resume.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.06] p-4">
              <p className="eyebrow mb-2 text-emerald-400">Retome seu livro</p>
              <div className="space-y-3">
                {resume.map((r) => (
                  <div key={r.id}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <p className="truncate font-medium text-zinc-100">{r.title}</p>
                      <span className="font-num shrink-0 text-xs text-emerald-400">{r.progress}%</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {r.author} · <span className="font-num">{shortDateTime(r.updatedAt)}</span>
                    </p>
                    <ProgressBar value={r.progress} tone="emerald" className="mt-2" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="divide-y divide-zinc-800/70">
            {[...lendo, ...encerrado].map((r) => (
              <div key={r.id} className="flex items-start gap-3 py-3">
                <IconTile icon={BookMarked} size="sm" className={EMERALD_SOFT} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-zinc-100">{r.title}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="icon" aria-label="Editar leitura" onClick={() => onEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {pendingDelete === r.id ? (
                        <Button variant="danger" size="sm" onClick={() => request(r.id, () => void onRemove(r.id))}>
                          Remover?
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir leitura"
                          onClick={() => request(r.id, () => void onRemove(r.id))}
                          className="hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {r.author}
                    {r.note ? ` · ${r.note}` : ''}
                  </p>
                  {r.status === 'lendo' ? (
                    <div className="mt-2 flex items-center gap-2">
                      <ProgressBar value={r.progress} tone="emerald" className="flex-1" />
                      <span className="font-num text-xs text-zinc-500">{r.progress}%</span>
                    </div>
                  ) : (
                    <span className="chip mt-2 px-2 py-0.5 text-[10px]">concluído · 100%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}