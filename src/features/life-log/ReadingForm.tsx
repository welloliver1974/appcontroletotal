import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import type { ReadingEntry, ReadingStatus } from '@/data/types'
import { clampProgress, parseTags } from './logUtils'

export interface ReadingDraft {
  title: string
  author: string
  status: ReadingStatus
  progress: number
  note: string
  tags: string[]
}

/** Create/edit modal for a reading record (title, author, status, progress, note, tags). */
export function ReadingForm({
  mode,
  entry,
  onClose,
  onSubmit,
}: {
  mode: 'new' | 'edit'
  entry?: ReadingEntry
  onClose: () => void
  onSubmit: (draft: ReadingDraft) => Promise<void> | void
}) {
  const [title, setTitle] = useState(entry?.title ?? '')
  const [author, setAuthor] = useState(entry?.author ?? '')
  const [status, setStatus] = useState<ReadingStatus>(entry?.status ?? 'lendo')
  const [progress, setProgress] = useState(entry?.progress ?? 0)
  const [note, setNote] = useState(entry?.note ?? '')
  const [tagsRaw, setTagsRaw] = useState(entry?.tags.join(', ') ?? '')

  const changeStatus = (s: ReadingStatus) => {
    setStatus(s)
    if (s === 'encerrado') setProgress(100)
  }

  const submit = () => {
    if (!title.trim()) return
    void onSubmit({
      title: title.trim(),
      author: author.trim(),
      status,
      progress: clampProgress(progress),
      note: note.trim(),
      tags: parseTags(tagsRaw),
    })
  }

  return (
    <Modal open onClose={onClose} title={mode === 'edit' ? 'Editar leitura' : 'Nova leitura'}>
      <div className="space-y-4">
        <div>
          <label htmlFor="reading-title" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Livro
          </label>
          <input
            id="reading-title"
            className="input-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do livro"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="reading-author" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Autor <span className="text-zinc-600">(opcional)</span>
          </label>
          <input
            id="reading-author"
            className="input-base"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Nome do autor"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Status</span>
          <div className="flex items-center gap-2">
            {(['lendo', 'encerrado'] as ReadingStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => changeStatus(s)}
                className={cn(
                  'flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-colors',
                  s === status
                    ? s === 'lendo'
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                      : 'border-zinc-600 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-800 bg-white/5 text-zinc-500 hover:bg-white/10',
                )}
              >
                {s === 'lendo' ? 'Lendo' : 'Encerrado'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">
            Progresso — <span className="font-num text-emerald-400">{progress}%</span>
          </span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(clampProgress(Number(e.target.value)))}
              className="h-2 w-full accent-emerald-500"
              aria-label="Progresso"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number.parseInt(e.target.value, 10) || 0)}
              className="input-base w-20 text-center font-num"
              aria-label="Progresso em porcentagem"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reading-note" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Nota <span className="text-zinc-600">(opcional)</span>
          </label>
          <textarea
            id="reading-note"
            className="input-base min-h-20 resize-y"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Fichamento, destaques, impressões…"
          />
        </div>

        <div>
          <label htmlFor="reading-tags" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Tags <span className="text-zinc-600">(separadas por vírgula)</span>
          </label>
          <input
            id="reading-tags"
            className="input-base"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="ex.: foco, produtividade"
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