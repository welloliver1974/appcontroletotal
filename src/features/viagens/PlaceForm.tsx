import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import type { Place } from '@/data/types'

export interface PlaceDraft {
  name: string
  where: string
  visited: boolean
  note?: string
}

/** Create/edit modal for a saved place (name, region, visited flag, optional note). */
export function PlaceForm({
  mode,
  place,
  onClose,
  onSubmit,
}: {
  mode: 'new' | 'edit'
  place?: Place
  onClose: () => void
  onSubmit: (draft: PlaceDraft) => Promise<void> | void
}) {
  const [name, setName] = useState(place?.name ?? '')
  const [where, setWhere] = useState(place?.where ?? '')
  const [visited, setVisited] = useState(place?.visited ?? false)
  const [note, setNote] = useState(place?.note ?? '')

  const invalid = !name.trim()

  const submit = () => {
    if (invalid) return
    void onSubmit({
      name: name.trim(),
      where: where.trim(),
      visited,
      note: note.trim() || undefined,
    })
  }

  return (
    <Modal open onClose={onClose} title={mode === 'edit' ? 'Editar lugar' : 'Novo lugar'}>
      <div className="space-y-4">
        <div>
          <label htmlFor="place-name" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Lugar
          </label>
          <input
            id="place-name"
            className="input-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex.: Jericoacoara"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="place-where" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Cidade / região
          </label>
          <input
            id="place-where"
            className="input-base"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="ex.: Ceará"
          />
        </div>

        <button
          type="button"
          onClick={() => setVisited((v) => !v)}
          className={cn(
            'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors',
            visited
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
              : 'border-zinc-800 bg-white/5 text-zinc-400 hover:bg-white/10',
          )}
        >
          <span>{visited ? 'Já visitei este lugar' : 'Ainda não visitei'}</span>
          <span className={cn('chip', visited ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30')}>
            {visited ? 'Visitado' : 'A visitar'}
          </span>
        </button>

        <div>
          <label htmlFor="place-note" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Nota <span className="text-zinc-600">(opcional)</span>
          </label>
          <input
            id="place-note"
            className="input-base"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ex.: melhor ir na seca"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={invalid}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}