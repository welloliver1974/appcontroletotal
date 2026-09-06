import { useState } from 'react'
import { Scale } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useFitStore } from '@/stores/fitStore'
import { todayStr } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
}

export function WeightModal({ open, onClose }: Props) {
  const logWeight = useFitStore((s) => s.logWeight)
  const latestWeight = useFitStore((s) => s.getLatestWeight())
  const [weightKg, setWeightKg] = useState<string>(latestWeight ? String(latestWeight.weight_kg) : '')
  const [date, setDate] = useState<string>(todayStr())
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(weightKg.replace(',', '.'))
    if (isNaN(val) || val <= 20 || val >= 300) {
      alert('Por favor informe um peso válido entre 20kg e 300kg.')
      return
    }

    setLoading(true)
    try {
      await logWeight(val, date)
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
        <div className="flex items-center gap-2 text-emerald-400">
          <Scale className="h-4 w-4" />
          <span>Registrar Peso Corporal</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Peso Atual (kg)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              required
              autoFocus
              placeholder="Ex: 78.5"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className="input text-lg font-bold text-zinc-100 placeholder:text-zinc-600 pr-12 w-full"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-500">
              kg
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Data da Pesagem
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
          <Button type="submit" variant="primary" disabled={loading || !weightKg}>
            {loading ? 'Salvando...' : 'Salvar no FitWell'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
