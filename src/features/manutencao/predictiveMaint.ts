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

export interface FuelAutonomyStats {
  hasData: boolean
  lastFuelKm: number
  currentKm: number
  kmSinceLastFuel: number
  litersLastFuel: number
  avgKmPerLiter: number
  estimatedKmRemaining: number
  tankPercentRemaining: number
  fuelStatus: 'full' | 'half' | 'low' | 'reserve'
  statusMessage: string
}

/**
 * Calculates estimated remaining fuel autonomy based on fuel logs and odometer.
 */
export function calculateFuelAutonomy(
  assetId: string,
  records: MaintenanceRecord[],
  defaultTankLiters = 50,
): FuelAutonomyStats {
  const fuelLogs = records
    .filter(
      (r) =>
        r.assetId === assetId &&
        typeof r.odometerKm === 'number' &&
        r.odometerKm > 0 &&
        (r.title.includes('⛽') ||
          r.title.toLowerCase().includes('litros') ||
          r.title.toLowerCase().includes('gasolina') ||
          r.title.toLowerCase().includes('etanol') ||
          r.title.toLowerCase().includes('abastecimento')),
    )
    .sort((a, b) => (b.odometerKm || 0) - (a.odometerKm || 0))

  const allOdoRecords = records
    .filter((r) => r.assetId === assetId && typeof r.odometerKm === 'number' && r.odometerKm > 0)
    .sort((a, b) => (b.odometerKm || 0) - (a.odometerKm || 0))

  const currentKm = allOdoRecords[0]?.odometerKm || 0

  if (fuelLogs.length === 0 || currentKm === 0) {
    return {
      hasData: false,
      lastFuelKm: 0,
      currentKm,
      kmSinceLastFuel: 0,
      litersLastFuel: 0,
      avgKmPerLiter: 11.5,
      estimatedKmRemaining: 0,
      tankPercentRemaining: 100,
      fuelStatus: 'full',
      statusMessage: 'Sem registros de abastecimento cadastrados',
    }
  }

  const latestFuel = fuelLogs[0]
  const lastFuelKm = latestFuel.odometerKm || currentKm
  const kmSinceLastFuel = Math.max(0, currentKm - lastFuelKm)

  // Extrair litros do título se existir (ex: "⛽ Gasolina (42.5 L)")
  const litersMatch = latestFuel.title.match(/(\d+[.,]?\d*)\s*l/i)
  const litersLastFuel = litersMatch ? parseFloat(litersMatch[1].replace(',', '.')) : defaultTankLiters

  // Consumo médio (tenta extrair dos logs ou usa 11.5 km/L de média)
  let avgKmPerLiter = 11.5
  if (fuelLogs.length >= 2) {
    const diffKm = (fuelLogs[0].odometerKm || 0) - (fuelLogs[1].odometerKm || 0)
    if (diffKm > 50 && diffKm < 1000) {
      avgKmPerLiter = Math.round((diffKm / litersLastFuel) * 10) / 10
    }
  }

  const totalRangeKm = litersLastFuel * avgKmPerLiter
  const estimatedKmRemaining = Math.max(0, Math.round(totalRangeKm - kmSinceLastFuel))
  const tankPercentRemaining = Math.max(
    0,
    Math.min(100, Math.round((estimatedKmRemaining / totalRangeKm) * 100)),
  )

  let fuelStatus: 'full' | 'half' | 'low' | 'reserve' = 'full'
  let statusMessage = `Tanque em ~${tankPercentRemaining}% (${estimatedKmRemaining} km de autonomia)`

  if (tankPercentRemaining <= 15) {
    fuelStatus = 'reserve'
    statusMessage = `⚠️ Reserva! Restam ~${estimatedKmRemaining} km. Abasteça em breve.`
  } else if (tankPercentRemaining <= 35) {
    fuelStatus = 'low'
    statusMessage = `Nível baixo (~${tankPercentRemaining}%). Autonomia de ${estimatedKmRemaining} km.`
  } else if (tankPercentRemaining <= 65) {
    fuelStatus = 'half'
    statusMessage = `Meio tanque (~${tankPercentRemaining}%). Autonomia de ${estimatedKmRemaining} km.`
  }

  return {
    hasData: true,
    lastFuelKm,
    currentKm,
    kmSinceLastFuel,
    litersLastFuel,
    avgKmPerLiter,
    estimatedKmRemaining,
    tankPercentRemaining,
    fuelStatus,
    statusMessage,
  }
}
