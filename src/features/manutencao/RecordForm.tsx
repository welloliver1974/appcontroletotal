import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { isoOffset } from '@/lib/utils'
import type { Asset, MaintenanceRecord } from '@/data/types'

export interface RecordDraft {
  assetId: string
  title: string
  cost: number
  date: string
  odometerKm?: number
  syncFinance?: boolean
}

/** Modal for a new or existing maintenance/fuel record. */
export function RecordForm({
  assets,
  defaultAssetId,
  record,
  onClose,
  onSubmit,
}: {
  assets: Asset[]
  defaultAssetId?: string
  record?: MaintenanceRecord
  onClose: () => void
  onSubmit: (draft: RecordDraft) => Promise<void> | void
}) {
  const [assetId, setAssetId] = useState(record?.assetId ?? defaultAssetId ?? assets[0]?.id ?? '')
  const [title, setTitle] = useState(record?.title ?? '')
  const [cost, setCost] = useState(record ? String(record.cost).replace('.', ',') : '')
  const [date, setDate] = useState(record?.date ?? isoOffset(0))
  const [odometer, setOdometer] = useState(record?.odometerKm ? String(record.odometerKm) : '')
  const [syncFinance, setSyncFinance] = useState(record ? false : true)

  const selectedAsset = assets.find((a) => a.id === assetId)
  const isVehicle = selectedAsset?.category === 'carro' || selectedAsset?.category === 'moto'

  const submit = () => {
    if (!assetId || !title.trim()) return
    const costN = Number.parseFloat(cost.replace('.', '').replace(',', '.')) || 0
    const km = Number.parseInt(odometer.replace(/\D/g, ''), 10)
    void onSubmit({
      assetId,
      title: title.trim(),
      cost: Math.round(costN * 100) / 100,
      date,
      odometerKm: Number.isFinite(km) && km > 0 ? km : undefined,
      syncFinance,
    })
  }

  const isEdit = !!record
  const isFuel = title.includes('⛽') || title.toLowerCase().includes('abastecimento')

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? (isFuel ? 'Editar Abastecimento ⛽' : 'Editar Registro de Manutenção 🔧') : 'Novo Registro de Serviço / Abastecimento'}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="record-asset" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Ativo / Veículo
          </label>
          <select id="record-asset" className="input-base" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.category === 'carro' ? '🚗' : a.category === 'moto' ? '🏍️' : a.category === 'casa' ? '🏠' : '📦'} {a.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="record-title" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Descrição do Serviço / Manutenção
          </label>
          <input
            id="record-title"
            className="input-base"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isVehicle ? 'ex.: Troca de óleo + filtro, pastilhas...' : 'ex.: Limpeza caixa d água, conserto ar condicionado...'}
            autoFocus
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="record-cost" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Custo Total (R$)
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
              Odômetro (km) <span className="text-zinc-600">{isVehicle ? '(opcional)' : '(apenas veículos)'}</span>
            </label>
            <input
              id="record-odo"
              className="input-base"
              inputMode="numeric"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder="ex.: 48.500"
              disabled={!isVehicle}
            />
          </div>
        </div>

        <div>
          <label htmlFor="record-date" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Data do Serviço
          </label>
          <input
            id="record-date"
            type="date"
            className="input-base"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* Toggle de sincronização com Finanças */}
        <label className="flex items-center gap-2 cursor-pointer select-none rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 hover:bg-emerald-500/15 transition-colors">
          <input
            type="checkbox"
            checked={syncFinance}
            onChange={(e) => setSyncFinance(e.target.checked)}
            className="h-4 w-4 rounded accent-emerald-500"
          />
          <span className="text-xs text-emerald-300 font-medium">
            💰 Lançar automaticamente no extrato e orçamento de Finanças
          </span>
        </label>

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