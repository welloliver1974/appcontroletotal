import { api } from '@/data/api'
import type { Asset, MaintenanceRecord, SpendingItem } from '@/data/types'

/**
 * Sincroniza um registro de manutenção / abastecimento diretamente no módulo de Finanças (spendingEntries).
 */
export async function syncMaintenanceRecordToFinance(
  record: { id?: string; assetId: string; title: string; cost: number; date: string },
  assets: Asset[] = []
): Promise<SpendingItem | null> {
  if (!record.cost || record.cost <= 0) return null

  const targetAsset = assets.find((a) => a.id === record.assetId)
  const category =
    targetAsset?.category === 'casa'
      ? 'Moradia'
      : targetAsset?.category === 'outro'
      ? 'Manutenção / Outros'
      : 'Transporte'

  const assetPrefix = targetAsset?.name ? `[${targetAsset.name}] ` : ''
  const note = `${assetPrefix}${record.title}`

  const spendingItem: Omit<SpendingItem, 'id'> = {
    amount: record.cost,
    category,
    note,
    date: record.date || new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5),
    createdAt: new Date().toISOString(),
  }

  try {
    return await api.create<SpendingItem>('spendingEntries', spendingItem)
  } catch (err) {
    console.error('Erro ao sincronizar manutenção com Finanças:', err)
    return null
  }
}

export async function syncAllUnsyncedMaintenance(): Promise<number> {
  try {
    const [maintenance, spending, assets] = await Promise.all([
      api.list<MaintenanceRecord>('maintenance').catch(() => []),
      api.list<SpendingItem>('spendingEntries').catch(async () => {
        return api.list<SpendingItem>('spending').catch(() => [])
      }),
      api.list<Asset>('assets').catch(() => []),
    ])

    const existingMaint = Array.isArray(maintenance) ? maintenance : []
    const existingSpending = Array.isArray(spending) ? spending : []
    const existingAssets = Array.isArray(assets) ? assets : []

    let syncedCount = 0

    // 1. Sincroniza Maintenance -> Finanças (se houver manutenção sem gasto lançado)
    for (const m of existingMaint) {
      if (!m.cost || m.cost <= 0) continue

      const alreadyExists = existingSpending.some((s) => {
        const sameAmount = Math.abs(Number(s.amount) - Number(m.cost)) < 0.01
        const sameDate = s.date === m.date || (s.createdAt && s.createdAt.slice(0, 10) === m.date)
        const titleMatch =
          (s.note && (s.note.includes(m.title) || m.title.includes(s.note))) ||
          s.category?.toLowerCase() === 'transporte' ||
          s.category?.toLowerCase() === 'moradia'
        return sameAmount && sameDate && titleMatch
      })

      if (!alreadyExists) {
        await syncMaintenanceRecordToFinance(m, existingAssets)
        syncedCount++
      }
    }

    // 2. Sincroniza Finanças -> Maintenance (se houver gasto de combustível/abastecimento sem registro de manutenção)
    const vehicleAssets = existingAssets.filter((a) => a.category === 'carro' || a.category === 'moto')
    const targetVehicle = vehicleAssets[0] || existingAssets[0]

    if (targetVehicle) {
      for (const s of existingSpending) {
        if (!s.amount || Number(s.amount) <= 0) continue

        const noteLower = (s.note || '').toLowerCase()
        const isFuelSpending =
          (s.note && s.note.includes('⛽')) ||
          noteLower.includes('abastecimento') ||
          noteLower.includes('gasolina') ||
          noteLower.includes('etanol') ||
          noteLower.includes('diesel') ||
          noteLower.includes('combustivel') ||
          noteLower.includes('combustível') ||
          noteLower.includes('posto shell') ||
          noteLower.includes('posto ipiranga') ||
          noteLower.includes('posto petrobras') ||
          noteLower.includes('posto br') ||
          (s.category?.toLowerCase() === 'transporte' && (noteLower.includes('combust') || noteLower.includes('abastec') || noteLower.includes('gasol') || noteLower.includes('posto')))

        if (isFuelSpending) {
          // Identificar se o nome de algum veículo específico está na nota (ex: [Honda Civic])
          const matchingVehicle =
            existingAssets.find((a) => s.note && s.note.toLowerCase().includes(a.name.toLowerCase())) ||
            targetVehicle

          const alreadyInMaint = existingMaint.some((m) => {
            const sameAmount = Math.abs(Number(m.cost) - Number(s.amount)) < 0.01
            const sameDate = m.date === s.date || (s.createdAt && s.createdAt.slice(0, 10) === m.date)
            return sameAmount && sameDate
          })

          if (!alreadyInMaint) {
            const title = s.note?.startsWith('⛽') ? s.note : `⛽ ${s.note || 'Abastecimento'}`
            await api.create<MaintenanceRecord>('maintenance', {
              assetId: matchingVehicle.id,
              title,
              cost: Number(s.amount),
              date: s.date || new Date().toISOString().slice(0, 10),
            })
            syncedCount++
          }
        }
      }
    }

    return syncedCount
  } catch (err) {
    console.error('Erro no sync bidirecional de manutenção/finanças:', err)
    return 0
  }
}
