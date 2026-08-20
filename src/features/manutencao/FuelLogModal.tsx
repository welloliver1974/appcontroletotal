import { useMemo, useState } from 'react'
import { Calendar, Check, Fuel, Gauge, X, Zap } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'
import type { Asset, MaintenanceRecord } from '@/data/types'

interface FuelLogModalProps {
  open: boolean
  onClose: () => void
  assets: Asset[]
  records: MaintenanceRecord[]
  onSubmit: (draft: {
    assetId: string
    title: string
    cost: number
    date: string
    odometerKm?: number
    syncFinance?: boolean
  }) => Promise<void>
}

const FUEL_TYPES = ['Gasolina Comum', 'Gasolina Aditivada', 'Etanol', 'Diesel', 'GNV']

export function FuelLogModal({
  open,
  onClose,
  assets,
  records,
  onSubmit,
}: FuelLogModalProps) {
  const vehicleAssets = useMemo(
    () => assets.filter((a) => a.category === 'carro' || a.category === 'moto'),
    [assets],
  )

  const [assetId, setAssetId] = useState(() => vehicleAssets[0]?.id || assets[0]?.id || '')
  const [currentKm, setCurrentKm] = useState('')
  const [liters, setLiters] = useState('')
  const [totalCost, setTotalCost] = useState('')
  const [fuelType, setFuelType] = useState('Gasolina Comum')
  const [gasStation, setGasStation] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [syncFinance, setSyncFinance] = useState(true)
  const [saving, setSaving] = useState(false)

  // Encontrar o último odômetro registrado para este veículo
  const lastOdometer = useMemo(() => {
    if (!assetId) return null
    const assetRecords = records
      .filter((r) => r.assetId === assetId && typeof r.odometerKm === 'number' && r.odometerKm > 0)
      .sort((a, b) => (b.odometerKm || 0) - (a.odometerKm || 0))
    return assetRecords[0]?.odometerKm || null
  }, [records, assetId])

  // Cálculos de consumo e rendimento em tempo real
  const stats = useMemo(() => {
    const km = Number(currentKm) || 0
    const l = parseFloat(liters.replace(',', '.')) || 0
    const cost = parseFloat(totalCost.replace(',', '.')) || 0

    const pricePerLiter = l > 0 && cost > 0 ? cost / l : 0
    const deltaKm = lastOdometer && km > lastOdometer ? km - lastOdometer : null
    const kmPerLiter = deltaKm && l > 0 ? deltaKm / l : null
    const costPerKm = deltaKm && cost > 0 ? cost / deltaKm : null

    return {
      pricePerLiter,
      deltaKm,
      kmPerLiter,
      costPerKm,
    }
  }, [currentKm, liters, totalCost, lastOdometer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const costNum = parseFloat(totalCost.replace(',', '.'))
    const kmNum = Number(currentKm) || undefined
    const litersNum = parseFloat(liters.replace(',', '.'))

    if (!assetId || isNaN(costNum) || costNum <= 0) return

    setSaving(true)
    try {
      const consumptionNote = stats.kmPerLiter
        ? ` (${stats.kmPerLiter.toFixed(1)} km/L · ${litersNum.toFixed(1)}L)`
        : ` (${litersNum.toFixed(1)}L)`

      const stationNote = gasStation.trim() ? ` · ${gasStation.trim()}` : ''
      const title = `⛽ ${fuelType}${consumptionNote}${stationNote}`

      await onSubmit({
        assetId,
        title,
        cost: costNum,
        date,
        odometerKm: kmNum,
        syncFinance,
      })

      if (stats.kmPerLiter) {
        toast.success(`Abastecimento salvo e sincronizado com Finanças! (${stats.kmPerLiter.toFixed(1)} km/L) ⛽💰`)
      } else {
        toast.success('Abastecimento salvo e sincronizado com Finanças! ⛽💰')
      }

      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar abastecimento.')
    } finally {
      setSaving(false)
    }
  }

  if (vehicleAssets.length === 0 && assets.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="Registrar Abastecimento ⛽">
        <div className="p-4 text-center space-y-3">
          <p className="text-xs text-zinc-400">
            Cadastre primeiro um veículo (Carro ou Moto) na seção de Manutenção para registrar abastecimentos.
          </p>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Calculadora de Abastecimento & Consumo ⛽">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Seleção do Veículo */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-300">Veículo</label>
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="input-base text-xs font-medium"
            required
          >
            {vehicleAssets.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category === 'moto' ? '🏍️' : '🚗'} {c.name}
              </option>
            ))}
            {vehicleAssets.length === 0 &&
              assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </div>

        {/* Odômetro Atual e Anterior */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300 flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-zinc-400" /> Odômetro Atual (km)
            </span>
            {lastOdometer && (
              <span className="text-[11px] text-zinc-500 font-mono">
                Último: {lastOdometer.toLocaleString('pt-BR')} km
              </span>
            )}
          </div>
          <input
            type="number"
            inputMode="numeric"
            placeholder="Ex.: 85420"
            value={currentKm}
            onChange={(e) => setCurrentKm(e.target.value)}
            className="input-base text-sm font-mono font-bold text-zinc-100"
            required
          />
        </div>

        {/* Litros e Valor Total */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
              <Fuel className="h-3.5 w-3.5 text-amber-400" /> Litros Abastecidos
            </label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex.: 45,5"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
              className="input-base text-sm font-mono font-bold text-zinc-100"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-300">Valor Total Pago (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="250,00"
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="input-base pl-9 text-sm font-mono font-bold text-zinc-100"
                required
              />
            </div>
          </div>
        </div>

        {/* Tipo de Combustível & Posto */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Combustível</label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="input-base text-xs"
            >
              {FUEL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Posto / Local (opcional)</label>
            <input
              type="text"
              placeholder="Ex.: Ipiranga, Shell..."
              value={gasStation}
              onChange={(e) => setGasStation(e.target.value)}
              className="input-base text-xs"
            />
          </div>
        </div>

        {/* Data & Sincronização com Finanças */}
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Data do Abastecimento
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-base text-xs font-mono"
            />
          </div>

          {/* Toggle de sincronização financeira */}
          <label className="flex items-center gap-2 cursor-pointer select-none rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 hover:bg-emerald-500/15 transition-colors">
            <input
              type="checkbox"
              checked={syncFinance}
              onChange={(e) => setSyncFinance(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-500"
            />
            <span className="text-xs text-emerald-300 font-medium">
              💰 Lançar automaticamente no extrato e orçamento de Finanças (Transporte)
            </span>
          </label>
        </div>

        {/* Painel de Cálculo em Tempo Real */}
        {(stats.kmPerLiter !== null || stats.pricePerLiter > 0) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Desempenho Calculado
              </span>
              {stats.pricePerLiter > 0 && (
                <span className="text-xs font-mono font-semibold text-zinc-200">
                  R$ {stats.pricePerLiter.toFixed(2)} / L
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-amber-500/20 text-center">
              <div>
                <span className="text-[10px] text-zinc-400 block">Distância:</span>
                <span className="text-xs font-mono font-bold text-zinc-100">
                  {stats.deltaKm !== null ? `${stats.deltaKm} km` : '1º abastecimento'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 block">Média:</span>
                <span className="text-xs font-mono font-bold text-amber-300">
                  {stats.kmPerLiter !== null ? `${stats.kmPerLiter.toFixed(2)} km/L` : '—'}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 block">Custo / km:</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {stats.costPerKm !== null ? `R$ ${stats.costPerKm.toFixed(2)}` : '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={saving || !totalCost || !liters || !currentKm}
            className="gap-1.5 bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20"
          >
            <Check className="h-4 w-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Abastecimento'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
