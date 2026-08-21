import type { MaintenanceRecord } from '@/data/types'

export interface VehiclePredictiveStats {
  hasEnoughData: boolean
  currentKm: number
  avgKmPerDay: number
  lastOilChangeKm: number
  nextOilChangeKm: number
  kmRemaining: number
  daysRemaining: number
  predictedDate: string // YYYY-MM-DD
  urgency: 'ok' | 'warning' | 'critical'
  formattedSummary: string
}

/**
 * Calculates predictive vehicle usage stats and next oil/service date.
 */
export function calculateVehiclePredictiveStats(
  assetId: string,
  records: MaintenanceRecord[],
  oilIntervalKm = 10000,
): VehiclePredictiveStats | null {
  const odoRecords = records
    .filter(
      (r) =>
        r.assetId === assetId &&
        typeof r.odometerKm === 'number' &&
        r.odometerKm > 0 &&
        r.date &&
        /^\d{4}-\d{2}-\d{2}/.test(r.date),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.odometerKm || 0) - (b.odometerKm || 0))

  if (odoRecords.length === 0) return null

  const latestRecord = odoRecords[odoRecords.length - 1]
  const currentKm = latestRecord.odometerKm || 0

  // Se tiver menos de 2 registros de odômetro com datas distintas, usamos estimativa padrão brasileira (30 km/dia)
  let avgKmPerDay = 30
  let hasEnoughData = false

  if (odoRecords.length >= 2) {
    const first = odoRecords[0]
    const last = odoRecords[odoRecords.length - 1]
    const diffDays = Math.max(
      1,
      Math.round((new Date(last.date).getTime() - new Date(first.date).getTime()) / 86_400_000),
    )
    const diffKm = (last.odometerKm || 0) - (first.odometerKm || 0)

    if (diffKm > 0 && diffDays > 0) {
      avgKmPerDay = Math.max(5, Math.min(250, Math.round((diffKm / diffDays) * 10) / 10))
      hasEnoughData = true
    }
  }

  // Detectar último serviço de óleo / revisão
  const oilRecords = records
    .filter((r) => {
      const lower = r.title.toLowerCase()
      return (
        r.assetId === assetId &&
        (lower.includes('óleo') ||
          lower.includes('oleo') ||
          lower.includes('revisão') ||
          lower.includes('revisao') ||
          lower.includes('filtro'))
      )
    })
    .sort((a, b) => (b.odometerKm || 0) - (a.odometerKm || 0))

  // Se não houver nenhum registro de óleo/revisão cadastrado pelo usuário, não forçar previsão fantasma
  if (oilRecords.length === 0) {
    return {
      hasEnoughData: false,
      currentKm,
      avgKmPerDay,
      lastOilChangeKm: 0,
      nextOilChangeKm: 0,
      kmRemaining: 0,
      daysRemaining: 0,
      predictedDate: '',
      urgency: 'ok',
      formattedSummary: `${currentKm.toLocaleString('pt-BR')} km rodados · Veículo em dia`,
    }
  }

  const lastOilChangeKm = oilRecords[0].odometerKm || 0
  const nextOilChangeKm = lastOilChangeKm + oilIntervalKm
  const kmRemaining = nextOilChangeKm - currentKm
  const daysRemaining = Math.max(0, Math.round(kmRemaining / avgKmPerDay))

  const predictedTimestamp = Date.now() + daysRemaining * 86_400_000
  const predictedDate = new Date(predictedTimestamp).toISOString().slice(0, 10)

  let urgency: 'ok' | 'warning' | 'critical' = 'ok'
  if (kmRemaining <= 0 || daysRemaining <= 3) {
    urgency = 'critical'
  } else if (kmRemaining <= 1000 || daysRemaining <= 20) {
    urgency = 'warning'
  }

  let formattedSummary = `~${avgKmPerDay} km/dia · Próxima revisão em ${kmRemaining.toLocaleString('pt-BR')} km (~${daysRemaining} dias)`
  if (urgency === 'critical') {
    formattedSummary = `⚠️ Revisão/Óleo vencida ou iminente (${currentKm.toLocaleString('pt-BR')} km)`
  } else if (urgency === 'warning') {
    formattedSummary = `🔔 Revisão próxima: faltam ${kmRemaining.toLocaleString('pt-BR')} km (~${daysRemaining} dias)`
  }

  return {
    hasEnoughData,
    currentKm,
    avgKmPerDay,
    lastOilChangeKm,
    nextOilChangeKm,
    kmRemaining,
    daysRemaining,
    predictedDate,
    urgency,
    formattedSummary,
  }
}
