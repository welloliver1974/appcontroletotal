import { Check, MapPin, Pencil, Trash2, Undo2 } from 'lucide-react'
import type { Place } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { IconTile } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'
import { usePendingDelete } from '@/lib/usePendingDelete'

const CYAN_SOFT = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
const EMERALD_SOFT = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'

/** One saved place: visited toggle + edit/delete. Visited state is accent-driven. */
export function PlaceCard({
  place,
  onToggle,
  onEdit,
  onRemove,
}: {
  place: Place
  onToggle: () => void
  onEdit: () => void
  onRemove: (id: string) => void
}) {
  const { pendingDelete, request } = usePendingDelete()

  return (
    <div className="card flex items-center gap-3 p-3">
      <IconTile
        icon={place.visited ? Check : MapPin}
        size="sm"
        className={place.visited ? EMERALD_SOFT : CYAN_SOFT}
      />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-medium', place.visited ? 'text-zinc-500' : 'text-zinc-100')}>
          {place.name}
        </p>
        <p className="truncate text-[11px] text-zinc-500">
          {place.where}
          {place.note ? ` · ${place.note}` : ''}
        </p>
      </div>
      <Button
        variant={place.visited ? 'ghost' : 'soft'}
        size="sm"
        className="h-7 shrink-0 px-2 text-[11px]"
        onClick={onToggle}
        title={place.visited ? 'Marcar como a visitar' : 'Marcar como visitado'}
      >
        {place.visited ? <Undo2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        {place.visited ? 'Desfazer' : 'Visitei'}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Editar lugar"
        onClick={onEdit}
        className="h-7 w-7 shrink-0 hover:text-cyan-300"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      {pendingDelete === place.id ? (
        <Button
          variant="danger"
          size="sm"
          className="h-7 shrink-0 px-2 text-[11px]"
          onClick={() => request(place.id, () => void onRemove(place.id))}
        >
          Remover?
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          aria-label="Excluir lugar"
          onClick={() => request(place.id, () => void onRemove(place.id))}
          className="h-7 w-7 shrink-0 hover:text-rose-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}