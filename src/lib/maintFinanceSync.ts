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

/**
 * Verifica e sincroniza retroativamente registros de abastecimento/manutenção que ainda não foram lançados em Finanças.
 */
export async function syncAllUnsyncedMaintenance(): Promise<number> {
  try {
    const [maintenance, spending, assets] = await Promise.all([
      api.list<MaintenanceRecord>('maintenance').catch(() => []),
      api.list<SpendingItem>('spendingEntries').catch(async () => {
        return api.list<SpendingItem>('spending').catch(() => [])
      }),
      api.list<Asset>('assets').catch(() => []),
    ])

    if (!Array.isArray(maintenance) || maintenance.length === 0) return 0
    const existingSpending = Array.isArray(spending) ? spending : []

    let syncedCount = 0

    for (const m of maintenance) {
      if (!m.cost || m.cost <= 0) continue

      // Verifica se já existe um gasto correspondente registrado
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
        await syncMaintenanceRecordToFinance(m, assets)
        syncedCount++
      }
    }

    return syncedCount
  } catch (err) {
    console.error('Erro no sync retroativo de manutenção:', err)
    return 0
  }
}
