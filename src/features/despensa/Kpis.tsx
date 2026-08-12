import { CalendarClock, ShoppingBasket, Tag, TriangleAlert } from 'lucide-react'
import type { PantryItem } from '@/data/types'
import { KpiCard } from '@/components/ui/KpiCard'
import { categories, expiringCount, lowCount } from './despensaUtils'

const PURPLE_SOFT = 'bg-purple-500/15 text-purple-300 border-purple-500/30'

/** Despensa summary: items, low stock, expiring ≤ 7d, distinct categories. */
export function Kpis({ items }: { items: PantryItem[] }) {
  const kpis = [
    {
      icon: ShoppingBasket,
      label: 'Itens',
      value: String(items.length),
      hint: 'na despensa',
      soft: PURPLE_SOFT,
    },
    {
      icon: TriangleAlert,
      label: 'Estoque baixo',
      value: String(lowCount(items)),
      hint: 'no limite ou abaixo',
      soft: PURPLE_SOFT,
    },
    {
      icon: CalendarClock,
      label: 'Vencendo',
      value: String(expiringCount(items)),
      hint: 'em até 7 dias',
      soft: PURPLE_SOFT,
    },
    {
      icon: Tag,
      label: 'Categorias',
      value: String(categories(items).length),
      hint: 'diferentes',
      soft: PURPLE_SOFT,
    },
  ] as const

  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
      {kpis.map((k) => (
        <KpiCard key={k.label} icon={k.icon} label={k.label} value={k.value} hint={k.hint} soft={k.soft} />
      ))}
    </div>
  )
}