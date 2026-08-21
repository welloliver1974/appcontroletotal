import { useState } from 'react'
import { Bell, Check, Clock, Globe, Loader2, Send, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { getHermesAdvancedConfig, sendHermesWebhook } from '@/lib/hermes'
import { toast } from '@/stores/toastStore'

interface HermesScheduleModalProps {
  open: boolean
  onClose: () => void
  briefingText: string
}

export function HermesScheduleModal({ open, onClose, briefingText }: HermesScheduleModalProps) {
  const config = getHermesAdvancedConfig()

  const [enabled, setEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('act.hermes.autoBriefing')
      return stored ? JSON.parse(stored).enabled ?? true : true
    } catch {
      return true
    }
  })

  const [scheduleTime, setScheduleTime] = useState(() => {
    try {
      const stored = localStorage.getItem('act.hermes.autoBriefing')
      return stored ? JSON.parse(stored).time || '07:00' : '07:00'
    } catch {
      return '07:00'
    }
  })

  const [channel, setChannel] = useState<'telegram' | 'webhook'>(() => {
    try {
      const stored = localStorage.getItem('act.hermes.autoBriefing')
      return stored ? JSON.parse(stored).channel || 'telegram' : 'telegram'
    } catch {
      return 'telegram'
    }
  })

  const [testing, setTesting] = useState(false)

  const handleSave = () => {
    const payload = {
      enabled,
      time: scheduleTime,
      channel,
      updatedAt: new Date().toISOString(),
    }

    try {
      localStorage.setItem('act.hermes.autoBriefing', JSON.stringify(payload))
    } catch {}

    // Send scheduling trigger to Hermes VPS
    if (config.vpsUrl) {
      void sendHermesWebhook('hermes_schedule_briefing', payload)
    }

    toast.success(`Agendamento matinal configurado para às ${scheduleTime}! ⏰✨`)
    onClose()
  }

  const handleTestDispatch = async () => {
    setTesting(true)
    try {
      if (channel === 'telegram' && !config.vpsUrl) {
        // Direct Telegram share link
        const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(briefingText)}`
        window.open(url, '_blank')
        toast.success('Abrindo Telegram com o resumo matinal! ✈️')
      } else {
        // Trigger VPS webhook
        const res = await sendHermesWebhook('briefing_dispatch', {
          time: scheduleTime,
          channel,
          content: briefingText,
        })
        if (res.ok) {
          toast.success('Resumo disparado com sucesso para seu canal! 🚀')
        } else {
          toast.info('Teste enviado para a fila do Hermes.')
        }
      }
    } catch {
      toast.error('Erro ao testar envio do briefing.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="⏰ Agendamento Matinal do Hermes">
      <div className="space-y-5 pt-1 text-zinc-200">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Configure o Hermes para compilar e enviar seu **Briefing Matinal com IA** automaticamente todas as manhãs diretamente para você.
        </p>

        {/* Toggle Ativar/Desativar */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-indigo-400" />
              Envio Diário Automático
            </h4>
            <p className="text-[11px] text-zinc-400">
              Dispara o resumo dos seus compromissos, despensa e finanças.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Horário Desejado */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            Horário do Envio Matinal
          </label>
          <input
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="input-base text-sm font-mono max-w-xs"
          />
          <p className="text-[11px] text-zinc-500">
            Recomendado: entre 06:30 e 08:00 para planejar o seu dia ao acordar.
          </p>
        </div>

        {/* Canal de Destino */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-indigo-400" />
            Canal de Notificação
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setChannel('telegram')}
              className={`p-3 rounded-xl border text-left transition-all text-xs font-medium flex items-center gap-2 ${
                channel === 'telegram'
                  ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <Send className="h-4 w-4 text-sky-400" />
              <span>Telegram Bot</span>
            </button>

            <button
              type="button"
              onClick={() => setChannel('webhook')}
              className={`p-3 rounded-xl border text-left transition-all text-xs font-medium flex items-center gap-2 ${
                channel === 'webhook'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <Globe className="h-4 w-4 text-emerald-400" />
              <span>Hermes VPS / Zap</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between border-t border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTestDispatch}
            disabled={testing}
            className="text-xs gap-1.5 text-zinc-300 hover:text-white"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-indigo-400" />}
            Testar Envio Agora
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="text-xs gap-1 bg-indigo-600 hover:bg-indigo-500"
            >
              <Check className="h-3.5 w-3.5" />
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
