import { useMemo } from 'react'
import { Fuel, Gauge, Info, Sparkles, TrendingUp, Zap } from 'lucide-react'
import type { Asset, MaintenanceRecord } from '@/data/types'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { formatBRL } from '@/lib/utils'
import { calculateFuelAutonomy, calculateVehicleFuelSummary } from './predictiveMaint'

interface VehicleFuelPerformanceCardProps {
  asset: Asset
  records: MaintenanceRecord[]
  onOpenFuelModal: () => void
}

export function VehicleFuelPerformanceCard({
  asset,
  records,
  onOpenFuelModal,
}: VehicleFuelPerformanceCardProps) {
  const isVehicle = asset.category === 'carro' || asset.category === 'moto'

  // Resumo de combustível acumulado e histórico
  const fuelSummary = useMemo(() => {
    if (!isVehicle) return null
    return calculateVehicleFuelSummary(asset.id, records)
  }, [asset.id, records, isVehicle])

  const fuelRecords = fuelSummary?.fuelRecords || []

  // Autonomia e tanque
  const autonomy = useMemo(() => {
    return calculateFuelAutonomy(asset.id, records)
  }, [asset.id, records])

  // Cálculos consolidados (Combustível + TCO Total)
  const stats = useMemo(() => {
    if (!isVehicle || !fuelSummary || !fuelSummary.hasData) return null

    const latest = fuelRecords[0]
    const latestCost = fuelSummary.lastFuelCost
    const latestLiters = fuelSummary.lastFuelLiters
    const pricePerLiter = fuelSummary.pricePerLiter
    const avgKmPerLiter = fuelSummary.displayAvgKmPerLiter
    const costPerKm = fuelSummary.costPerKm

    const totalFuelSpent = fuelRecords.reduce((sum, r) => sum + (Number(r.cost) || 0), 0)

    // Manutenções gerais deste veículo (peças, revisões, etc)
    const serviceRecords = records.filter(
      (r) => r.assetId === asset.id && !fuelRecords.some((fr) => fr.id === r.id),
    )
    const totalServiceSpent = serviceRecords.reduce((sum, r) => sum + (Number(r.cost) || 0), 0)
    const totalInvested = totalFuelSpent + totalServiceSpent

    // TCO por Km estimado (Combustível/km + custo de manutenção amortizado)
    let tcoPerKm: number | null = null
    if (costPerKm) {
      // Adiciona uma taxa média de manutenção amortizada
      const maintWeight = totalFuelSpent > 0 ? totalServiceSpent / totalFuelSpent : 0
      tcoPerKm = Math.round((costPerKm * (1 + Math.min(1.5, maintWeight))) * 100) / 100
    }

    return {
      latest,
      latestCost,
      latestLiters,
      pricePerLiter,
      avgKmPerLiter,
      isCumulative: fuelSummary.isCumulative,
      totalKmTracked: fuelSummary.totalKmTracked,
      totalLitersTracked: fuelSummary.totalLitersTracked,
      costPerKm,
      tcoPerKm,
      totalFuelSpent,
      totalServiceSpent,
      totalInvested,
      serviceCount: serviceRecords.length,
    }
  }, [fuelSummary, fuelRecords, records, asset.id, isVehicle])

  if (!isVehicle) return null

  return (
    <Card className="p-4 sm:p-5 border-amber-500/25 bg-gradient-to-br from-amber-500/[0.07] via-zinc-900/60 to-zinc-950/80 shadow-lg shadow-black/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/15">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Fuel className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
              <span>Painel de Consumo & Combustível</span>
              <span className="chip px-1.5 py-0 text-[10px] text-amber-300 bg-amber-500/15 border-amber-500/30">
                {asset.name}
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Métricas de rendimento, custo por km e autonomia do tanque
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={onOpenFuelModal}
          className="gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold border-0 shadow-md shadow-amber-500/20"
        >
          <Fuel className="h-3.5 w-3.5" />
          <span>+ Novo Abastecimento</span>
        </Button>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3.5">
        {/* 1. Média de Consumo */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1">
              <span>Consumo Médio</span>
              {stats?.isCumulative && (
                <span className="px-1 py-0 rounded text-[9px] bg-amber-500/20 text-amber-300 font-normal">
                  Acumulado
                </span>
              )}
            </span>
            <Sparkles className="h-3.5 w-3.5 text-amber-400/70" />
          </div>
          <p className="font-num font-display text-lg sm:text-xl font-bold text-amber-200 mt-1">
            {stats?.avgKmPerLiter ? `${stats.avgKmPerLiter.toFixed(1)} km/L` : 'Em cálculo'}
          </p>
          <span className="text-[10px] text-zinc-400 mt-0.5 block truncate" title={stats?.isCumulative ? `Baseado em ${stats.totalKmTracked} km percorridos e ${stats.totalLitersTracked} L colocados` : undefined}>
            {stats?.isCumulative
              ? `${stats.totalKmTracked} km rodados · ${stats.totalLitersTracked} L`
              : stats?.avgKmPerLiter
                ? 'Rendimento estimado'
                : 'Requer 2 abastecimentos'}
          </span>
        </div>

        {/* 2. Custo por Km */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
              Custo por Km
            </span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400/70" />
          </div>
          <p className="font-num font-display text-lg sm:text-xl font-bold text-emerald-200 mt-1">
            {stats?.costPerKm ? `R$ ${stats.costPerKm.toFixed(2)}` : stats?.pricePerLiter ? `R$ ${stats.pricePerLiter.toFixed(2)}/L` : '—'}
          </p>
          <span className="text-[10px] text-zinc-400 mt-0.5 block truncate">
            {stats?.costPerKm ? 'Gasto por km rodado' : 'Preço do combustível'}
          </span>
        </div>

        {/* 3. Preço por Litro */}
        <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">
              Último Litro
            </span>
            <Zap className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <p className="font-num font-display text-lg sm:text-xl font-bold text-zinc-100 mt-1">
            {stats?.pricePerLiter && stats.pricePerLiter > 0
              ? `R$ ${stats.pricePerLiter.toFixed(2)}`
              : '—'}
          </p>
          <span className="text-[10px] text-zinc-500 mt-0.5 block truncate">
            {stats?.latestLiters ? `${stats.latestLiters.toFixed(1)} L abastecidos` : 'Preço unitário'}
          </span>
        </div>

        {/* 4. Total Investido em Combustível & TCO */}
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
              TCO Total / Km
            </span>
            <Gauge className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <p className="font-num font-display text-lg sm:text-xl font-bold text-indigo-200 mt-1">
            {stats?.tcoPerKm ? `R$ ${stats.tcoPerKm.toFixed(2)}` : stats ? formatBRL(stats.totalFuelSpent) : 'R$ 0,00'}
          </p>
          <span className="text-[10px] text-zinc-400 mt-0.5 block truncate">
            {stats && stats.totalServiceSpent > 0
              ? `Combustível + ${formatBRL(stats.totalServiceSpent)} serviços`
              : `${fuelRecords.length} abastecimento${fuelRecords.length === 1 ? '' : 's'}`}
          </span>
        </div>
      </div>

      {/* Dica de Média Acumulada para Abastecimentos Parciais */}
      {stats?.isCumulative && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-amber-500/[0.07] border border-amber-500/20 text-[11px] text-amber-300/90 flex items-center gap-2">
          <Info className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>
            <strong>Média Acumulada ativa:</strong> calcula o rendimento total somando todos os seus abastecimentos ({stats.totalKmTracked} km percorridos), suavizando variações de abastecimentos parciais.
          </span>
        </div>
      )}

      {/* Barra de Autonomia Estimada */}
      {autonomy.hasData && (
        <div className="mt-3 pt-3 border-t border-zinc-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-300 font-medium flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{autonomy.statusMessage}</span>
            </span>
            <span className="font-num font-bold text-amber-300">
              ~{autonomy.estimatedKmRemaining} km restantes
            </span>
          </div>

          {/* Barra visual de nível */}
          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${autonomy.tankPercentRemaining <= 20
                  ? 'bg-rose-500'
                  : autonomy.tankPercentRemaining <= 45
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              style={{ width: `${Math.max(5, autonomy.tankPercentRemaining)}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  )
}
