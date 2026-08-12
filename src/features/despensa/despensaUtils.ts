import type { PantryItem } from '@/data/types'
import { daysUntil, todayStr } from '@/lib/utils'

/** Distinct categories with item count, sorted alphabetically. */
export function categories(items: PantryItem[]): Array<{ name: string; count: number }> {
  const map = new Map<string, number>()
  for (const it of items) map.set(it.category, (map.get(it.category) ?? 0) + 1)
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Low stock: at or below the threshold (matches dashboard Alerts' `qty <= lowThreshold`). */
export function isLow(item: PantryItem): boolean {
  return item.qty <= item.lowThreshold
}

export function isExpired(item: PantryItem): boolean {
  return !!item.expiresAt && item.expiresAt < todayStr()
}

/** Expires within `days` (inclusive) — includes already-expired items. */
export function isExpiringSoon(item: PantryItem, days = 7): boolean {
  return !!item.expiresAt && daysUntil(item.expiresAt) <= days
}

/** Stock fill 0..100, scaled so the threshold sits at half the bar. */
export function stockRatio(item: PantryItem): number {
  if (item.lowThreshold <= 0) return 100
  return Math.max(0, Math.min(100, (item.qty / (item.lowThreshold * 2)) * 100))
}

export function lowCount(items: PantryItem[]): number {
  return items.filter(isLow).length
}

export function expiringCount(items: PantryItem[], days = 7): number {
  return items.filter((it) => isExpiringSoon(it, days)).length
}

/** Sorting: low stock first, then expiring soon, then by name. */
export function sortItems(items: PantryItem[]): PantryItem[] {
  return [...items].sort((a, b) => {
    const aLow = isLow(a) ? 0 : 1
    const bLow = isLow(b) ? 0 : 1
    if (aLow !== bLow) return aLow - bLow
    const aExp = isExpiringSoon(a, 7) ? 0 : 1
    const bExp = isExpiringSoon(b, 7) ? 0 : 1
    if (aExp !== bExp) return aExp - bExp
    return a.name.localeCompare(b.name)
  })
}

/** PT-BR shopping list (exported via webhook mock): low stock + expiring soon. */
export function buildShoppingList(items: PantryItem[]): string {
  const todo = items.filter((it) => isLow(it) || isExpiringSoon(it, 7))
  if (todo.length === 0) return 'Despensa em dia — nada na lista de compras. 🎉'
  const lines = todo.map((it) => {
    const why = isLow(it)
      ? `estoque baixo (${it.qty} ${it.unit} / mín. ${it.lowThreshold})`
      : `vence em ${it.expiresAt ? daysUntil(it.expiresAt) : 0}d`
    return `• ${it.name} — ${why}`
  })
  return `LISTA DE COMPRAS\n\n${lines.join('\n')}`
}