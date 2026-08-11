import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import type { LifeLogEntry } from '@/data/types'
import { MOOD_LABEL, MOODS, parseTags } from './logUtils'

export interface LogDraft {
  title: string
  body: string
  mood: LifeLogEntry['mood']
  tags: string[]
}

/** Create/edit modal for a diary entry (title, body, mood, tags). */
export function LogEntryForm({
  mode,
  entry,
  onClose,
  onSubmit,
}: {
  mode: 'new' | 'edit'
  entry?: LifeLogEntry
  onClose: () => void
  onSubmit: (draft: LogDraft) => Promise<void> | void
}) {
  const [title, setTitle] = useState(entry?.title ?? '')
  const [body, setBody] = useState(entry?.body ?? '')
  const [tagsRaw, setTagsRaw] = useState(entry?.tags.join(', ') ?? '')
  const [mood, setMood] = useState<LifeLogEntry['mood']>(entry?.mood ?? 3)

  const submit = () => {
    if (!title.trim()) return
    void onSubmit({ title: title.trim(), body: body.trim(), mood, tags: parseTags(tagsRaw) })
  }

  return (
    <Modal open onClose={onClose} title={mode === 'edit' ? 'Editar anotação' : 'Nova anotação'}>
      <div className="space-y-4">
        <div>
          <label htmlFor="log-title" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Título
          </label>
          <input
            id="log-title"
            className="input-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="O que aconteceu?"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="log-body" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Como foi <span className="text-zinc-600">(opcional)</span>
          </label>
          <textarea
            id="log-body"
            className="input-base min-h-28 resize-y"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Detalhes, sensações, aprendizados…"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">
            Mood — <span className="text-emerald-400">{MOOD_LABEL[mood]}</span>
          </span>
          <div className="flex items-center gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                aria-label={MOOD_LABEL[m]}
                onClick={() => setMood(m)}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold transition-colors',
                  m === mood
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-zinc-800 bg-white/5 text-zinc-500 hover:bg-white/10',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="log-tags" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Tags <span className="text-zinc-600">(separadas por vírgula)</span>
          </label>
          <input
            id="log-tags"
            className="input-base"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="ex.: saude, treino"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={!title.trim()}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}