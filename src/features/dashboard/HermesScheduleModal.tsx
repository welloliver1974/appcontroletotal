import { useState } from 'react'
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  HelpCircle,
  Key,
  Loader2,
  Moon,
  Send,
  Sun,
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

const MORNING_PRESETS = ['06:30', '07:00', '07:30', '08:00']
const NIGHT_PRESETS = ['20:30', '21:00', '21:30', '22:00']

export function HermesScheduleModal({ open, onClose, briefingText }: HermesScheduleModalProps) {
  const config = getHermesAdvancedConfig()

  const [morningEnabled, setMorningEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('act.hermes.autoBriefing')
      return stored ? JSON.parse(stored).morningEnabled ?? true : true
    } catch {
      return true
    }
  })

  const [morningTime, setMorningTime] = useState(() => {
    try {
      const stored = localStorage.getItem('act.hermes.autoBriefing')
      return stored ? JSON.parse(stored).morningTime || '07:00' : '07:00'
    } catch {
      return '07:00'
    }
  })

  const [nightEnabled, setNightEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('act.hermes.autoBriefing')
      return stored ? JSON.parse(stored).nightEnabled ?? true : true
    } catch {
      return true
    }
  })

  const [nightTime, setNightTime] = useState(() => {
    try {
      const stored = localStorage.getItem('act.hermes.autoBriefing')
      return stored ? JSON.parse(stored).nightTime || '21:30' : '21:30'
    } catch {
      return '21:30'
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

  const [testing, setTesting] = useState<'morning' | 'night' | null>(null)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const handleSave = () => {
    // 1. Salva credenciais do Telegram no Hermes config
    const updatedHermes = {
      ...config,
      telegramBotToken: botToken.trim(),
      telegramChatId: chatId.trim(),
    }
    saveHermesAdvancedConfig(updatedHermes)

    // 2. Salva preferências do agendador duplo
    const payload = {
      enabled: morningEnabled || nightEnabled,
      morningEnabled,
      morningTime,
      nightEnabled,
      nightTime,
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

    toast.success('Agendamentos matinal e noturno salvos com sucesso! ⏰✨')
    onClose()
  }

  const handleTestDispatch = async (mode: 'morning' | 'night') => {
    setTesting(mode)
    setTestResult(null)

    const textToSend =
      mode === 'morning'
        ? briefingText
        : `🌙 *DEBRIEFING NOTURNO — LIFE OS HUB*\n\nBoa noite! Mais um dia concluído com dedicação e disciplina.\n\n📌 Lembre-se de registrar qualquer gasto ou cupom pendente de hoje.\n\nDescanse bem para manter o ritmo e a alta performance amanhã! ✨`

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

        saveHermesAdvancedConfig({
          ...config,
          telegramBotToken: token,
          telegramChatId: chat,
        })

        const res = await sendDirectTelegramMessage(textToSend, token, chat)

        if (res.ok) {
          setTestResult({
            ok: true,
            message: `${mode === 'morning' ? 'Briefing Matinal' : 'Debriefing Noturno'} enviado com sucesso para seu Telegram! 📱✨`,
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
        if (!config.vpsUrl || !config.vpsUrl.trim()) {
          setTestResult({
            ok: false,
            message: 'URL da VPS não configurada em Configurações ➔ Hermes.',
          })
          toast.error('URL da VPS não configurada!')
          return
        }

        const res = await sendHermesWebhook(mode === 'morning' ? 'briefing_dispatch' : 'debriefing_dispatch', {
          mode,
          channel: 'webhook',
          content: textToSend,
        })

        if (res.ok) {
          setTestResult({
            ok: true,
            message: `VPS respondeu com sucesso: ${res.response || 'OK'}`,
          })
          toast.success('Disparo enviado para a VPS com sucesso! 🚀')
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
      setTesting(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="⏰ Agendamentos do Hermes (Matinal & Noturno)">
      <div className="space-y-4 pt-1 text-zinc-200">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Receba o **Briefing Matinal com IA** para planejar seu dia e o **Debriefing Noturno** para fechar o dia com tranquilidade direto no seu Telegram.
        </p>

        {/* 1. Card Matinal */}
        <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <Sun className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-zinc-100">☀️ Briefing Matinal</h4>
                <p className="text-[10px] text-zinc-400">Agenda de 2 dias, clima, compras e metas do dia</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={morningEnabled}
                onChange={(e) => setMorningEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {morningEnabled && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-500/20">
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1">
                <select
                  value={morningTime.split(':')[0] || '07'}
                  onChange={(e) => {
                    const h = e.target.value
                    const m = morningTime.split(':')[1] || '00'
                    setMorningTime(`${h}:${m}`)
                  }}
                  className="bg-transparent text-xs font-bold font-mono text-amber-300 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                    <option key={h} value={h} className="bg-zinc-900 text-zinc-200">
                      {h}h
                    </option>
                  ))}
                </select>
                <span className="text-zinc-500 font-bold">:</span>
                <select
                  value={morningTime.split(':')[1] || '00'}
                  onChange={(e) => {
                    const h = morningTime.split(':')[0] || '07'
                    const m = e.target.value
                    setMorningTime(`${h}:${m}`)
                  }}
                  className="bg-transparent text-xs font-bold font-mono text-amber-300 focus:outline-none cursor-pointer"
                >
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                    <option key={m} value={m} className="bg-zinc-900 text-zinc-200">
                      {m} min
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-1">
                {MORNING_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMorningTime(t)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-all ${
                      morningTime === t
                        ? 'bg-amber-500/30 border-amber-500 text-amber-200 font-bold'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Card Noturno */}
        <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <Moon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-zinc-100">🌙 Debriefing Noturno</h4>
                <p className="text-[10px] text-zinc-400">Fechamento de gastos do dia e checklist para dormir</p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={nightEnabled}
                onChange={(e) => setNightEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {nightEnabled && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-purple-500/20">
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1">
                <select
                  value={nightTime.split(':')[0] || '21'}
                  onChange={(e) => {
                    const h = e.target.value
                    const m = nightTime.split(':')[1] || '30'
                    setNightTime(`${h}:${m}`)
                  }}
                  className="bg-transparent text-xs font-bold font-mono text-purple-300 focus:outline-none cursor-pointer"
                >
                  {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                    <option key={h} value={h} className="bg-zinc-900 text-zinc-200">
                      {h}h
                    </option>
                  ))}
                </select>
                <span className="text-zinc-500 font-bold">:</span>
                <select
                  value={nightTime.split(':')[1] || '30'}
                  onChange={(e) => {
                    const h = nightTime.split(':')[0] || '21'
                    const m = e.target.value
                    setNightTime(`${h}:${m}`)
                  }}
                  className="bg-transparent text-xs font-bold font-mono text-purple-300 focus:outline-none cursor-pointer"
                >
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                    <option key={m} value={m} className="bg-zinc-900 text-zinc-200">
                      {m} min
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-1">
                {NIGHT_PRESETS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNightTime(t)}
                    className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-all ${
                      nightTime === t
                        ? 'bg-purple-600/30 border-purple-500 text-purple-200 font-bold'
                        : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Canal de Destino */}
        <div className="space-y-1.5">
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
              className={`p-2.5 rounded-xl border text-left transition-all text-xs font-medium flex flex-col gap-0.5 ${
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
                {botToken && chatId ? '✓ 100% Configurado' : '⚠️ Requer Token + Chat ID'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setChannel('webhook')
                setTestResult(null)
              }}
              className={`p-2.5 rounded-xl border text-left transition-all text-xs font-medium flex flex-col gap-0.5 ${
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

        {/* Configuração Rápida do Telegram Bot */}
        {channel === 'telegram' && (
          <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-950/10 space-y-2.5">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowTelegramSetup(!showTelegramSetup)}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                <Key className="h-3.5 w-3.5 text-sky-400" />
                <span>Credenciais do Bot do Telegram (Envio Direto)</span>
              </div>
              <button type="button" className="text-sky-400 p-0.5">
                {showTelegramSetup ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showTelegramSetup && (
              <div className="space-y-2 pt-1 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400">Token do Bot (criado no @BotFather)</label>
                  <input
                    type="password"
                    placeholder="Ex: 8638107104:AAHd2IY..."
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
                    placeholder="Ex: 497789001"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    className="input-base text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback visual de teste */}
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
        <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800">
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTestDispatch('morning')}
              disabled={Boolean(testing)}
              className="text-[11px] gap-1 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:bg-amber-500/10 px-2 py-1"
            >
              {testing === 'morning' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sun className="h-3 w-3" />}
              Testar ☀️
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTestDispatch('night')}
              disabled={Boolean(testing)}
              className="text-[11px] gap-1 text-purple-300 hover:text-purple-200 border border-purple-500/30 hover:bg-purple-500/10 px-2 py-1"
            >
              {testing === 'night' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Moon className="h-3 w-3" />}
              Testar 🌙
            </Button>
          </div>

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
              Salvar Agendamentos
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
