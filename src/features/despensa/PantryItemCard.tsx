import { PackageOpen, Pencil, Trash2 } from 'lucide-react'
import type { PantryItem } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/feedback'
import { cn, daysUntil, formatBRL } from '@/lib/utils'
import { usePendingDelete } from '@/lib/usePendingDelete'
import { isExpired, isExpiringSoon, isLow, stockRatio } from './despensaUtils'

const PURPLE_SOFT = 'bg-purple-500/15 text-purple-300 border-purple-500/30'
const ROSE_CHIP = 'bg-rose-500/15 text-rose-300 border-rose-500/30'
const AMBER_CHIP = 'bg-amber-500/15 text-amber-300 border-amber-500/30'

const iconTile = 'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border'

/** One pantry item: qty highlight, stock bar (rose when low/expired), status badges, edit/delete. */
export function PantryItemCard({
  item,
  onEdit,
  onRemove,
}: {
  item: PantryItem
  onEdit: () => void
  onRemove: (id: string) => Promise<void> | void
}) {
  const { pendingDelete, request } = usePendingDelete()
  const low = isLow(item)
  const expired = isExpired(item)
  const expiring = isExpiringSoon(item, 7)
  const tone = low || expired ? 'rose' : 'emerald'

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className={cn(iconTile, PURPLE_SOFT)}>
          <PackageOpen className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">{item.name}</p>
        <span className="chip px-2 py-0.5 text-[10px] text-purple-300">{item.category}</span>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display font-num text-3xl leading-none tracking-tight text-zinc-50">
              {item.qty}
            </span>
            <span className="text-xs text-zinc-500">{item.unit}</span>
          </div>
          {item.price !== undefined && item.price > 0 && (
            <span className="text-xs font-semibold font-num text-emerald-400">
              {formatBRL(item.price)}
            </span>
          )}
        </div>
        <ProgressBar value={stockRatio(item)} tone={tone} />
        {low && (
          <p className="mt-1.5 text-[11px] text-rose-300">
            mínimo <span className="font-num">{item.lowThreshold}</span> {item.unit}
          </p>
        )}
      </div>

      <div className="mt-auto flex min-h-6 flex-wrap items-center gap-1.5">
        {low && <span className={cn('chip px-2 py-0.5 text-[10px]', ROSE_CHIP)}>Estoque baixo</span>}
        {expired ? (
          <span className={cn('chip px-2 py-0.5 text-[10px]', ROSE_CHIP)}>Vencido</span>
        ) : expiring && item.expiresAt ? (
          <span className={cn('chip px-2 py-0.5 text-[10px]', AMBER_CHIP)}>
            Vence em {daysUntil(item.expiresAt)}d
          </span>
        ) : item.expiresAt ? (
          <span className="chip px-2 py-0.5 text-[10px] text-zinc-500">
            Vence {daysUntil(item.expiresAt) >= 0 ? `em ${daysUntil(item.expiresAt)}d` : 'hoje'}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-1 border-t border-zinc-800/70 pt-2">
        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" /> Editar
        </Button>
        {pendingDelete === item.id ? (
          <Button
            variant="danger"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={() => request(item.id, () => void onRemove(item.id))}
          >
            Remover?
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Excluir item"
            onClick={() => request(item.id, () => void onRemove(item.id))}
            className="h-7 w-7 hover:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}