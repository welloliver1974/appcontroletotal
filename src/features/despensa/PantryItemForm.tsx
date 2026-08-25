import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { PantryItem } from '@/data/types'

export type PantryItemDraft = Omit<PantryItem, 'id'>

/** Create/edit modal for a pantry item (name, category via datalist, qty/unit, threshold, expiry). */
export function PantryItemForm({
  mode,
  item,
  categoryOptions,
  onClose,
  onSubmit,
}: {
  mode: 'new' | 'edit'
  item?: PantryItem
  categoryOptions: string[]
  onClose: () => void
  onSubmit: (draft: PantryItemDraft) => Promise<void> | void
}) {
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [qty, setQty] = useState(item ? String(item.qty) : '1')
  const [unit, setUnit] = useState(item?.unit ?? '')
  const [lowThreshold, setLowThreshold] = useState(item ? String(item.lowThreshold) : '1')
  const [expiresAt, setExpiresAt] = useState(item?.expiresAt ?? '')
  const [price, setPrice] = useState(item?.price !== undefined ? String(item.price) : '')

  const qtyNum = Number(qty)
  const thresholdNum = Number(lowThreshold)
  const priceNum = price.trim() !== '' ? Number(price) : undefined
  const invalidName = !name.trim()
  const invalidQty = qty.trim() === '' || Number.isNaN(qtyNum) || qtyNum < 0
  const invalidThreshold = lowThreshold.trim() === '' || Number.isNaN(thresholdNum) || thresholdNum < 0
  const invalidPrice = priceNum !== undefined && (Number.isNaN(priceNum) || priceNum < 0)

  const submit = () => {
    if (invalidName || invalidQty || invalidThreshold || invalidPrice) return
    void onSubmit({
      name: name.trim(),
      category: category.trim() || 'Geral',
      qty: qtyNum,
      unit: unit.trim(),
      lowThreshold: thresholdNum,
      expiresAt: expiresAt || undefined,
      price: priceNum,
    })
  }

  return (
    <Modal open onClose={onClose} title={mode === 'edit' ? 'Editar item' : 'Novo item'}>
      <div className="space-y-4">
        <div>
          <label htmlFor="item-name" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Nome
          </label>
          <input
            id="item-name"
            className="input-base"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex.: Arroz integral"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="item-category" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Categoria
          </label>
          <input
            id="item-category"
            className="input-base"
            list="pantry-categories"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="grãos, laticínios, proteínas…"
          />
          <datalist id="pantry-categories">
            {categoryOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="mt-1 text-[11px] text-zinc-600">Digite uma nova ou escolha uma da lista.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="item-qty" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Quantidade
            </label>
            <input
              id="item-qty"
              type="number"
              min={0}
              step="any"
              className="input-base font-num"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="item-unit" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Unidade
            </label>
            <input
              id="item-unit"
              className="input-base"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="kg, L, dúzia, un…"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="item-low" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Estoque mínimo <span className="text-zinc-600">(alerta)</span>
            </label>
            <input
              id="item-low"
              type="number"
              min={0}
              step="any"
              className="input-base font-num"
              value={lowThreshold}
              onChange={(e) => setLowThreshold(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="item-expires" className="mb-1.5 block text-xs font-medium text-zinc-500">
              Validade <span className="text-zinc-600">(opcional)</span>
            </label>
            <input
              id="item-expires"
              type="date"
              className="input-base"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="item-price" className="mb-1.5 block text-xs font-medium text-zinc-500">
            Preço Estimado Unitário (R$) <span className="text-zinc-600">(opcional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-500">
              R$
            </span>
            <input
              id="item-price"
              type="number"
              min={0}
              step="0.01"
              className="input-base font-num pl-9"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <p className="mt-1 text-[11px] text-zinc-600">Usado para calcular estimativa de custo no Modo Supermercado.</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={invalidName || invalidQty || invalidThreshold || invalidPrice}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  )
}