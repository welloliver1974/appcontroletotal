import { useMemo, useState } from 'react'
import { Check, CheckCircle2, Copy, DollarSign, Send, ShoppingCart, Sparkles, Wallet, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/feedback'
import { toast } from '@/stores/toastStore'
import { cn, formatBRL } from '@/lib/utils'
import type { PantryItem } from '@/data/types'

export interface ShoppingCompleteResult {
  completedItemIds: string[]
  totalSpent: number
  syncFinance: boolean
}

interface SupermarketModeModalProps {
  open: boolean
  items: PantryItem[]
  onClose: () => void
  onCompleteShopping: (result: ShoppingCompleteResult) => Promise<void>
}

export function SupermarketModeModal({
  open,
  items,
  onClose,
  onCompleteShopping,
}: SupermarketModeModalProps) {
  // Filter for needed items (qty <= lowThreshold)
  const neededItems = useMemo(() => items.filter((i) => i.qty <= i.lowThreshold), [items])
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [finishing, setFinishing] = useState(false)
  const [syncWithFinance, setSyncWithFinance] = useState(true)

  // Custom/overridden prices per item id during the trip
  const [customPrices, setCustomPrices] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    for (const it of items) {
      if (it.price !== undefined && it.price > 0) {
        initial[it.id] = it.price
      }
    }
    return initial
  })

  const getQtyNeeded = (item: PantryItem) => {
    return item.lowThreshold > 0 ? item.lowThreshold : 1
  }

  const getItemPrice = (item: PantryItem) => {
    if (customPrices[item.id] !== undefined) return customPrices[item.id]
    return item.price || 0
  }

  const handlePriceChange = (id: string, newPriceStr: string) => {
    const val = Number.parseFloat(newPriceStr.replace(',', '.'))
    setCustomPrices((prev) => ({
      ...prev,
      [id]: Number.isNaN(val) || val < 0 ? 0 : val,
    }))
  }

  // Cost calculations
  const totalEstimatedCost = useMemo(() => {
    return neededItems.reduce((acc, it) => {
      const q = it.lowThreshold > 0 ? it.lowThreshold : 1
      const p = customPrices[it.id] !== undefined ? customPrices[it.id] : (it.price || 0)
      return acc + q * p
    }, 0)
  }, [neededItems, customPrices])

  const cartCost = useMemo(() => {
    return neededItems
      .filter((it) => checkedIds.has(it.id))
      .reduce((acc, it) => {
        const q = it.lowThreshold > 0 ? it.lowThreshold : 1
        const p = customPrices[it.id] !== undefined ? customPrices[it.id] : (it.price || 0)
        return acc + q * p
      }, 0)
  }, [neededItems, checkedIds, customPrices])

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (checkedIds.size === neededItems.length) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(neededItems.map((i) => i.id)))
    }
  }

  const progress = neededItems.length > 0 ? Math.round((checkedIds.size / neededItems.length) * 100) : 100

  const handleFinish = async () => {
    if (checkedIds.size === 0) {
      toast.info('Marque os itens que você colocou no carrinho.')
      return
    }

    setFinishing(true)
    try {
      await onCompleteShopping({
        completedItemIds: Array.from(checkedIds),
        totalSpent: cartCost,
        syncFinance: syncWithFinance && cartCost > 0,
      })
      toast.success(
        `🎉 ${checkedIds.size} itens repostos no estoque${
          syncWithFinance && cartCost > 0 ? ` e ${formatBRL(cartCost)} lançados em Finanças!` : '!'
        }`,
      )
      onClose()
    } catch {
      toast.error('Erro ao atualizar compras.')
    } finally {
      setFinishing(false)
    }
  }

  const formatListText = () => {
    let text = `🛒 *Lista de Compras — Life OS Hub*\n`
    text += `📅 ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}\n`
    if (totalEstimatedCost > 0) {
      text += `💰 Estimativa Total: ${formatBRL(totalEstimatedCost)}\n`
    }
    text += `\n`

    for (const it of neededItems) {
      const checked = checkedIds.has(it.id) ? '✅' : '⬜'
      const q = getQtyNeeded(it)
      const p = getItemPrice(it)
      const priceStr = p > 0 ? ` · ${formatBRL(p * q)}` : ''
      text += `${checked} *${it.name}* (Qtd: ${q} ${it.unit || 'un'}${priceStr} · ${it.category})\n`
    }
    return text
  }

  const handleCopyList = async () => {
    const text = formatListText()
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Lista de compras copiada para a área de transferência! 📋')
    } catch {
      toast.info(text)
    }
  }

  const handleSendToTelegram = async () => {
    const text = formatListText()
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    toast.success('Abrindo Telegram com a lista de compras... ✈️')
  }

  // Agrupar por categoria
  const grouped = neededItems.reduce<Record<string, PantryItem[]>>((acc, item) => {
    const cat = item.category || 'Outros'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <Modal open={open} onClose={onClose} wide title="Modo Supermercado 🛒">
      <div className="space-y-4">
        {/* Banner de Progresso & Totalizadores Financeiros */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-1">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-purple-400" />
                <span className="text-xs uppercase font-semibold tracking-wider text-zinc-400">
                  Itens no Carrinho
                </span>
              </div>
              <p className="text-base font-bold text-zinc-100 font-num">
                {checkedIds.size} <span className="text-xs font-normal text-zinc-500">de {neededItems.length} itens</span>
              </p>
            </div>

            <div className="space-y-1 sm:text-right">
              <div className="flex items-center sm:justify-end gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span className="text-xs uppercase font-semibold tracking-wider text-zinc-400">
                  Subtotal Carrinho
                </span>
              </div>
              <p className="text-lg font-bold text-emerald-400 font-num">
                {formatBRL(cartCost)}{' '}
                {totalEstimatedCost > 0 && (
                  <span className="text-xs font-normal text-zinc-500">
                    / prev. {formatBRL(totalEstimatedCost)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-num">
              <span>Progresso</span>
              <span className="font-semibold text-purple-400">{progress}%</span>
            </div>
            <ProgressBar value={progress} tone={progress === 100 ? 'emerald' : 'violet'} />
          </div>
        </div>

        {/* Ações de Compartilhamento & Seleção */}
        <div className="flex items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            {checkedIds.size === neededItems.length ? 'Desmarcar todos' : 'Marcar todos'}
          </button>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-zinc-300 gap-1.5"
              onClick={handleCopyList}
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copiar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 gap-1.5"
              onClick={handleSendToTelegram}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Telegram ✈️</span>
            </Button>
          </div>
        </div>

        {/* Lista de Itens com Checkboxes & Ajuste de Preço */}
        {neededItems.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h4 className="text-base font-semibold text-zinc-100">Tudo abastecido!</h4>
            <p className="text-xs text-zinc-500">Nenhum produto precisando de compra no momento.</p>
          </div>
        ) : (
          <div className="max-h-[48vh] overflow-y-auto space-y-4 pr-1">
            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-1">
                  {category} ({catItems.length})
                </p>
                <div className="space-y-1.5">
                  {catItems.map((item) => {
                    const isChecked = checkedIds.has(item.id)
                    const qtyNeeded = getQtyNeeded(item)
                    const unitPrice = getItemPrice(item)
                    const itemTotal = unitPrice * qtyNeeded

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center justify-between gap-3 p-3 rounded-xl border transition-all',
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-zinc-300'
                            : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-100',
                        )}
                      >
                        {/* Checkbox e Nome */}
                        <button
                          type="button"
                          onClick={() => toggleItem(item.id)}
                          className="flex items-center gap-3 min-w-0 flex-1 text-left"
                        >
                          <div
                            className={cn(
                              'h-6 w-6 rounded-lg flex items-center justify-center border transition-colors shrink-0',
                              isChecked
                                ? 'bg-emerald-500 border-emerald-400 text-zinc-950'
                                : 'border-zinc-700 bg-zinc-800/80',
                            )}
                          >
                            {isChecked && <Check className="h-4 w-4 stroke-[3]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span
                              className={cn(
                                'text-sm font-medium truncate block',
                                isChecked && 'line-through text-zinc-400',
                              )}
                            >
                              {item.name}
                            </span>
                            <span className="text-[11px] text-zinc-500 font-num">
                              Comprar: <strong className="text-zinc-300">{qtyNeeded} {item.unit || 'un'}</strong>
                            </span>
                          </div>
                        </button>

                        {/* Campo de Preço Unitário & Subtotal */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center bg-zinc-950/80 border border-zinc-800 rounded-lg px-2 py-1 focus-within:border-emerald-500/50">
                            <span className="text-[11px] text-zinc-500 mr-1 font-num">R$</span>
                            <input
                              type="number"
                              min={0}
                              step="0.1"
                              value={unitPrice > 0 ? unitPrice : ''}
                              onChange={(e) => handlePriceChange(item.id, e.target.value)}
                              placeholder="0,00"
                              className="w-14 bg-transparent text-xs font-semibold text-zinc-200 font-num focus:outline-none text-right"
                              title="Preço unitário"
                            />
                          </div>

                          {itemTotal > 0 && (
                            <span className="hidden sm:inline-block text-xs font-semibold font-num text-emerald-400/90 w-16 text-right">
                              {formatBRL(itemTotal)}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Opção de Sincronização com Finanças */}
        {neededItems.length > 0 && cartCost > 0 && (
          <label className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 cursor-pointer hover:bg-emerald-500/10 transition-colors">
            <input
              type="checkbox"
              checked={syncWithFinance}
              onChange={(e) => setSyncWithFinance(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950"
            />
            <div className="flex items-center gap-2 text-xs text-zinc-300 flex-1 min-w-0">
              <Wallet className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="truncate">
                Lançar despesa de <strong className="text-emerald-300 font-num">{formatBRL(cartCost)}</strong> no módulo de Finanças
              </span>
            </div>
          </label>
        )}

        {/* Rodapé com Botão de Finalizar */}
        {neededItems.length > 0 && (
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-800">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" /> Cancelar
            </Button>

            <Button
              variant="primary"
              size="md"
              disabled={finishing || checkedIds.size === 0}
              onClick={handleFinish}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-950/40"
            >
              <Sparkles className="h-4 w-4" />
              <span>Concluir & Repor ({checkedIds.size}) {cartCost > 0 ? `· ${formatBRL(cartCost)}` : ''}</span>
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
