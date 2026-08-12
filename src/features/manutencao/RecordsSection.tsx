import { Trash2, Wrench } from 'lucide-react'
import type { Asset, MaintenanceRecord } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/feedback'
import { IconTile } from '@/components/ui/primitives'
import { formatBRL, shortDate } from '@/lib/utils'
import { usePendingDelete } from '@/lib/usePendingDelete'
import { cn } from '@/lib/utils'
import { CATEGORY, recordsFor, spentFor } from './maintUtils'

const ORANGE_SOFT = 'bg-orange-500/15 text-orange-300 border-orange-500/30'

/** Maintenance history of the selected asset, with chips to switch + new record. */
export function RecordsSection({
  assets,
  records,
  selectedId,
  onSelect,
  onNewRecord,
  onNewAsset,
  onRemove,
}: {
  assets: Asset[]
  records: MaintenanceRecord[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNewRecord: () => void
  onNewAsset: () => void
  onRemove: (id: string) => Promise<void> | void
}) {
  const { pendingDelete, request } = usePendingDelete()
  const selected = assets.find((a) => a.id === selectedId) ?? null
  const assetRecords = selected ? recordsFor(records, selected.id) : []

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Histórico de manutenção"
        subtitle={selected ? selected.name : 'nenhum ativo selecionado'}
        action={
          selected ? (
            <Button variant="primary" size="sm" onClick={onNewRecord}>
              Novo registro
            </Button>
          ) : undefined
        }
      />

      {assets.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={<Wrench className="h-5 w-5" />}
            title="Nenhum ativo cadastrado"
            description="Cadastre um ativo (carro, casa…) para começar a registrar manutenções."
            action={
              <Button variant="primary" size="sm" onClick={onNewAsset}>
                Novo ativo
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {assets.map((a) => {
              const active = a.id === selectedId
              const Icon = CATEGORY[a.category].icon
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onSelect(a.id)}
                  className={cn(
                    'chip gap-1.5 px-2.5 py-1 text-xs transition-colors',
                    active
                      ? 'border-orange-500/40 bg-orange-500/15 text-orange-300'
                      : 'border-zinc-700/60 bg-zinc-800/60 text-zinc-300 hover:bg-zinc-800',
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {a.name}
                </button>
              )
            })}
          </div>

          {!selected ? (
            <p className="py-4 text-center text-sm text-zinc-500">Selecione um ativo para ver seu histórico.</p>
          ) : assetRecords.length === 0 ? (
            <p className="py-4 text-center text-sm text-zinc-500">
              Sem registros para {selected.name}. Registre a primeira manutenção.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between rounded-2xl border border-orange-500/30 bg-orange-500/[0.06] px-4 py-3">
                <p className="eyebrow text-orange-400">Total investido</p>
                <p className="font-num font-display text-lg font-bold text-orange-200">
                  {formatBRL(spentFor(records, selected.id))}
                </p>
              </div>
              <div className="divide-y divide-zinc-800/70">
                {assetRecords.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 py-3">
                    <IconTile icon={Wrench} size="sm" className={ORANGE_SOFT} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-zinc-100">{r.title}</p>
                        {pendingDelete === r.id ? (
                          <Button variant="danger" size="sm" onClick={() => request(r.id, () => void onRemove(r.id))}>
                            Remover?
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir registro"
                            onClick={() => request(r.id, () => void onRemove(r.id))}
                            className="h-7 w-7 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                        <span className="font-num font-medium text-orange-300">{formatBRL(r.cost)}</span>
                        <span className="font-num text-zinc-400">· {shortDate(r.date)}</span>
                        {r.odometerKm ? (
                          <span className="font-num text-zinc-500">· {r.odometerKm.toLocaleString('pt-BR')} km</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  )
}