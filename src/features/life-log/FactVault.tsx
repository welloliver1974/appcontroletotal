import { useState, type FormEvent } from 'react'
import { Plus, Quote, Trash2, SquarePlay } from 'lucide-react'
import type { Fact } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { IconTile } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { parseTags } from './logUtils'
import { usePendingDelete } from '@/lib/usePendingDelete'

export interface FactDraft {
  content: string
  source: string
  tags: string[]
}

const EMERALD_SOFT = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'

/** Fact vault: compact grid, inline add, delete (no editing). */
export function FactVault({
  facts,
  onAdd,
  onRemove,
  onConvertToMedia,
  className,
}: {
  facts: Fact[]
  onAdd: (draft: FactDraft) => Promise<void> | void
  onRemove: (id: string) => Promise<void> | void
  onConvertToMedia?: (fact: Fact) => Promise<void> | void
  className?: string
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [content, setContent] = useState('')
  const [source, setSource] = useState('')
  const [tagsRaw, setTagsRaw] = useState('')
  const { pendingDelete, request } = usePendingDelete()

  const submitAdd = (e: FormEvent) => {
    e.preventDefault()
    const text = content.trim()
    if (!text) return
    void onAdd({ content: text, source: source.trim(), tags: parseTags(tagsRaw) })
    setContent('')
    setSource('')
    setTagsRaw('')
    setShowAdd(false)
  }

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        title="Cofre de Fatos"
        subtitle={`${facts.length} salvos`}
        action={
          <Button variant="soft" size="sm" onClick={() => setShowAdd((s) => !s)}>
            <Plus className="h-3.5 w-3.5" /> {showAdd ? 'Cancelar' : 'Adicionar'}
          </Button>
        }
      />

      <div className="p-4">
        {showAdd && (
          <form
            onSubmit={submitAdd}
            className="mb-3 space-y-2 rounded-2xl border border-emerald-500/30 bg-white/[0.02] p-3"
          >
            <textarea
              className="input-base min-h-20 resize-y"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O que você não quer esquecer?"
              autoFocus
            />
            <div className="flex flex-wrap gap-2">
              <input
                className="input-base flex-1"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Fonte (manual, observação…)"
                aria-label="Fonte"
              />
              <input
                className="input-base flex-1"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="Tags separadas por vírgula"
                aria-label="Tags"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" type="submit" disabled={!content.trim()}>
                Salvar fato
              </Button>
            </div>
          </form>
        )}

        {facts.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">
            Nenhum fato salvo. Use o cofre para lembretes rápidos que não devem cair no esquecimento.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {facts.map((f) => {
              const hasUrl = /(?:https?:\/\/|(?:www\.)?(?:youtu\.be|youtube\.com|instagram\.com))\S+/i.test(f.content)
              return (
                <div key={f.id} className="card card-hover flex flex-col gap-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <IconTile icon={Quote} size="sm" className={EMERALD_SOFT} />
                    <div className="flex items-center gap-1">
                      {hasUrl && onConvertToMedia && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                          onClick={() => void onConvertToMedia(f)}
                          title="Mover para Artigos & Mídias"
                        >
                          <SquarePlay className="h-3.5 w-3.5" /> Mover p/ Mídias
                        </Button>
                      )}
                      {pendingDelete === f.id ? (
                        <Button variant="danger" size="sm" onClick={() => request(f.id, () => void onRemove(f.id))}>
                          Remover?
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir fato"
                          onClick={() => request(f.id, () => void onRemove(f.id))}
                          className="hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="line-clamp-3 text-sm leading-relaxed text-zinc-300 break-words">{f.content}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-1">
                    {f.source && <span className="chip px-2 py-0.5 text-[10px]">{f.source}</span>}
                    {f.tags.map((t) => (
                      <span key={t} className="chip px-2 py-0.5 text-[10px]">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}