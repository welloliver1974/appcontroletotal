import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  CloudSun,
  Compass,
  Fuel,
  Luggage,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { api } from '@/data/api'
import { formatBRL } from '@/lib/utils'
import { sendDirectTelegramMessage } from '@/lib/hermes'
import { toast } from '@/stores/toastStore'
import { calculateVehicleFuelSummary } from '@/features/manutencao/predictiveMaint'
import type { Asset, MaintenanceRecord, Trip } from '@/data/types'

interface SmartTravelAssistantModalProps {
  open: boolean
  trip: Trip
  onClose: () => void
}

interface ChecklistItem {
  id: string
  text: string
  category: 'docs' | 'clothes' | 'tech' | 'health' | 'car'
  checked: boolean
}

const DEFAULT_CHECKLIST: Record<string, ChecklistItem[]> = {
  default: [
    { id: '1', text: 'Documentos (RG/CNH) e Cartões', category: 'docs', checked: false },
    { id: '2', text: 'Comprovantes de reserva ou passagens', category: 'docs', checked: false },
    { id: '3', text: 'Carregadores de celular e powerbank', category: 'tech', checked: false },
    { id: '4', text: 'Roupas adequadas para a duração', category: 'clothes', checked: false },
    { id: '5', text: 'Kit farmacinha e itens de higiene', category: 'health', checked: false },
    { id: '6', text: 'Calibragem dos pneus e nível de óleo', category: 'car', checked: false },
  ],
  praia: [
    { id: 'p1', text: 'Protetor solar e repelente', category: 'health', checked: false },
    { id: 'p2', text: 'Roupas de banho, toalhas e chinelos', category: 'clothes', checked: false },
    { id: 'p3', text: 'Óculos de sol e boné/chapéu', category: 'clothes', checked: false },
    { id: 'p4', text: 'Bolsa térmica ou garrafa de água', category: 'clothes', checked: false },
  ],
  trabalho: [
    { id: 't1', text: 'Notebook, carregador e mouse', category: 'tech', checked: false },
    { id: 't2', text: 'Roupas formais/sociais e sapatos', category: 'clothes', checked: false },
    { id: 't3', text: 'Crachá, cartões de visita e pauta', category: 'docs', checked: false },
  ],
  familia: [
    { id: 'f1', text: 'Documentos e certidões das crianças', category: 'docs', checked: false },
    { id: 'f2', text: 'Trocas extras de roupa e agasalhos', category: 'clothes', checked: false },
    { id: 'f3', text: 'Lanches práticos para o trajeto', category: 'health', checked: false },
    { id: 'f4', text: 'Jogos, livros ou entretenimento portátil', category: 'tech', checked: false },
  ],
}

export function SmartTravelAssistantModal({
  open,
  trip,
  onClose,
}: SmartTravelAssistantModalProps) {
  const [vehicles, setVehicles] = useState<Asset[]>([])
  const [records, setRecords] = useState<MaintenanceRecord[]>([])
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')
  
  // Distância e combustível
  const [tripDistanceKm, setTripDistanceKm] = useState<number>(() => trip.totalKm || 320)
  const fuelPrice = 5.89
  const tollEstimatedCost = 45
  const [newItemText, setNewItemText] = useState('')

  // Checklist state with localStorage persistence
  const checklistStorageKey = `act.travel.checklist.${trip.id}`
  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem(checklistStorageKey)
      if (saved) return JSON.parse(saved)
    } catch {}

    const base = [...DEFAULT_CHECKLIST.default]
    const destLower = trip.destination.toLowerCase()

    if (trip.kind === 'trabalho') {
      base.push(...DEFAULT_CHECKLIST.trabalho)
    } else if (trip.kind === 'familia') {
      base.push(...DEFAULT_CHECKLIST.familia)
    }

    if (destLower.includes('praia') || destLower.includes('mar') || destLower.includes('litoral') || destLower.includes('rio')) {
      base.push(...DEFAULT_CHECKLIST.praia)
    }

    return base
  })

  useEffect(() => {
    try {
      localStorage.setItem(checklistStorageKey, JSON.stringify(checklist))
    } catch {}
  }, [checklist, checklistStorageKey])

  // Load vehicles & maintenance records
  useEffect(() => {
    if (!open) return
    Promise.all([
      api.list<Asset>('assets').catch(() => []),
      api.list<MaintenanceRecord>('maintenance').catch(() => []),
    ]).then(([assetsList, maintList]) => {
      const cars = (assetsList || []).filter((a) => a.category === 'carro' || a.category === 'moto')
      setVehicles(cars)
      setRecords(maintList || [])
      if (cars.length > 0 && !selectedVehicleId) {
        setSelectedVehicleId(cars[0].id)
      }
    })
  }, [open, selectedVehicleId])

  // Calculate vehicle fuel stats using cumulative summary
  const vehicleStats = useMemo(() => {
    if (!selectedVehicleId) return { avgKmPerLiter: 11.5, pricePerLiter: 5.89 }
    const summary = calculateVehicleFuelSummary(selectedVehicleId, records)

    const avgKmPerLiter = summary.displayAvgKmPerLiter || 11.5
    const pricePerLiter = summary.pricePerLiter > 0 ? summary.pricePerLiter : fuelPrice

    return { avgKmPerLiter, pricePerLiter }
  }, [selectedVehicleId, records, fuelPrice])

  // Fuel & Cost Estimates
  const estimatedLiters = useMemo(() => {
    if (vehicleStats.avgKmPerLiter <= 0) return 0
    return Math.round((tripDistanceKm / vehicleStats.avgKmPerLiter) * 10) / 10
  }, [tripDistanceKm, vehicleStats.avgKmPerLiter])

  const estimatedFuelCost = useMemo(() => {
    return estimatedLiters * (vehicleStats.pricePerLiter || fuelPrice)
  }, [estimatedLiters, vehicleStats.pricePerLiter, fuelPrice])

  const totalTripCostEstimate = useMemo(() => {
    return estimatedFuelCost + tollEstimatedCost
  }, [estimatedFuelCost, tollEstimatedCost])

  // Checklist Actions
  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)),
    )
  }

  const removeItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id))
  }

  const addItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemText.trim()) return
    const newItem: ChecklistItem = {
      id: String(Date.now()),
      text: newItemText.trim(),
      category: 'clothes',
      checked: false,
    }
    setChecklist((prev) => [...prev, newItem])
    setNewItemText('')
  }

  const checkedCount = checklist.filter((i) => i.checked).length
  const progressPct = checklist.length > 0 ? Math.round((checkedCount / checklist.length) * 100) : 0

  const handleSendTelegram = async () => {
    const text = `✈️ *PLANO DE VIAGEM COM HERMES*
📍 *Destino:* ${trip.destination}
📅 *Período:* ${trip.startDate} até ${trip.endDate}

⛽ *Estimativa de Combustível:*
• Distância estimada: ${tripDistanceKm} km
• Média veicular: ${vehicleStats.avgKmPerLiter} km/L
• Litragem necessária: ${estimatedLiters} L (~${formatBRL(estimatedFuelCost)})
• Pedágios estimados: ${formatBRL(tollEstimatedCost)}
• 💰 *Custo Total Estimado de Deslocamento:* ${formatBRL(totalTripCostEstimate)}

🎒 *Checklist de Bagagem (${checkedCount}/${checklist.length} prontos):*
${checklist.map((i) => `${i.checked ? '✅' : '⬜'} ${i.text}`).join('\n')}`

    const res = await sendDirectTelegramMessage(text)
    if (res.ok) {
      toast.success('Plano de viagem enviado para o Telegram! ✈️📱')
    } else {
      const url = `https://t.me/share/url?text=${encodeURIComponent(text)}`
      window.open(url, '_blank', 'noopener,noreferrer')
      toast.info('Abrindo Telegram para envio.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`✈️ Piloto Automático — ${trip.destination}`}
      wide
    >
      <div className="space-y-5 pt-1">
        {/* Banner do Destino & Clima */}
        <div className="rounded-2xl p-4 bg-gradient-to-br from-cyan-500/[0.08] via-zinc-900/80 to-zinc-950/90 border border-cyan-500/25 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="chip px-1.5 py-0 text-[10px] text-cyan-300 bg-cyan-500/15 border-cyan-500/30">
                  <Sparkles className="h-2.5 w-2.5 inline mr-0.5" /> Hermes Travel
                </span>
                <span className="text-xs text-zinc-400">{trip.startDate} ➔ {trip.endDate}</span>
              </div>
              <h3 className="text-base font-bold text-zinc-100 mt-0.5">{trip.destination}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-zinc-950/60 border border-zinc-800 p-2 text-xs text-zinc-300">
            <CloudSun className="h-4 w-4 text-amber-400" />
            <span>Clima no destino: <strong>Favorável (24°C ~ 28°C)</strong></span>
          </div>
        </div>

        {/* 1. ESTIMATIVA DE COMBUSTÍVEL & DESLOCAMENTO */}
        <div className="rounded-2xl p-4 bg-zinc-900/70 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Fuel className="h-4 w-4 text-amber-400" /> Estimativa de Combustível & Custos
            </h4>
            {vehicles.length > 0 && (
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="input-base py-1 px-2 text-xs font-medium w-auto h-7"
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    🚗 {v.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-2.5">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Distância Ida & Volta</span>
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="number"
                  value={tripDistanceKm}
                  onChange={(e) => setTripDistanceKm(Number(e.target.value) || 0)}
                  className="input-base h-7 py-0 px-1 text-xs font-bold font-num w-20"
                />
                <span className="text-xs text-zinc-400">km</span>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-2.5">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Consumo Médio</span>
              <p className="text-sm font-bold font-num text-amber-300 mt-1">
                {vehicleStats.avgKmPerLiter} <span className="text-xs text-zinc-400 font-normal">km/L</span>
              </p>
            </div>

            <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-2.5">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase block">Combustível Total</span>
              <p className="text-sm font-bold font-num text-zinc-100 mt-1">
                ~{estimatedLiters} L <span className="text-xs text-zinc-500 font-normal">({formatBRL(estimatedFuelCost)})</span>
              </p>
            </div>

            <div className="rounded-xl bg-indigo-500/[0.08] border border-indigo-500/25 p-2.5">
              <span className="text-[10px] font-semibold text-indigo-400 uppercase block">Custo Deslocamento</span>
              <p className="text-sm font-bold font-num text-indigo-300 mt-1">
                {formatBRL(totalTripCostEstimate)}
              </p>
            </div>
          </div>
        </div>

        {/* 2. CHECKLIST INTELIGENTE DE MALAS & DOCUMENTOS */}
        <div className="rounded-2xl p-4 bg-zinc-900/70 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Luggage className="h-4 w-4 text-indigo-400" /> Checklist de Malas & Preparativos
              </h4>
              <p className="text-[11px] text-zinc-500">
                {checkedCount} de {checklist.length} itens conferidos ({progressPct}%)
              </p>
            </div>

            <div className="h-2 w-24 rounded-full bg-zinc-800 overflow-hidden shrink-0">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Lista de Itens */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                  item.checked
                    ? 'bg-emerald-500/[0.06] border-emerald-500/25 text-zinc-400 line-through'
                    : 'bg-zinc-950/70 border-zinc-800 text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`h-4 w-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                      item.checked
                        ? 'bg-emerald-500 border-emerald-500 text-zinc-950'
                        : 'border-zinc-700 bg-zinc-900'
                    }`}
                  >
                    {item.checked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span className="truncate">{item.text}</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeItem(item.id)
                  }}
                  className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Adicionar Item */}
          <form onSubmit={addItem} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Adicionar item à mala (ex: Remédio de enjoo, Carregador do relógio)..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              className="input-base text-xs flex-1"
            />
            <Button variant="soft" size="sm" type="submit" className="text-xs shrink-0">
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
            </Button>
          </form>
        </div>

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs text-zinc-400">
            Fechar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSendTelegram}
            className="gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Enviar Resumo para Telegram</span>
          </Button>
        </div>
      </div>
    </Modal>
  )
}
