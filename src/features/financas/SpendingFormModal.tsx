import { useState } from 'react'
import { Calendar, Check, FileText, Tag, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { SpendingItem } from '@/data/types'

const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Moradia',
  'Saúde',
  'Lazer',
  'Serviços',
  'Despensa',
  'Outros',
]

interface SpendingFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (draft: Omit<SpendingItem, 'id' | 'createdAt'>) => Promise<void>
}

export function SpendingFormModal({ open, onClose, onSubmit }: SpendingFormModalProps) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Alimentação')
  const [note, setNote] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(amount.replace(',', '.'))
    if (isNaN(num) || num <= 0) return

    setSaving(true)
    try {
      await onSubmit({
        amount: num,
        category,
        note: note.trim() || category,
        date,
        time,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Lançamento de Gasto 💵">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {/* Valor */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-300">Valor (R$)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-400">
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              required
              autoFocus
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-base pl-10 font-display text-lg font-bold text-zinc-50 tracking-wide"
            />
          </div>
        </div>

        {/* Descrição / Nota */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-zinc-400" />
            Descrição / O que foi?
          </label>
          <input
            type="text"
            placeholder="Ex.: Almoço executivo, Uber, Farmácia"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input-base text-sm"
          />
        </div>

        {/* Categoria */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-zinc-400" />
            Categoria
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`chip px-2.5 py-1 text-xs transition-colors ${
                  category === cat
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Data e Hora */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-zinc-400 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-base text-xs font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-400">Hora</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="input-base text-xs font-mono"
            />
          </div>
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
            disabled={saving || !amount}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Check className="h-4 w-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Gasto'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
