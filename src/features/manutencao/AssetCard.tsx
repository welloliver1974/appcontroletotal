import { CalendarDays, CheckCircle2, Coins, Gauge, Pencil, Plus, Trash2, TriangleAlert } from 'lucide-react'
import type { Asset, MaintenanceRecord } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/feedback'
import { IconTile } from '@/components/ui/primitives'
import { formatBRL, relativeDayLabel, shortDate } from '@/lib/utils'
import { usePendingDelete } from '@/lib/usePendingDelete'
import { cn } from '@/lib/utils'
import { CATEGORY, isOverdue, recordsFor, spentFor } from './maintUtils'
import { calculateVehiclePredictiveStats } from './predictiveMaint'

const ORANGE_SOFT = 'bg-orange-500/15 text-orange-300 border-orange-500/30'

/** One asset: life bar, next maintenance urgency, spent, edit/delete + new record. */
export function AssetCard({
  asset,
  records,
  selected,
  onSelect,
  onEdit,
  onRemove,
  onNewRecord,
}: {
  asset: Asset
  records: MaintenanceRecord[]
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onRemove: (id: string) => Promise<void> | void
  onNewRecord: () => void
}) {
  const { pendingDelete, request } = usePendingDelete()
  const cat = CATEGORY[asset.category] || CATEGORY.carro
  const howMany = recordsFor(records, asset.id)
  const overdue = isOverdue(asset)
  const predStats = asset.category === 'carro' || asset.category === 'moto' ? calculateVehiclePredictiveStats(asset.id, records) : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'card card-hover flex cursor-pointer flex-col gap-3 p-4 outline-none transition-shadow',
        selected && 'ring-2 ring-orange-500/50',
      )}
    >
      <div className="flex items-center gap-2">
        <IconTile icon={cat.icon} size="sm" className={ORANGE_SOFT} />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">{asset.name}</p>
        <span className="chip px-2 py-0.5 text-[10px] text-orange-300">{cat.label}</span>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="eyebrow text-orange-400">Vida útil / Saúde</span>
          <span className="font-num text-xs text-zinc-400">{asset.lifePct ?? 100}%</span>
        </div>
        <ProgressBar value={asset.lifePct ?? 100} tone="orange" />
      </div>

      {predStats && (
        <div
          className={cn(
            'rounded-lg px-2.5 py-1.5 text-[11px] border flex items-center justify-between gap-2 transition-colors',
            predStats.urgency === 'critical'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-medium'
              : predStats.urgency === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300',
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Gauge className="h-3.5 w-3.5 text-orange-400 shrink-0" />
            <span className="truncate">{predStats.formattedSummary}</span>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs">
        {asset.nextMaintenance ? (
          overdue ? (
            <span className="inline-flex items-center gap-1 font-medium text-rose-300">
              <TriangleAlert className="h-3.5 w-3.5" /> Manutenção atrasada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-zinc-400">
              <CalendarDays className="h-3.5 w-3.5" />
              {relativeDayLabel(asset.nextMaintenance)} · <span className="font-num">{shortDate(asset.nextMaintenance)}</span>
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-1 text-emerald-400/90 text-[11px] font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Sem revisão agendada
          </span>
        )}
        <span className="font-num shrink-0 text-zinc-600">{howMany.length} registros</span>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-800/70 pt-2">
        <span className="font-num inline-flex items-center gap-1 text-[11px] text-zinc-500">
          <Coins className="h-3.5 w-3.5" /> {formatBRL(spentFor(records, asset.id))}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="soft"
            size="sm"
            className="h-7 px-2 text-[11px]"
            onClick={(e) => {
              e.stopPropagation()
              onNewRecord()
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Registro
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Editar ativo"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="h-7 w-7"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {pendingDelete === asset.id ? (
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                request(asset.id, () => void onRemove(asset.id))
              }}
            >
              Remover?
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Excluir ativo"
              onClick={(e) => {
                e.stopPropagation()
                request(asset.id, () => void onRemove(asset.id))
              }}
              className="h-7 w-7 hover:text-rose-300"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}