import { useState } from 'react'
import { Dumbbell } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useFitStore } from '@/stores/fitStore'

interface Props {
  open: boolean
  onClose: () => void
}

export function WorkoutModal({ open, onClose }: Props) {
  const templates = useFitStore((s) => s.templates)
  const logWorkoutSession = useFitStore((s) => s.logWorkoutSession)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates.length > 0 ? templates[0].id : '',
  )
  const [customName, setCustomName] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let name = ''
    if (selectedTemplateId === 'custom') {
      name = customName.trim()
    } else {
      const tpl = templates.find((t) => t.id === selectedTemplateId)
      name = tpl ? tpl.name : customName.trim()
    }

    if (!name) {
      alert('Informe o nome do treino realizado.')
      return
    }

    setLoading(true)
    try {
      await logWorkoutSession(
        name,
        selectedTemplateId !== 'custom' ? selectedTemplateId : undefined,
        notes.trim() || undefined,
      )
      setCustomName('')
      setNotes('')
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
          <Dumbbell className="h-4 w-4" />
          <span>Concluir Sessão de Treino</span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Treino Realizado
          </label>
          <select
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            className="input w-full text-zinc-100 bg-zinc-900 cursor-pointer"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id} className="bg-zinc-900 text-zinc-100">
                {tpl.name}
              </option>
            ))}
            <option value="custom" className="bg-zinc-900 text-zinc-100">
              ➕ Outro Treino / Cardio / Livre...
            </option>
          </select>
        </div>

        {selectedTemplateId === 'custom' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
              Nome do Treino
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Corrida 5km / Treino Funcional"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="input w-full text-zinc-100"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
            Observações / Cargas / Sensação (Opcional)
          </label>
          <textarea
            rows={2}
            placeholder="Ex: Aumentei carga no supino (32kg/lado). Ótimo pump!"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="input w-full text-zinc-100 resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Registrando...' : 'Marcar Treino Concluído 💪'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
