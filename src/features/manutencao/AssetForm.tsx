import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import type { Asset, AssetCategory } from '@/data/types'
import { CATEGORY, clampLife } from './maintUtils'

export interface AssetDraft {
  name: string
  category: AssetCategory
  lifePct?: number
  nextMaintenance?: string
  lastMaintenance?: string
}

/** Create/edit modal for an asset (name, category, life %, next/last maintenance). */
export function AssetForm({
  mode,
  asset,
  onClose,
  onSubmit,
}: {
  mode: 'new' | 'edit'
  asset?: Asset
  onClose: () => void
  onSubmit: (draft: AssetDraft) => Promise<void> | void
}) {
  const [name, setName] = useState(asset?.name ?? '')
  const [category, setCategory] = useState<AssetCategory>(asset?.category ?? 'carro')
  const [lifePct, setLifePct] = useState(asset?.lifePct ?? 100)
  const [nextMaintenance, setNextMaintenance] = useState(asset?.nextMaintenance ?? '')
  const [lastMaintenance, setLastMaintenance] = useState(asset?.lastMaintenance ?? '')

  const submit = () => {
    if (!name.trim()) return
    void onSubmit({
      name: name.trim(),
      category,
      lifePct: clampLife(Number(lifePct) || 100),
      nextMaintenance: nextMaintenance || undefined,
      lastMaintenance: lastMaintenance || undefined,
    })
  }

  return (
    <Modal open onClose={onClose} title={mode === 'edit' ? 'Editar ativo' : 'Novo ativo'}>
      <div className="space-y-4">
        <div>
          <label htmlFor="asset-name" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Nome do Ativo / Veículo
          </label>
          <input
            id="asset-name"
            className="input-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex.: Chevrolet Onix, Honda Civic, Apartamento..."
            autoFocus
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Categoria</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(CATEGORY) as AssetCategory[]).map((c) => {
              const active = c === category
              const Icon = CATEGORY[c].icon
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-medium capitalize transition-colors',
                    active
                      ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                      : 'border-zinc-800 bg-white/5 text-zinc-400 hover:bg-white/10',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{CATEGORY[c].label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="asset-next" className="text-xs font-medium text-zinc-500">
                Próxima revisão / manutenção <span className="text-zinc-600">(opcional)</span>
              </label>
              {nextMaintenance && (
                <button
                  type="button"
                  onClick={() => setNextMaintenance('')}
                  className="text-[11px] text-zinc-500 hover:text-zinc-300 underline"
                >
                  Limpar
                </button>
              )}
            </div>
            <input
              id="asset-next"
              type="date"
              className="input-base"
              value={nextMaintenance}
              onChange={(e) => setNextMaintenance(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              Deixe em branco se não houver revisão agendada.
            </p>
          </div>

          <div>
            <label htmlFor="asset-last" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Última manutenção realizada <span className="text-zinc-600">(opcional)</span>
            </label>
            <input
              id="asset-last"
              type="date"
              className="input-base"
              value={lastMaintenance}
              onChange={(e) => setLastMaintenance(e.target.value)}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              Estado de conservação / Saúde do ativo: <span className="font-num text-orange-400">{clampLife(Number(lifePct) || 100)}%</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={clampLife(Number(lifePct) || 100)}
              onChange={(e) => setLifePct(Number(e.target.value))}
              className="h-2 w-full accent-orange-500"
              aria-label="Vida útil"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={clampLife(Number(lifePct) || 100)}
              onChange={(e) => setLifePct(Number.parseInt(e.target.value, 10) || 100)}
              className="input-base w-20 text-center font-num"
              aria-label="Vida útil em porcentagem"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim()}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}