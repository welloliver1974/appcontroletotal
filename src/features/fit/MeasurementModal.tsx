import { useState } from 'react'
import { Ruler, Target } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useFitStore } from '@/stores/fitStore'
import { todayStr, cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  initialLabel?: string
}

const REGION_CATEGORIES = [
  {
    name: 'Tronco & Core',
    items: ['Cintura', 'Abdômen', 'Quadril', 'Peitoral / Tórax', 'Ombros'],
  },
  {
    name: 'Membros Superiores',
    items: ['Braço Direito', 'Braço Esquerdo', 'Antebraço Direito', 'Antebraço Esquerdo', 'Pescoço'],
  },
  {
    name: 'Membros Inferiores',
    items: ['Coxa Direita', 'Coxa Esquerda', 'Panturrilha Direita', 'Panturrilha Esquerda'],
  },
]

export function MeasurementModal({ open, onClose, initialLabel }: Props) {
  const { logMeasurement, setMeasurementGoal, measurementGoals } = useFitStore()
  const [label, setLabel] = useState<string>(initialLabel || 'Cintura')
  const [customLabel, setCustomLabel] = useState<string>('')
  const [valueCm, setValueCm] = useState<string>('')
  const [goalCm, setGoalCm] = useState<string>('')
  const [date, setDate] = useState<string>(todayStr())
  const [loading, setLoading] = useState(false)

  const handleSelectLabel = (item: string) => {
    setLabel(item)
    const existingGoal = measurementGoals[item.toLowerCase().trim()]
    if (existingGoal) setGoalCm(String(existingGoal))
    else setGoalCm('')
  }

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
      if (goalCm) {
        const goalVal = parseFloat(goalCm.replace(',', '.'))
        if (!isNaN(goalVal) && goalVal > 5) {
          setMeasurementGoal(targetLabel, goalVal)
        }
      }
      setValueCm('')
      setGoalCm('')
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
        {/* Chips de Regiões Anatômicas */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Escolha a Região Anatômica
          </label>
          <div className="space-y-2.5">
            {REGION_CATEGORIES.map((cat) => (
              <div key={cat.name} className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                  {cat.name}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map((item) => {
                    const isSelected = label === item
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handleSelectLabel(item)}
                        className={cn(
                          'px-2.5 py-1 text-xs rounded-lg font-medium transition-all',
                          isSelected
                            ? 'bg-cyan-500 text-white shadow-sm font-semibold'
                            : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80',
                        )}
                      >
                        {item}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setLabel('Outro')}
              className={cn(
                'px-2.5 py-1 text-xs rounded-lg font-medium transition-all',
                label === 'Outro'
                  ? 'bg-cyan-500 text-white shadow-sm font-semibold'
                  : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80',
              )}
            >
              ➕ Outro local personalizado...
            </button>
          </div>
        </div>

        {label === 'Outro' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Nome do Local Personalizado
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Pulso, Trapézio, etc."
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              className="input w-full text-zinc-100"
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Valor da Medida Atual */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Medida Atual ({label})
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

          {/* Meta Opcional */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1">
              <Target className="h-3 w-3 text-cyan-400" />
              <span>Meta Desejada (Opcional)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 78.0"
                value={goalCm}
                onChange={(e) => setGoalCm(e.target.value)}
                className="input text-lg font-bold text-cyan-300 placeholder:text-zinc-600 pr-12 w-full border-cyan-500/30"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">
                cm
              </span>
            </div>
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
          <Button type="submit" variant="primary" disabled={loading || !valueCm} className="bg-cyan-500 hover:bg-cyan-400 text-white">
            {loading ? 'Salvando...' : 'Salvar Medida'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
