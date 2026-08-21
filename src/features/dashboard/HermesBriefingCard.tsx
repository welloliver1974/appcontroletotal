import { useEffect, useState } from 'react'
import {
  Bot,
  Clock,
  Copy,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  Volume2,
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { DashboardData } from './dashboardData'
import { generateFastAIBriefing } from '@/lib/fastBriefing'
import { fetchCurrentWeather, type WeatherData } from '@/lib/weatherService'
import { speakText, stopSpeaking } from '@/lib/speechSynthesis'
import { HermesScheduleModal } from './HermesScheduleModal'
import { toast } from '@/stores/toastStore'
import { calculateVehiclePredictiveStats } from '@/features/manutencao/predictiveMaint'

export function HermesBriefingCard({ data }: { data: DashboardData }) {
  const [briefing, setBriefing] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('act.hermes.briefing') || null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [isPlayingVoice, setIsPlayingVoice] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  // Carregar clima em background
  useEffect(() => {
    let active = true
    fetchCurrentWeather().then((w) => {
      if (active && w) setWeather(w)
    })
    return () => {
      active = false
      stopSpeaking()
    }
  }, [])

  const now = new Date()
  const todayIso = now.toISOString().slice(0, 10)
  const tomorrowIso = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

  const todayEvents = (data.events || [])
    .filter((e) => e.date === todayIso)
    .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''))

  const tomorrowEvents = (data.events || [])
    .filter((e) => e.date === tomorrowIso)
    .sort((a, b) => (a.timeStart || '').localeCompare(b.timeStart || ''))

  const lowStock = (data.pantry || []).filter((p) => Number(p.qty || 0) <= Number(p.lowThreshold || 1))

  // Manutenções com data explícita próxima
  const urgentAssets = (data.assets || []).filter((a) => {
    if (!a.nextMaintenance || !/^\d{4}-\d{2}-\d{2}/.test(a.nextMaintenance)) return false
    return a.nextMaintenance <= tomorrowIso
  })

  // Previsões veiculares com dados suficientes
  const vehicleAlerts = (data.assets || [])
    .filter((a) => a.category === 'carro' || a.category === 'moto')
    .map((a) => ({ asset: a, stats: calculateVehiclePredictiveStats(a.id, data.maintenance || []) }))
    .filter((v) => v.stats && v.stats.hasEnoughData && (v.stats.urgency === 'critical' || v.stats.urgency === 'warning'))

  const generateAIBriefing = async () => {
    setLoading(true)
    try {
      const generated = await generateFastAIBriefing(data)
      setBriefing(generated)
      try {
        sessionStorage.setItem('act.hermes.briefing', generated)
      } catch {}
      toast.success('Briefing do Hermes atualizado com sucesso! 🧠✨')
    } catch (err) {
      console.warn('[Briefing] Error generating AI briefing:', err)
      toast.error('Não foi possível gerar o briefing no momento.')
    } finally {
      setLoading(false)
    }
  }

  // Gera briefing dinâmico inteligente se ainda não gerou com IA
  const smartSummary = () => {
    const sentences: string[] = []

    if (todayEvents.length > 0) {
      sentences.push(
        `Hoje você tem ${todayEvents.length} compromisso(s), iniciando com "${todayEvents[0].title}"${todayEvents[0].timeStart ? ` às ${todayEvents[0].timeStart}` : ''}.`,
      )
    } else {
      sentences.push('Sua agenda está livre de compromissos para hoje.')
    }

    if (tomorrowEvents.length > 0) {
      sentences.push(
        `Para amanhã, constam ${tomorrowEvents.length} atividade(s) agendada(s) (próximo: "${tomorrowEvents[0].title}"${tomorrowEvents[0].timeStart ? ` às ${tomorrowEvents[0].timeStart}` : ''}).`,
      )
    }

    if (lowStock.length > 0) {
      sentences.push(
        `Na despensa, ${lowStock.length} item(ns) estão em baixa (${lowStock.slice(0, 2).map((i) => i.name).join(', ')}).`,
      )
    } else if (vehicleAlerts.length > 0 && vehicleAlerts[0].stats) {
      sentences.push(`No veículo: ${vehicleAlerts[0].stats.formattedSummary}.`)
    } else if (urgentAssets.length > 0) {
      sentences.push(`Atenção à revisão de ${urgentAssets[0].name}.`)
    }

    return sentences.join(' ')
  }

  const formatTelegramBriefing = () => {
    const todayFormatted = now.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
    })

    const lines = [
      `☀️ *BOM DIA! RESUMO MATINAL — LIFE OS HUB*`,
      `📅 *Data:* ${todayFormatted}`,
      ``,
      `🤖 *Mensagem do Hermes:*`,
      `"${briefing || smartSummary()}"`,
      ``,
      `📌 *Compromissos de Hoje (${todayEvents.length}):*`,
      todayEvents.length > 0
        ? todayEvents.map((e) => `• ${e.timeStart ? `${e.timeStart} - ` : ''}${e.title}${e.location ? ` (${e.location})` : ''}`).join('\n')
        : `• Nenhum compromisso agendado para hoje.`,
      ``,
      `📅 *Compromissos de Amanhã (${tomorrowEvents.length}):*`,
      tomorrowEvents.length > 0
        ? tomorrowEvents.map((e) => `• ${e.timeStart ? `${e.timeStart} - ` : ''}${e.title}${e.location ? ` (${e.location})` : ''}`).join('\n')
        : `• Agenda de amanhã livre.`,
      ``,
      `🛒 *Lista de Compras & Despensa (${lowStock.length} pendentes):*`,
      lowStock.length > 0
        ? lowStock.map((i) => `• ${i.name} (Comprar: ${i.lowThreshold} ${i.unit})`).join('\n')
        : `• Tudo abastecido em casa!`,
      ``,
      `🚀 _Gerado automaticamente pelo Life OS Hub_`,
    ]

    return lines.join('\n')
  }

  const handleShareTelegram = () => {
    const text = formatTelegramBriefing()
    const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
    toast.success('Abrindo Telegram... ✈️')
  }

  const handleCopy = async () => {
    const text = formatTelegramBriefing()
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Resumo matinal copiado para a área de transferência! 📋')
    } catch {
      toast.info('Texto pronto para envio.')
    }
  }

  const handleToggleVoice = () => {
    if (isPlayingVoice) {
      stopSpeaking()
      setIsPlayingVoice(false)
      toast.info('Áudio pausado.')
      return
    }

    const textToSpeak = briefing || smartSummary()
    const success = speakText(textToSpeak, {
      onStart: () => setIsPlayingVoice(true),
      onEnd: () => setIsPlayingVoice(false),
      onError: () => setIsPlayingVoice(false),
    })

    if (success) {
      setIsPlayingVoice(true)
      toast.success('Hermes narrando seu briefing matinal... 🎧')
    } else {
      toast.error('Síntese de voz não suportada neste dispositivo.')
    }
  }

  return (
    <>
      <Card className="relative overflow-hidden border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-zinc-900/60 to-cyan-950/20 p-3.5 sm:p-5 shadow-lg shadow-indigo-950/20 w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 w-full">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
              <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="font-semibold text-xs sm:text-sm text-zinc-100 truncate">Briefing do Hermes</h3>
                
                <span className="chip py-0 px-2 text-[9px] sm:text-[10px] text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                  <Sparkles className="h-2.5 w-2.5 mr-1 text-cyan-400" />
                  IA Ativa
                </span>

                {weather && (
                  <span className="chip py-0 px-2 text-[9px] sm:text-[10px] text-amber-300 border-amber-500/30 bg-amber-500/10 flex items-center gap-1" title={`${weather.description} - ${weather.cityName}`}>
                    <span>{weather.icon}</span>
                    <span>{weather.temperature}°C</span>
                    <span className="hidden md:inline text-zinc-400">({weather.cityName})</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-300 leading-relaxed max-w-2xl">
                {briefing || smartSummary()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto shrink-0 pt-1 lg:pt-0">
            {/* 1. Botão Ouvir Voz */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleVoice}
              className={`text-[11px] sm:text-xs gap-1 px-2.5 py-1.5 justify-center transition-all ${
                isPlayingVoice
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 animate-pulse'
                  : 'text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30'
              }`}
              title={isPlayingVoice ? 'Parar leitura por voz' : 'Ouvir briefing narrado por voz'}
            >
              {isPlayingVoice ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
              <span>{isPlayingVoice ? 'Parar' : 'Ouvir'}</span>
            </Button>

            {/* 2. Botão Agendar Envio */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowScheduleModal(true)}
              className="text-[11px] sm:text-xs text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 gap-1 px-2.5 py-1.5 justify-center"
              title="Configurar envio matinal automático"
            >
              <Clock className="h-3 w-3" />
              <span>Agendar</span>
            </Button>

            {/* 3. Botão Copiar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="text-[11px] sm:text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 border border-zinc-700/60 gap-1 px-2.5 py-1.5 justify-center"
              title="Copiar texto do resumo"
            >
              <Copy className="h-3 w-3" />
              <span>Copiar</span>
            </Button>

            {/* 4. Botão Telegram */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShareTelegram}
              className="text-[11px] sm:text-xs text-sky-300 hover:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 gap-1 px-2.5 py-1.5 justify-center"
              title="Enviar resumo formatado para o Telegram"
            >
              <Send className="h-3 w-3" />
              <span>Telegram</span>
            </Button>

            {/* 5. Botão Atualizar */}
            <Button
              variant="primary"
              size="sm"
              onClick={generateAIBriefing}
              disabled={loading}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 text-[11px] sm:text-xs px-2.5 py-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              <span className="truncate">{loading ? 'Gerando...' : 'Atualizar'}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de Agendamento Matinal Automático */}
      {showScheduleModal && (
        <HermesScheduleModal
          open={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          briefingText={formatTelegramBriefing()}
        />
      )}
    </>
  )
}

