import { Minus, PackageOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import type { PantryItem } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { cn, daysUntil } from '@/lib/utils'
import { usePendingDelete } from '@/lib/usePendingDelete'
import { isExpired, isExpiringSoon, isLow } from './despensaUtils'

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  bebidas: { bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', text: 'text-cyan-400', dot: 'bg-cyan-400' },
  alimentos: { bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400' },
  frescos: { bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  limpeza: { bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  higiene: { bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20', text: 'text-rose-400', dot: 'bg-rose-400' },
}

interface PantryListViewProps {
  items: PantryItem[]
  onEdit: (item: PantryItem) => void
  onRemove: (id: string) => Promise<void> | void
  onUpdateQty: (item: PantryItem, delta: number) => Promise<void> | void
}

export function PantryListView({ items, onEdit, onRemove, onUpdateQty }: PantryListViewProps) {
  const { pendingDelete, request } = usePendingDelete()

  return (
    <div className="card divide-y divide-zinc-800/60 overflow-hidden">
      {/* Header da Tabela (visível em desktop/tablet) */}
      <div className="hidden sm:grid sm:grid-cols-12 gap-3 px-4 py-2.5 bg-zinc-900/60 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
        <div className="col-span-4">Item & Categoria</div>
        <div className="col-span-3 text-center">Quantidade</div>
        <div className="col-span-3">Status</div>
        <div className="col-span-2 text-right">Ações</div>
      </div>

      {items.map((item) => {
        const low = isLow(item)
        const expired = isExpired(item)
        const expiring = isExpiringSoon(item, 7)
        const isNeeded = item.qty === 0
        const catStyle = CATEGORY_STYLES[item.category.toLowerCase()] || CATEGORY_STYLES.alimentos

        return (
          <div
            key={item.id}
            className={cn(
              'flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 px-4 py-3 items-start sm:items-center transition-colors hover:bg-zinc-800/30',
              isNeeded && 'bg-rose-500/[0.03]',
            )}
          >
            {/* 1. Nome e Categoria */}
            <div className="col-span-4 flex items-center gap-2.5 min-w-0 w-full">
              <span className={cn('h-8 w-8 rounded-lg shrink-0 flex items-center justify-center border', catStyle.bg)}>
                <PackageOpen className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-100 flex items-center gap-1.5">
                  {item.name}
                  {isNeeded && (
                    <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                  )}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] uppercase font-semibold text-zinc-500">
                    {item.category}
                  </span>
                  <span className="text-zinc-600 text-xs">·</span>
                  <span className="text-[11px] text-zinc-500 font-num">
                    mín. {item.lowThreshold} {item.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Stepper de Quantidade Rápido */}
            <div className="col-span-3 flex items-center justify-between sm:justify-center gap-2 w-full sm:w-auto">
              <span className="sm:hidden text-xs text-zinc-400">Estoque:</span>
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => onUpdateQty(item, -1)}
                  disabled={item.qty <= 0}
                  className="h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>

                <div className="min-w-[44px] text-center px-1">
                  <span
                    className={cn(
                      'font-display font-num text-sm font-semibold',
                      isNeeded
                        ? 'text-rose-400'
                        : low
                          ? 'text-amber-400'
                          : 'text-zinc-100',
                    )}
                  >
                    {item.qty}
                  </span>
                  <span className="text-[10px] text-zinc-500 ml-1">{item.unit}</span>
                </div>

                <button
                  type="button"
                  onClick={() => onUpdateQty(item, 1)}
                  className="h-7 w-7 flex items-center justify-center rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* 3. Status Badges */}
            <div className="col-span-3 flex flex-wrap items-center gap-1.5">
              {isNeeded ? (
                <span className="chip px-2 py-0.5 text-[10px] font-semibold bg-rose-500/15 text-rose-300 border-rose-500/30">
                  Falta comprar
                </span>
              ) : low ? (
                <span className="chip px-2 py-0.5 text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30">
                  Estoque baixo
                </span>
              ) : (
                <span className="chip px-2 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  OK
                </span>
              )}

              {expired ? (
                <span className="chip px-2 py-0.5 text-[10px] bg-rose-500/15 text-rose-300 border-rose-500/30">
                  Vencido
                </span>
              ) : expiring && item.expiresAt ? (
                <span className="chip px-2 py-0.5 text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30">
                  Vence em {daysUntil(item.expiresAt)}d
                </span>
              ) : item.expiresAt ? (
                <span className="chip px-2 py-0.5 text-[10px] text-zinc-500">
                  Validade: {daysUntil(item.expiresAt)}d
                </span>
              ) : null}
            </div>

            {/* 4. Ações */}
            <div className="col-span-2 flex items-center justify-end gap-1 w-full sm:w-auto mt-1 sm:mt-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-zinc-400 hover:text-zinc-200"
                onClick={() => onEdit(item)}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="hidden md:inline ml-1">Editar</span>
              </Button>

              {pendingDelete === item.id ? (
                <Button
                  variant="danger"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => request(item.id, () => void onRemove(item.id))}
                >
                  Confirmar?
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir item"
                  onClick={() => request(item.id, () => void onRemove(item.id))}
                  className="h-8 w-8 text-zinc-500 hover:text-rose-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
