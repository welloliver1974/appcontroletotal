import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { isoOffset } from '@/lib/utils'
import type { Asset } from '@/data/types'

export interface RecordDraft {
  assetId: string
  title: string
  cost: number
  date: string
  odometerKm?: number
}

/** Modal for a new maintenance record (tied to the selected asset by default). */
export function RecordForm({
  assets,
  defaultAssetId,
  onClose,
  onSubmit,
}: {
  assets: Asset[]
  defaultAssetId?: string
  onClose: () => void
  onSubmit: (draft: RecordDraft) => Promise<void> | void
}) {
  const [assetId, setAssetId] = useState(defaultAssetId ?? assets[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [cost, setCost] = useState('')
  const [date, setDate] = useState(isoOffset(0))
  const [odometer, setOdometer] = useState('')

  const submit = () => {
    if (!assetId || !title.trim()) return
    const costN = Number.parseFloat(cost.replace('.', '').replace(',', '.')) || 0
    const km = Number.parseInt(odometer, 10)
    void onSubmit({
      assetId,
      title: title.trim(),
      cost: Math.round(costN * 100) / 100,
      date,
      odometerKm: Number.isFinite(km) && km > 0 ? km : undefined,
    })
  }

  return (
    <Modal open onClose={onClose} title="Novo registro de manutenção">
      <div className="space-y-4">
        <div>
          <label htmlFor="record-asset" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Ativo
          </label>
          <select id="record-asset" className="input-base" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="record-title" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Descrição
          </label>
          <input
            id="record-title"
            className="input-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex.: Troca de óleo + filtros"
            autoFocus
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="record-cost" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Custo (R$)
            </label>
            <input
              id="record-cost"
              className="input-base"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="420,00"
            />
          </div>
          <div>
            <label htmlFor="record-odo" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Odômetro (km) <span className="text-zinc-600">(opcional)</span>
            </label>
            <input
              id="record-odo"
              className="input-base"
              inputMode="numeric"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder="ex.: 48.500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="record-date" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Data
          </label>
          <input
            id="record-date"
            type="date"
            className="input-base"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={!assetId || !title.trim()}>
            Salvar registro
          </Button>
        </div>
      </div>
    </Modal>
  )
}