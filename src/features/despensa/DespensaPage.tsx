import { useMemo, useState } from 'react'
import { LayoutGrid, List, Plus, Search, ShoppingBasket, ShoppingCart, X } from 'lucide-react'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/feedback'
import { api } from '@/data/api'
import { cn } from '@/lib/utils'
import type { PantryItem } from '@/data/types'
import { useDespensaData } from './useDespensaData'
import { Kpis } from './Kpis'
import { PantryItemCard } from './PantryItemCard'
import { PantryListView } from './PantryListView'
import { PantryItemForm, type PantryItemDraft } from './PantryItemForm'
import { SupermarketModeModal } from './SupermarketModeModal'
import { WebhookExport } from './WebhookExport'
import { categories, isExpired, isExpiringSoon, isLow, sortItems } from './despensaUtils'

type FormState = null | { mode: 'new' } | { mode: 'edit'; item: PantryItem }
type StatusTab = 'all' | 'needed' | 'expiring'
type ViewMode = 'list' | 'grid'

function DespensaSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-4 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-3 w-24 rounded-full" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-3 w-20 rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-xl" />
              <Skeleton className="h-3 w-32 rounded-full" />
            </div>
            <Skeleton className="h-12 w-20 rounded-lg" />
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <Skeleton className="h-44 rounded-2xl" />
    </div>
  )
}

/** Fase 4 — Consumo & Despensa: estoque visual, modo lista denso, CRUD, busca e exportação. */
export function DespensaPage() {
  const module = MODULE_BY_ID['despensa']
  const { data, setItems } = useDespensaData()
  const [supermarketOpen, setSupermarketOpen] = useState(false)
  const [form, setForm] = useState<FormState>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [statusTab, setStatusTab] = useState<StatusTab>('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem('act.pantryViewMode') as ViewMode) || 'list'
    } catch {
      return 'list'
    }
  })

  const handleToggleView = (mode: ViewMode) => {
    setViewMode(mode)
    try {
      localStorage.setItem('act.pantryViewMode', mode)
    } catch {}
  }

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const cats = useMemo(() => categories(items), [items])

  // Contagens para abas de status
  const neededCount = useMemo(() => items.filter((i) => isLow(i)).length, [items])
  const expiringCount = useMemo(
    () => items.filter((i) => isExpiringSoon(i, 7) || isExpired(i)).length,
    [items],
  )

  // Filtragem combinada (Status Tab + Categoria + Busca)
  const visible = useMemo(() => {
    let list = items

    if (statusTab === 'needed') {
      list = list.filter((i) => isLow(i))
    } else if (statusTab === 'expiring') {
      list = list.filter((i) => isExpiringSoon(i, 7) || isExpired(i))
    }

    if (categoryFilter) {
      list = list.filter((i) => i.category.toLowerCase() === categoryFilter.toLowerCase())
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q),
      )
    }

    return sortItems(list)
  }, [items, statusTab, categoryFilter, search])

  const save = async (draft: PantryItemDraft) => {
    if (!data) return
    if (form?.mode === 'edit') {
      const updated = await api.update<PantryItem>('pantry', form.item.id, draft)
      setItems(updated)
    } else {
      const created = await api.create<PantryItem>('pantry', draft)
      setItems([created, ...data.items])
    }
    setForm(null)
  }

  const remove = async (id: string) => {
    setItems(await api.remove<PantryItem>('pantry', id))
  }

  const handleUpdateQty = async (item: PantryItem, delta: number) => {
    if (!data) return
    const newQty = Math.max(0, item.qty + delta)
    const updatedItems = data.items.map((i) => (i.id === item.id ? { ...i, qty: newQty } : i))
    setItems(updatedItems)
    await api.update<PantryItem>('pantry', item.id, { qty: newQty })
  }

  const handleCompleteShopping = async (completedItemIds: string[]) => {
    if (!data) return
    const idSet = new Set(completedItemIds)
    const updated = data.items.map((it) => {
      if (idSet.has(it.id)) {
        return { ...it, qty: it.lowThreshold + 1 }
      }
      return it
    })
    setItems(updated)
    for (const id of completedItemIds) {
      const item = data.items.find((i) => i.id === id)
      const targetQty = (item?.lowThreshold ?? 1) + 1
      await api.update<PantryItem>('pantry', id, { qty: targetQty })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader module={module} />

      {!data ? (
        <DespensaSkeleton />
      ) : (
        <>
          <Kpis items={data.items} />

          <div className="space-y-3">
            {/* Header com Ações e Alternador de Visão */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Estoque & Compras</p>
                <h3 className="text-base font-medium text-zinc-100">
                  {visible.length} {visible.length === 1 ? 'item exibido' : 'itens exibidos'}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {/* Alternador Lista / Cards */}
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleView('list')}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                      viewMode === 'list'
                        ? 'bg-zinc-800 text-purple-300 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200',
                    )}
                    title="Visualização em Lista Compacta"
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>Lista</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleView('grid')}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                      viewMode === 'grid'
                        ? 'bg-zinc-800 text-purple-300 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200',
                    )}
                    title="Visualização em Cards"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    <span>Cards</span>
                  </button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSupermarketOpen(true)}
                  className="h-8 px-2.5 text-xs bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 gap-1.5 font-medium"
                  title="Abrir checklist interativo do supermercado"
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Modo Mercado</span>
                  {neededCount > 0 && (
                    <span className="h-4 min-w-4 px-1 rounded-full bg-purple-500 text-zinc-950 font-bold text-[10px] flex items-center justify-center">
                      {neededCount}
                    </span>
                  )}
                </Button>

                <Button variant="primary" size="sm" onClick={() => setForm({ mode: 'new' })}>
                  <Plus className="h-3.5 w-3.5" /> Novo item
                </Button>
              </div>
            </div>

            {/* Barra de Busca e Filtros Rápidos */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-1">
              {/* Abas de Status */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setStatusTab('all')}
                  className={cn(
                    'chip px-3 py-1 text-xs font-medium transition-colors',
                    statusTab === 'all'
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'text-zinc-400 hover:bg-zinc-800/60',
                  )}
                >
                  Todos ({items.length})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusTab('needed')}
                  className={cn(
                    'chip px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1.5',
                    statusTab === 'needed'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'text-zinc-400 hover:bg-zinc-800/60',
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  Falta Comprar ({neededCount})
                </button>

                <button
                  type="button"
                  onClick={() => setStatusTab('expiring')}
                  className={cn(
                    'chip px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1.5',
                    statusTab === 'expiring'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'text-zinc-400 hover:bg-zinc-800/60',
                  )}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Vencendo ({expiringCount})
                </button>
              </div>

              {/* Campo de Busca */}
              <div className="relative min-w-[220px] sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto ou categoria..."
                  className="w-full h-8 pl-8 pr-7 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    aria-label="Limpar busca"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Categorias Secundárias */}
            {cats.length >= 2 && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[11px] text-zinc-500 mr-1">Filtrar por:</span>
                <button
                  type="button"
                  onClick={() => setCategoryFilter(null)}
                  className={cn(
                    'chip px-2 py-0.5 text-[11px] transition-colors',
                    categoryFilter === null
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                      : 'text-zinc-500 hover:text-zinc-300',
                  )}
                >
                  Todas
                </button>
                {cats.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() =>
                      setCategoryFilter(categoryFilter === c.name ? null : c.name)
                    }
                    className={cn(
                      'chip px-2 py-0.5 text-[11px] transition-colors',
                      categoryFilter === c.name
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'text-zinc-500 hover:text-zinc-300',
                    )}
                  >
                    {c.name}
                    <span className="ml-1 font-num text-[9px] opacity-70">({c.count})</span>
                  </button>
                ))}
              </div>
            )}

            {/* Conteúdo: Lista Compacta vs Cards */}
            {data.items.length === 0 ? (
              <EmptyState
                icon={<ShoppingBasket className="h-5 w-5" />}
                title="Despensa vazia"
                description="Cadastre itens para acompanhar estoque, validade e gerar a lista de compras."
                action={
                  <Button variant="primary" size="sm" onClick={() => setForm({ mode: 'new' })}>
                    <Plus className="h-3.5 w-3.5" /> Novo item
                  </Button>
                }
              />
            ) : visible.length === 0 ? (
              <EmptyState
                icon={<ShoppingBasket className="h-5 w-5" />}
                title="Nenhum item encontrado"
                description="Tente ajustar a busca ou os filtros de status e categoria."
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setCategoryFilter(null)
                      setStatusTab('all')
                    }}
                  >
                    Limpar filtros
                  </Button>
                }
              />
            ) : viewMode === 'list' ? (
              <PantryListView
                items={visible}
                onEdit={(item) => setForm({ mode: 'edit', item })}
                onRemove={remove}
                onUpdateQty={handleUpdateQty}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((item) => (
                  <PantryItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => setForm({ mode: 'edit', item })}
                    onRemove={remove}
                  />
                ))}
              </div>
            )}
          </div>

          <WebhookExport items={data.items} />
        </>
      )}

      {form && (
        <PantryItemForm
          key={form.mode === 'edit' ? form.item.id : 'new'}
          mode={form.mode}
          item={form.mode === 'edit' ? form.item : undefined}
          categoryOptions={cats.map((c) => c.name)}
          onClose={() => setForm(null)}
          onSubmit={save}
        />
      )}

      {supermarketOpen && (
        <SupermarketModeModal
          open={supermarketOpen}
          items={data?.items ?? []}
          onClose={() => setSupermarketOpen(false)}
          onCompleteShopping={handleCompleteShopping}
        />
      )}
    </div>
  )
}