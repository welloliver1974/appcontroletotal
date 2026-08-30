import { api } from '@/data/api'
import type { Asset, SpendingItem } from '@/data/types'

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
 * Sincronizador global em background.
 * Desativado para evitar duplicação ou recriação fantasma de abastecimentos e manutenções
 * apagados intencionalmente pelo usuário.
 */
export async function syncAllUnsyncedMaintenance(): Promise<number> {
  return 0
}
