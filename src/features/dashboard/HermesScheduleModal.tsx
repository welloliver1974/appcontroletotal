import { useState } from 'react'
import {
  AlertCircle,
  Bell,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Globe,
  HelpCircle,
  Key,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import {
  getHermesAdvancedConfig,
  saveHermesAdvancedConfig,
  sendDirectTelegramMessage,
  sendHermesWebhook,
} from '@/lib/hermes'
import { toast } from '@/stores/toastStore'

interface HermesScheduleModalProps {
  open: boolean
  onClose: () => void
  briefingText: string
}

const PRESET_TIMES = ['06:30', '07:00', '07:30', '08:00', '08:30']

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

  const [botToken, setBotToken] = useState(config.telegramBotToken || '')
  const [chatId, setChatId] = useState(config.telegramChatId || '')
  const [showTelegramSetup, setShowTelegramSetup] = useState(
    !config.telegramBotToken || !config.telegramChatId,
  )

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const handleSave = () => {
    // 1. Salva credenciais do Telegram no Hermes config
    const updatedHermes = {
      ...config,
      telegramBotToken: botToken.trim(),
      telegramChatId: chatId.trim(),
    }
    saveHermesAdvancedConfig(updatedHermes)

    // 2. Salva preferências do agendador
    const payload = {
      enabled,
      time: scheduleTime,
      channel,
      telegramBotToken: botToken.trim(),
      telegramChatId: chatId.trim(),
      updatedAt: new Date().toISOString(),
    }

    try {
      localStorage.setItem('act.hermes.autoBriefing', JSON.stringify(payload))
    } catch {}

    // Notifica VPS se configurada
    if (config.vpsUrl) {
      void sendHermesWebhook('hermes_schedule_briefing', payload)
    }

    toast.success(`Agendamento matinal salvo para às ${scheduleTime}! ⏰✨`)
    onClose()
  }

  const handleTestDispatch = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      if (channel === 'telegram') {
        const token = botToken.trim() || config.telegramBotToken || ''
        const chat = chatId.trim() || config.telegramChatId || ''

        if (!token || !chat) {
          setShowTelegramSetup(true)
          setTestResult({
            ok: false,
            message:
              'Preencha o Token do Bot e o seu Chat ID abaixo para o Telegram receber a mensagem diretamente!',
          })
          toast.error('Informe o Token do Bot e o Chat ID do Telegram.')
          return
        }

        // Salva as credenciais para reutilização futura
        saveHermesAdvancedConfig({
          ...config,
          telegramBotToken: token,
          telegramChatId: chat,
        })

        // Envio Direto via API Oficial do Telegram (sem abrir navegador)
        const res = await sendDirectTelegramMessage(briefingText, token, chat)

        if (res.ok) {
          setTestResult({
            ok: true,
            message: 'Mensagem enviada com sucesso! Olhe seu Telegram agora 📱✨',
          })
          toast.success('Mensagem recebida no seu Telegram! 🚀')
        } else {
          setTestResult({
            ok: false,
            message: `Erro na API do Telegram: ${res.response}`,
          })
          toast.error(res.response)
        }
      } else {
        // Canal Webhook / VPS
        if (!config.vpsUrl || !config.vpsUrl.trim()) {
          setTestResult({
            ok: false,
            message:
              'URL da VPS não configurada. Configure em Configurações ➔ Hermes.',
          })
          toast.error('URL da VPS Hermes não configurada!')
          return
        }

        const res = await sendHermesWebhook('briefing_dispatch', {
          time: scheduleTime,
          channel: 'webhook',
          content: briefingText,
        })

        if (res.ok) {
          setTestResult({
            ok: true,
            message: `VPS respondeu com sucesso: ${res.response || 'OK'}`,
          })
          toast.success('Briefing enviado com sucesso para a VPS! 🚀')
        } else {
          setTestResult({
            ok: false,
            message: `Falha na VPS (Status ${res.status}): ${res.response}`,
          })
          toast.error('Erro na resposta da VPS.')
        }
      }
    } catch (err) {
      setTestResult({
        ok: false,
        message: `Erro no envio: ${err instanceof Error ? err.message : String(err)}`,
      })
      toast.error('Erro ao testar disparo.')
    } finally {
      setTesting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="⏰ Agendamento Matinal do Hermes">
      <div className="space-y-4 pt-1 text-zinc-200">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Receba seu **Briefing com IA** (agenda de 2 dias, clima, finanças e compras) diretamente no seu Telegram todas as manhãs.
        </p>

        {/* Toggle Ativar/Desativar */}
        <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-indigo-400" />
              Envio Diário Automático
            </h4>
            <p className="text-[11px] text-zinc-400">
              Dispara o resumo matinal no horário agendado.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Seletor Visual de Horário */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            Horário do Envio Matinal
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative inline-flex items-center">
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-28 px-2.5 py-1.5 text-center text-sm font-semibold font-mono bg-zinc-900 border border-zinc-700 rounded-xl text-indigo-300 focus:outline-none focus:border-indigo-500 shadow-inner"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {PRESET_TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  onClick={() => setScheduleTime(time)}
                  className={`px-2 py-1 text-[11px] font-mono rounded-lg transition-all border ${
                    scheduleTime === time
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200 font-semibold'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Canal de Destino */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-indigo-400" />
            Canal de Entrega Direta
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setChannel('telegram')
                setTestResult(null)
              }}
              className={`p-3 rounded-xl border text-left transition-all text-xs font-medium flex flex-col gap-1 ${
                channel === 'telegram'
                  ? 'border-sky-500 bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/30'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-sky-400">
                <Send className="h-3.5 w-3.5" />
                <span>Telegram Bot (Direto)</span>
              </div>
              <span className="text-[10px] text-zinc-400">
                {botToken && chatId ? '✓ Pronto para envio direto' : '⚠️ Requer Token + Chat ID'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setChannel('webhook')
                setTestResult(null)
              }}
              className={`p-3 rounded-xl border text-left transition-all text-xs font-medium flex flex-col gap-1 ${
                channel === 'webhook'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                <Globe className="h-3.5 w-3.5" />
                <span>Hermes VPS / Zap</span>
              </div>
              <span className="text-[10px] text-zinc-400">
                {config.vpsUrl ? '✓ VPS Conectada' : 'Não configurado'}
              </span>
            </button>
          </div>
        </div>

        {/* Configuração Rápida do Telegram Bot para Envio Silencioso */}
        {channel === 'telegram' && (
          <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-950/10 space-y-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowTelegramSetup(!showTelegramSetup)}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                <Key className="h-3.5 w-3.5 text-sky-400" />
                <span>Credenciais do Bot do Telegram (Envio Automático)</span>
              </div>
              <button type="button" className="text-sky-400 p-0.5">
                {showTelegramSetup ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showTelegramSetup && (
              <div className="space-y-2.5 pt-1 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400">Token do Bot (criado no @BotFather)</label>
                  <input
                    type="password"
                    placeholder="Ex: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className="input-base text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-zinc-400">Seu Chat ID no Telegram</label>
                    <a
                      href="https://t.me/userinfobot"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
                    >
                      <HelpCircle className="h-2.5 w-2.5" />
                      Como pegar meu Chat ID?
                    </a>
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: 123456789 (mande /start para o @userinfobot)"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    className="input-base text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback visual de diagnóstico do teste */}
        {testResult && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              testResult.ok
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResult.ok ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            )}
            <span className="leading-relaxed">{testResult.message}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 flex items-center justify-between border-t border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTestDispatch}
            disabled={testing}
            className="text-xs gap-1.5 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            )}
            Testar Envio Imediato
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              className="text-xs gap-1 bg-indigo-600 hover:bg-indigo-500 text-white"
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
