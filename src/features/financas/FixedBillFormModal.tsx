import { useState } from 'react'
import { Calendar, Check, Tag, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { FixedBill } from '@/data/types'

interface FixedBillFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (draft: Omit<FixedBill, 'id' | 'paidMonths'>) => Promise<void>
}

export function FixedBillFormModal({ open, onClose, onSubmit }: FixedBillFormModalProps) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState(10)
  const [category, setCategory] = useState('Moradia')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(amount.replace(',', '.'))
    if (!name.trim() || isNaN(num) || num <= 0) return

    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        amount: num,
        dueDay: Number(dueDay) || 10,
        category,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Conta Fixa / Assinatura 📌">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Nome da Conta */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-300">Nome da Conta / Assinatura</label>
          <input
            type="text"
            required
            autoFocus
            placeholder="Ex.: Internet Fibra, Energia Elétrica, Netflix, Aluguel"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base text-sm"
          />
        </div>

        {/* Valor Médio */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-300">Valor Estimado / Mensal (R$)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-base pl-10 font-display text-base font-bold text-zinc-50"
            />
          </div>
        </div>

        {/* Dia de Vencimento */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            Dia de Vencimento do Mês (1 a 31)
          </label>
          <input
            type="number"
            min={1}
            max={31}
            required
            value={dueDay}
            onChange={(e) => setDueDay(Number(e.target.value))}
            className="input-base text-sm font-mono"
          />
        </div>

        {/* Categoria */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1">
            <Tag className="h-3.5 w-3.5 text-zinc-400" />
            Categoria
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-base text-xs"
          >
            <option value="Moradia">Moradia (Aluguel, Condomínio, Energia, Água)</option>
            <option value="Serviços">Serviços (Internet, Celular)</option>
            <option value="Financeiro">Financeiro (Cartão, Empréstimo, Seguros)</option>
            <option value="Lazer">Lazer & Streaming (Netflix, Spotify, etc.)</option>
            <option value="Saúde">Saúde (Plano de Saúde, Farmácia contínua)</option>
            <option value="Outros">Outros</option>
          </select>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button
            variant="primary"
            size="md"
            type="submit"
            disabled={saving || !name || !amount}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Check className="h-4 w-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Conta Fixa'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
