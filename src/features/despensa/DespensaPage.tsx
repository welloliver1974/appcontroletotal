import { useState } from 'react'
import { Plus, ShoppingBasket } from 'lucide-react'
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
import { PantryItemForm, type PantryItemDraft } from './PantryItemForm'
import { WebhookExport } from './WebhookExport'
import { categories, sortItems } from './despensaUtils'

type FormState = null | { mode: 'new' } | { mode: 'edit'; item: PantryItem }

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

/** Fase 4 — Consumo & Despensa: estoque visual, CRUD, sinalização e exportação via webhook. */
export function DespensaPage() {
  const module = MODULE_BY_ID['despensa']
  const { data, setItems } = useDespensaData()
  const [form, setForm] = useState<FormState>(null)
  const [filter, setFilter] = useState<string | null>(null)

  const items = data?.items ?? []
  const cats = categories(items)
  // If the active category no longer exists (e.g. last item deleted), fall back to "all".
  const activeFilter = filter && cats.some((c) => c.name === filter) ? filter : null
  const visible = sortItems(activeFilter ? items.filter((i) => i.category === activeFilter) : items)

  const save = async (draft: PantryItemDraft) => {
    if (!data) return
    if (form?.mode === 'edit') {
      setItems(await api.update<PantryItem>('pantry', form.item.id, draft))
    } else {
      const created = await api.create<PantryItem>('pantry', draft)
      setItems([created, ...data.items])
    }
    setForm(null)
  }

  const remove = async (id: string) => {
    setItems(await api.remove<PantryItem>('pantry', id))
  }

  return (
    <div className="space-y-6">
      <PageHeader module={module} />

      {!data ? (
        <DespensaSkeleton />
      ) : (
        <>
          <Kpis items={data.items} />

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="eyebrow">Estoque</p>
              <Button variant="primary" size="sm" onClick={() => setForm({ mode: 'new' })}>
                <Plus className="h-3.5 w-3.5" /> Novo item
              </Button>
            </div>

            {cats.length >= 2 && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilter(null)}
                  className={cn(
                    'chip px-2.5 py-1 text-xs transition-colors',
                    activeFilter === null
                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                      : 'text-zinc-400 hover:bg-white/5',
                  )}
                >
                  Todas
                </button>
                {cats.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setFilter(c.name)}
                    className={cn(
                      'chip px-2.5 py-1 text-xs transition-colors',
                      activeFilter === c.name
                        ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                        : 'text-zinc-400 hover:bg-white/5',
                    )}
                  >
                    {c.name}
                    <span className="ml-1 font-num text-[10px] opacity-70">{c.count}</span>
                  </button>
                ))}
              </div>
            )}

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
                title={`Nada na categoria "${activeFilter}"`}
                description="Escolha outra categoria ou cadastre um novo item."
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
    </div>
  )
}