import { Bike, Car, Home, Package, type LucideIcon } from 'lucide-react'
import type { Asset, AssetCategory, MaintenanceRecord } from '@/data/types'
import { daysUntil, todayStr } from '@/lib/utils'

export const CATEGORY: Record<AssetCategory, { label: string; icon: LucideIcon }> = {
  carro: { label: 'Carro', icon: Car },
  moto: { label: 'Moto', icon: Bike },
  casa: { label: 'Casa', icon: Home },
  outro: { label: 'Outro / Equipamento', icon: Package },
}

export function clampLife(n: number): number {
  if (Number.isNaN(n)) return 100
  return Math.max(0, Math.min(100, n))
}

export function isOverdue(asset: Asset): boolean {
  if (!asset.nextMaintenance) return false
  return asset.nextMaintenance < todayStr()
}

export function sortAssetsByUrgency(assets: Asset[]): Asset[] {
  return [...assets].sort((a, b) => {
    const overdueA = isOverdue(a) ? 0 : 1
    const overdueB = isOverdue(b) ? 0 : 1
    if (overdueA !== overdueB) return overdueA - overdueB
    if (a.nextMaintenance && b.nextMaintenance) {
      return a.nextMaintenance.localeCompare(b.nextMaintenance)
    }
    if (a.nextMaintenance) return -1
    if (b.nextMaintenance) return 1
    return a.name.localeCompare(b.name)
  })
}

/** Records of one asset, newest first. */
export function recordsFor(records: MaintenanceRecord[], assetId: string): MaintenanceRecord[] {
  return records
    .filter((r) => r.assetId === assetId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function totalSpent(records: MaintenanceRecord[]): number {
  return records.reduce((sum, r) => sum + (Number(r.cost) || 0), 0)
}

export function spentFor(records: MaintenanceRecord[], assetId: string): number {
  return totalSpent(recordsFor(records, assetId))
}

export function latestMaintenance(records: MaintenanceRecord[], assetId: string): string | undefined {
  return recordsFor(records, assetId)[0]?.date
}

/** Assets needing attention: overdue or next maintenance within `days`. */
export function countUpcoming(assets: Asset[], days = 30): number {
  return assets.filter((a) => a.nextMaintenance && (isOverdue(a) || daysUntil(a.nextMaintenance) <= days)).length
}