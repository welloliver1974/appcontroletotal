import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn, isoOffset } from '@/lib/utils'
import type { Asset, AssetCategory } from '@/data/types'
import { CATEGORY, clampLife } from './maintUtils'

export interface AssetDraft {
  name: string
  category: AssetCategory
  lifePct: number
  nextMaintenance: string
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
  const [lifePct, setLifePct] = useState(asset?.lifePct ?? 80)
  const [nextMaintenance, setNextMaintenance] = useState(asset?.nextMaintenance ?? isoOffset(30))
  const [lastMaintenance, setLastMaintenance] = useState(asset?.lastMaintenance ?? '')

  const submit = () => {
    if (!name.trim() || !nextMaintenance) return
    void onSubmit({
      name: name.trim(),
      category,
      lifePct: clampLife(Number(lifePct) || 0),
      nextMaintenance,
      lastMaintenance: lastMaintenance || undefined,
    })
  }

  return (
    <Modal open onClose={onClose} title={mode === 'edit' ? 'Editar ativo' : 'Novo ativo'}>
      <div className="space-y-4">
        <div>
          <label htmlFor="asset-name" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Nome
          </label>
          <input
            id="asset-name"
            className="input-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex.: Chevrolet Onix 2021"
            autoFocus
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">Categoria</span>
          <div className="flex items-center gap-2">
            {(Object.keys(CATEGORY) as AssetCategory[]).map((c) => {
              const active = c === category
              const Icon = CATEGORY[c].icon
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors',
                    active
                      ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                      : 'border-zinc-800 bg-white/5 text-zinc-500 hover:bg-white/10',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {CATEGORY[c].label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-zinc-500">
            Vida útil — <span className="font-num text-orange-400">{clampLife(Number(lifePct) || 0)}%</span>
          </span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={clampLife(Number(lifePct) || 0)}
              onChange={(e) => setLifePct(Number(e.target.value))}
              className="h-2 w-full accent-orange-500"
              aria-label="Vida útil"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={clampLife(Number(lifePct) || 0)}
              onChange={(e) => setLifePct(Number.parseInt(e.target.value, 10) || 0)}
              className="input-base w-20 text-center font-num"
              aria-label="Vida útil em porcentagem"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="asset-next" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Próxima manutenção
            </label>
            <input
              id="asset-next"
              type="date"
              className="input-base"
              value={nextMaintenance}
              onChange={(e) => setNextMaintenance(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="asset-last" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Última manutenção <span className="text-zinc-600">(opcional)</span>
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

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim() || !nextMaintenance}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}