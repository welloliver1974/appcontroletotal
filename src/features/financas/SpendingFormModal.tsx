import { useState } from 'react'
import { Calendar, Camera, Check, FileText, Sparkles, Tag, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'
import type { SpendingItem } from '@/data/types'
import { ReceiptScannerModal } from './ReceiptScannerModal'
import type { ParsedReceiptData } from '@/lib/receiptScanner'

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
  const [scannerOpen, setScannerOpen] = useState(false)

  const handleApplyReceipt = (data: ParsedReceiptData) => {
    if (data.amount > 0) {
      setAmount(data.amount.toFixed(2).replace('.', ','))
    }
    if (data.establishment) {
      setNote(data.establishment)
    }
    if (data.category && CATEGORIES.includes(data.category)) {
      setCategory(data.category)
    }
    if (data.date) {
      setDate(data.date)
    }
    if (data.time) {
      setTime(data.time)
    }
  }

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
      toast.success('Gasto registrado com sucesso! 💵')
      setAmount('')
      setNote('')
      onClose()
    } catch (err) {
      console.error('Erro ao salvar gasto:', err)
      toast.error('Erro ao salvar lançamento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Novo Lançamento de Gasto 💵">
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Botão de Scanner de Cupom com IA */}
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                <Camera className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                  <span>Escanear Cupom Fiscal com IA</span>
                  <span className="chip px-1.5 py-0 text-[9px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                    Otimizado Free Tier
                  </span>
                </p>
                <p className="text-[11px] text-zinc-400">
                  Tire uma foto para preencher valor, loja e data automaticamente
                </p>
              </div>
            </div>
            <Sparkles className="h-4 w-4 text-emerald-400 opacity-70 group-hover:opacity-100 shrink-0" />
          </button>

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

      {scannerOpen && (
        <ReceiptScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onApply={handleApplyReceipt}
        />
      )}
    </>
  )
}
