import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Check,
  PackageCheck,
  Plus,
  ShoppingCart,
  X,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { api } from '@/data/api'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'
import type { PantryItem } from '@/data/types'

export function QuickShoppingListCard() {
  const [items, setItems] = useState<PantryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState('Alimentos')

  const today = new Date().toISOString().slice(0, 10)

  const loadPantry = () => {
    api
      .list<PantryItem>('pantry')
      .then((res) => {
        if (Array.isArray(res)) {
          setItems(res)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPantry()
  }, [])

  // Filter items that need attention: low stock OR expiring in 7 days
  const needsAttention = items.filter((item) => {
    const isLow = item.qty <= item.lowThreshold
    const isExpiring = item.expiresAt && item.expiresAt <= today
    return isLow || isExpiring
  })

  const handleRestock = async (item: PantryItem) => {
    const nextQty = item.qty + 1
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, qty: nextQty } : i)),
    )
    try {
      await api.update<PantryItem>('pantry', item.id, { qty: nextQty })
      toast.success(`Estoque de "${item.name}" atualizado para ${nextQty} ${item.unit}! 🛒`)
    } catch {
      toast.error('Erro ao atualizar estoque.')
    }
  }

  const handleAddQuickItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    const draft: Omit<PantryItem, 'id'> = {
      name: newName.trim(),
      category: newCategory,
      qty: 0,
      unit: 'un',
      lowThreshold: 1,
    }

    try {
      const created = await api.create<PantryItem>('pantry', draft)
      setItems((prev) => [...prev, created])
      setNewName('')
      setAdding(false)
      toast.success(`"${draft.name}" adicionado à lista de compras! 🛒`)
    } catch {
      toast.error('Erro ao adicionar item.')
    }
  }

  if (loading) return null

  return (
    <Card className="flex flex-col p-3.5 sm:p-4 space-y-3 sm:space-y-3.5 border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20 w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 truncate">
              Lista de Compras
            </h4>
            <p className="text-[11px] text-zinc-500 truncate">
              {needsAttention.length > 0
                ? `${needsAttention.length} ${needsAttention.length === 1 ? 'item precisa' : 'itens precisam'} de reposição`
                : 'Despensa abastecida'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setAdding(!adding)}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar</span>
          </button>
          <Link
            to="/despensa"
            className="text-zinc-500 hover:text-zinc-300 p-1"
            title="Abrir Despensa Completa"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Formulário Rápido de Novo Item para Comprar */}
      {adding && (
        <form onSubmit={handleAddQuickItem} className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 pt-1 w-full min-w-0">
          <input
            type="text"
            autoFocus
            placeholder="Ex.: Café, Azeite..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="input-base h-8 text-xs flex-1 min-w-[130px]"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="input-base h-8 text-xs px-2 bg-zinc-900 border-zinc-700 text-zinc-200 w-auto"
          >
            <option value="Alimentos">Alimentos</option>
            <option value="Bebidas">Bebidas</option>
            <option value="Limpeza">Limpeza</option>
            <option value="Higiene">Higiene</option>
            <option value="Farmácia">Farmácia</option>
          </select>
          <div className="flex items-center gap-1">
            <Button
              variant="primary"
              size="sm"
              type="submit"
              className="h-8 px-2.5 text-xs bg-purple-600 hover:bg-purple-500 text-white shrink-0"
            >
              Salvar
            </Button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="h-8 w-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* Lista de Itens Críticos / Compras */}
      {needsAttention.length === 0 ? (
        <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-zinc-300">
          <PackageCheck className="h-5 w-5 text-emerald-400 shrink-0" />
          <div>
            <p className="font-semibold text-zinc-200">Tudo abastecido!</p>
            <p className="text-[11px] text-zinc-500">Nenhum item com estoque zerado no momento.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
          {needsAttention.slice(0, 5).map((item) => {
            const isZero = item.qty === 0
            const isExpiring = item.expiresAt && item.expiresAt <= today

            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700 transition-colors gap-2"
              >
                <div className="min-w-0 flex-1 flex items-center gap-2.5">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full shrink-0',
                      isZero
                        ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                        : isExpiring
                        ? 'bg-amber-500'
                        : 'bg-purple-400',
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {isZero ? (
                        <span className="text-rose-300 font-medium">
                          Comprar: <strong>{item.lowThreshold} {item.unit}</strong>
                        </span>
                      ) : (
                        <span>
                          Estoque: <strong>{item.qty}</strong> / {item.lowThreshold} {item.unit}
                        </span>
                      )}
                      {' · '}{item.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestock(item)}
                    className="h-7 px-2 text-[11px] gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20"
                    title={`Comprar (+1 ${item.unit})`}
                  >
                    <Check className="h-3 w-3" />
                    <span>{isZero && item.lowThreshold > 1 ? `+1 un` : 'Comprado'}</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
