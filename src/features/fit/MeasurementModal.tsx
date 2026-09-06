import { useState } from 'react'
import { Ruler } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useFitStore } from '@/stores/fitStore'
import { todayStr } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  initialLabel?: string
}

const COMMON_LABELS = [
  'Cintura',
  'Braço Direito',
  'Braço Esquerdo',
  'Peitoral / Tórax',
  'Abdômen',
  'Quadril',
  'Coxa Direita',
  'Coxa Esquerda',
  'Panturrilha Direita',
  'Panturrilha Esquerda',
  'Ombros',
  'Pescoço',
]

export function MeasurementModal({ open, onClose, initialLabel }: Props) {
  const logMeasurement = useFitStore((s) => s.logMeasurement)
  const [label, setLabel] = useState<string>(initialLabel || 'Cintura')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [valueCm, setValueCm] = useState<string>('')
  const [date, setDate] = useState<string>(todayStr())
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetLabel = label === 'Outro' ? customLabel.trim() : label
    const val = parseFloat(valueCm.replace(',', '.'))
    if (!targetLabel) {
      alert('Informe o nome da medida.')
      return
    }
    if (isNaN(val) || val <= 5 || val >= 300) {
      alert('Informe um valor válido em cm (ex: 84.5).')
      return
    }

    setLoading(true)
    try {
      await logMeasurement(targetLabel, val, date)
      setValueCm('')
      setCustomLabel('')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-cyan-400">
          <Ruler className="h-4 w-4" />
          <span>Registrar Medida Corporal</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Local da Medição
          </label>
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input w-full text-zinc-100 bg-zinc-900 cursor-pointer"
          >
            {COMMON_LABELS.map((item) => (
              <option key={item} value={item} className="bg-zinc-900 text-zinc-100">
                {item}
              </option>
            ))}
            <option value="Outro" className="bg-zinc-900 text-zinc-100">
              ➕ Outro local personalizado...
            </option>
          </select>
        </div>

        {label === 'Outro' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Nome do Local
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Antebraço Direito"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="input w-full text-zinc-100"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Circunferência / Medida (cm)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              required
              autoFocus
              placeholder="Ex: 84.5"
              value={valueCm}
              onChange={(e) => setValueCm(e.target.value)}
              className="input text-lg font-bold text-zinc-100 placeholder:text-zinc-600 pr-12 w-full"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">
              cm
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Data da Medição
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input w-full text-zinc-200"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !valueCm}>
            {loading ? 'Salvando...' : 'Salvar Medida'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
