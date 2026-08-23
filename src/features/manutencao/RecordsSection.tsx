import { useState } from 'react'
import { Fuel, Trash2, Wrench } from 'lucide-react'
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
const AMBER_SOFT = 'bg-amber-500/15 text-amber-300 border-amber-500/30'

function isFuelRecord(title: string): boolean {
  const t = title.toLowerCase()
  return (
    title.includes('⛽') ||
    t.includes('abastecimento') ||
    t.includes('gasolina') ||
    t.includes('etanol') ||
    t.includes('diesel') ||
    t.includes('litros') ||
    t.includes('gnv') ||
    t.includes('combustível') ||
    t.includes('combustivel')
  )
}

/** Maintenance & Fuel history of the selected asset, with chips to switch + new record. */
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
  const [filterType, setFilterType] = useState<'all' | 'maint' | 'fuel'>('all')

  const selected = assets.find((a) => a.id === selectedId) ?? null
  const assetRecords = selected ? recordsFor(records, selected.id) : []

  const fuelRecords = assetRecords.filter((r) => isFuelRecord(r.title))
  const maintRecords = assetRecords.filter((r) => !isFuelRecord(r.title))

  const filteredRecords =
    filterType === 'fuel' ? fuelRecords : filterType === 'maint' ? maintRecords : assetRecords

  const totalFuelCost = fuelRecords.reduce((sum, r) => sum + (Number(r.cost) || 0), 0)
  const totalMaintCost = maintRecords.reduce((sum, r) => sum + (Number(r.cost) || 0), 0)

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Histórico de Registros & Abastecimentos"
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
            description="Cadastre um ativo (carro, casa…) para começar a registrar manutenções e abastecimentos."
            action={
              <Button variant="primary" size="sm" onClick={onNewAsset}>
                Novo ativo
              </Button>
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3 p-4">
          {/* Seletor de Ativo */}
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
              Sem registros para {selected.name}. Registre a primeira manutenção ou abastecimento.
            </p>
          ) : (
            <>
              {/* KPIs de Gastos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center justify-between rounded-xl border border-orange-500/30 bg-orange-500/[0.06] px-3.5 py-2.5">
                  <div>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-orange-400">Total Investido</p>
                    <p className="font-num font-display text-base sm:text-lg font-bold text-orange-200">
                      {formatBRL(spentFor(records, selected.id))}
                    </p>
                  </div>
                </div>

                {fuelRecords.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3.5 py-2.5">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Combustível ⛽</p>
                      <p className="font-num font-display text-base sm:text-lg font-bold text-amber-200">
                        {formatBRL(totalFuelCost)}
                      </p>
                    </div>
                    <span className="chip text-[10px] px-1.5 py-0 text-amber-300 bg-amber-500/10 border-amber-500/20">
                      {fuelRecords.length}x
                    </span>
                  </div>
                )}

                {maintRecords.length > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-zinc-700/60 bg-zinc-800/40 px-3.5 py-2.5">
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Serviços / Peças 🔧</p>
                      <p className="font-num font-display text-base sm:text-lg font-bold text-zinc-200">
                        {formatBRL(totalMaintCost)}
                      </p>
                    </div>
                    <span className="chip text-[10px] px-1.5 py-0 text-zinc-400 bg-zinc-700/20 border-zinc-700/40">
                      {maintRecords.length}x
                    </span>
                  </div>
                )}
              </div>

              {/* Filtros: Todos / Manutenções / Abastecimentos */}
              {(selected.category === 'carro' || selected.category === 'moto' || fuelRecords.length > 0) && (
                <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/60">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                      filterType === 'all'
                        ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60',
                    )}
                  >
                    Todos ({assetRecords.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('fuel')}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                      filterType === 'fuel'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        : 'text-zinc-400 hover:text-amber-300 hover:bg-amber-500/10',
                    )}
                  >
                    <Fuel className="h-3 w-3" />
                    Abastecimentos ({fuelRecords.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('maint')}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                      filterType === 'maint'
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                        : 'text-zinc-400 hover:text-orange-300 hover:bg-orange-500/10',
                    )}
                  >
                    <Wrench className="h-3 w-3" />
                    Manutenções ({maintRecords.length})
                  </button>
                </div>
              )}

              {/* Lista de Registros */}
              <div className="divide-y divide-zinc-800/70">
                {filteredRecords.length === 0 ? (
                  <p className="py-6 text-center text-xs text-zinc-500">
                    Nenhum registro encontrado para este filtro.
                  </p>
                ) : (
                  filteredRecords.map((r) => {
                    const isFuel = isFuelRecord(r.title)
                    return (
                      <div key={r.id} className="flex items-start gap-3 py-3">
                        <IconTile
                          icon={isFuel ? Fuel : Wrench}
                          size="sm"
                          className={isFuel ? AMBER_SOFT : ORANGE_SOFT}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <p className="truncate text-sm font-medium text-zinc-100">{r.title}</p>
                              {isFuel && (
                                <span className="chip px-1.5 py-0 text-[10px] text-amber-300 bg-amber-500/15 border-amber-500/30 shrink-0">
                                  Abastecimento
                                </span>
                              )}
                            </div>
                            {pendingDelete === r.id ? (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => request(r.id, () => void onRemove(r.id))}
                              >
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
                            <span
                              className={cn(
                                'font-num font-medium',
                                isFuel ? 'text-amber-300' : 'text-orange-300',
                              )}
                            >
                              {formatBRL(r.cost)}
                            </span>
                            <span className="font-num text-zinc-400">· {shortDate(r.date)}</span>
                            {r.odometerKm ? (
                              <span className="font-num text-zinc-500">
                                · {r.odometerKm.toLocaleString('pt-BR')} km
                              </span>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  )
}