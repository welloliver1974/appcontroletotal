import { useState } from 'react'
import { Check, CheckCircle2, Copy, Send, ShoppingCart, Sparkles, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/feedback'
import { toast } from '@/stores/toastStore'
import { cn } from '@/lib/utils'
import type { PantryItem } from '@/data/types'

interface SupermarketModeModalProps {
  open: boolean
  items: PantryItem[]
  onClose: () => void
  onCompleteShopping: (completedItemIds: string[]) => Promise<void>
}

export function SupermarketModeModal({
  open,
  items,
  onClose,
  onCompleteShopping,
}: SupermarketModeModalProps) {
  // Filter for needed items (qty <= lowThreshold)
  const neededItems = items.filter((i) => i.qty <= i.lowThreshold)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [finishing, setFinishing] = useState(false)
  const [sendingTg, setSendingTg] = useState(false)

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
      await onCompleteShopping(Array.from(checkedIds))
      toast.success(`🎉 ${checkedIds.size} itens repostos no estoque com sucesso!`)
      onClose()
    } catch {
      toast.error('Erro ao atualizar estoque dos itens comprados.')
    } finally {
      setFinishing(false)
    }
  }

  const formatListText = () => {
    let text = `🛒 *Lista de Compras — Life OS Hub*\n`
    text += `📅 ${new Date().toLocaleDateString('pt-BR')}\n\n`
    for (const it of neededItems) {
      const checked = checkedIds.has(it.id) ? '✅' : '⬜'
      text += `${checked} *${it.name}* (${it.category})\n`
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
    setSendingTg(true)
    try {
      const res = await fetch('/api/webhook/hermes-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pantry_shopping_list',
          platform: 'telegram',
          summary: text,
          title: 'Lista de Compras',
          items: neededItems.map((i) => ({ name: i.name, category: i.category })),
        }),
      })

      if (res.ok) {
        toast.success('Lista de compras enviada para o Hermes Telegram! 🚀')
      } else {
        await handleCopyList()
      }
    } catch {
      await handleCopyList()
    } finally {
      setSendingTg(false)
    }
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
        {/* Banner de Progresso */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-semibold text-zinc-100">
                {checkedIds.size} de {neededItems.length} no carrinho
              </span>
            </div>
            <span className="font-num text-xs font-bold text-purple-400">{progress}%</span>
          </div>
          <ProgressBar value={progress} tone={progress === 100 ? 'emerald' : 'violet'} />
        </div>

        {/* Ações de Compartilhamento */}
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
              disabled={sendingTg}
              className="h-8 px-2.5 text-xs text-blue-400 hover:text-blue-300 gap-1.5"
              onClick={handleSendToTelegram}
            >
              <Send className="h-3.5 w-3.5" />
              <span>Telegram</span>
            </Button>
          </div>
        </div>

        {/* Lista de Itens com Checkboxes Grandes */}
        {neededItems.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h4 className="text-base font-semibold text-zinc-100">Tudo abastecido!</h4>
            <p className="text-xs text-zinc-500">Nenhum produto precisando de compra no momento.</p>
          </div>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto space-y-4 pr-1">
            {Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-1">
                  {category} ({catItems.length})
                </p>
                <div className="space-y-1">
                  {catItems.map((item) => {
                    const isChecked = checkedIds.has(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleItem(item.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all',
                          isChecked
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-zinc-300 opacity-60'
                            : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-100',
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
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
                          <span
                            className={cn(
                              'text-sm font-medium truncate',
                              isChecked && 'line-through text-zinc-400',
                            )}
                          >
                            {item.name}
                          </span>
                        </div>

                        <span className="text-xs text-zinc-500 shrink-0 font-num">
                          {item.unit}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
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
              className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold"
            >
              <Sparkles className="h-4 w-4" />
              <span>Concluir & Repor Estoque ({checkedIds.size})</span>
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
