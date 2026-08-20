import { useState } from 'react'
import { Bot, Copy, RefreshCw, Send, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { DashboardData } from './dashboardData'
import { sendHermesChat } from '@/lib/hermes'
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

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const todayStr = `${y}-${m}-${d}`

  const todayEvents = data.events.filter((e) => e.date === todayStr)
  const lowStock = data.pantry.filter((p) => p.qty <= p.lowThreshold)
  const urgentAssets = data.assets.filter(
    (a) => typeof a.lifePct === 'number' && a.lifePct > 0 && a.lifePct <= 20,
  )

  // Previsões veiculares ativas
  const vehicleAlerts = data.assets
    .filter((a) => a.category === 'carro')
    .map((a) => ({ asset: a, stats: calculateVehiclePredictiveStats(a.id, data.maintenance) }))
    .filter((v) => v.stats && (v.stats.urgency === 'critical' || v.stats.urgency === 'warning'))

  const generateAIBriefing = async () => {
    setLoading(true)
    try {
      const carAlertsText =
        vehicleAlerts.length > 0
          ? `Alerta veicular preditivo: ${vehicleAlerts.map((v) => `${v.asset.name} (${v.stats?.formattedSummary})`).join('; ')}`
          : 'Veículos em dia'

      const prompt = `Gere um briefing matinal rápido, motivador e executivo (em 2 ou 3 frases curtas e diretas) para o meu dia com base nestes dados:
- Compromissos hoje: ${todayEvents.length > 0 ? todayEvents.map((e) => `${e.title} às ${e.timeStart}`).join(', ') : 'Nenhum compromisso marcado'}
- Despensa: ${lowStock.length > 0 ? `${lowStock.length} itens precisando de compra (${lowStock.slice(0, 3).map((i) => i.name).join(', ')})` : 'Estoque 100% em dia'}
- Manutenção: ${urgentAssets.length > 0 ? `${urgentAssets.length} ativo(s) com vida útil crítica (${urgentAssets.map((a) => a.name).join(', ')})` : 'Tudo revisado'}
- Veículos: ${carAlertsText}
- Life-Log: ${data.lifeLog.length} notas recentes registradas.`

      const res = await sendHermesChat([], prompt)
      setBriefing(res.reply)
      try {
        sessionStorage.setItem('act.hermes.briefing', res.reply)
      } catch {}
      toast.success('Briefing do Hermes gerado com IA! 🧠')
    } catch {
      toast.error('Não foi possível gerar o briefing no momento.')
    } finally {
      setLoading(false)
    }
  }

  // Gera briefing dinâmico inteligente se ainda não gerou com IA
  const smartSummary = () => {
    const parts: string[] = []
    if (todayEvents.length > 0) {
      parts.push(`📅 Você tem ${todayEvents.length} compromisso(s) na agenda hoje (próximo: ${todayEvents[0].title}${todayEvents[0].timeStart ? ` às ${todayEvents[0].timeStart}` : ''})`)
    } else {
      parts.push('📅 Sua agenda está livre de compromissos para hoje')
    }

    if (lowStock.length > 0) {
      parts.push(`🛒 ${lowStock.length} item(ns) em falta na despensa (${lowStock.slice(0, 2).map((i) => i.name).join(', ')})`)
    }

    if (vehicleAlerts.length > 0 && vehicleAlerts[0].stats) {
      parts.push(`🚗 Atenção no carro: ${vehicleAlerts[0].stats.formattedSummary}`)
    } else if (urgentAssets.length > 0) {
      parts.push(`⚠️ Atenção na manutenção: ${urgentAssets[0].name} com vida útil baixa`)
    }

    return parts.join('. ') + '.'
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
        ? todayEvents.map((e) => `• ${e.timeStart} - ${e.title}${e.location ? ` (${e.location})` : ''}`).join('\n')
        : `• Nenhum compromisso agendado para hoje.`,
      ``,
      `🛒 *Lista de Compras & Despensa (${lowStock.length} pendentes):*`,
      lowStock.length > 0
        ? lowStock.map((i) => `• ${i.name} (Comprar: ${i.lowThreshold} ${i.unit})`).join('\n')
        : `• Tudo abastecido em casa!`,
      ``,
      `🚗 *Manutenção & Ativos:*`,
      urgentAssets.length > 0
        ? urgentAssets.map((a) => `• ⚠️ ${a.name} (Vida útil: ${a.lifePct}%)`).join('\n')
        : `• Todos os ativos em dia.`,
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

  return (
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
            </div>
            <p className="text-[11px] sm:text-xs text-zinc-300 leading-relaxed max-w-2xl">
              {briefing || smartSummary()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto shrink-0 pt-1 lg:pt-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="text-[11px] sm:text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/60 border border-zinc-700/60 gap-1 px-2 py-1.5 justify-center"
            title="Copiar texto do resumo"
          >
            <Copy className="h-3 w-3" />
            <span>Copiar</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleShareTelegram}
            className="text-[11px] sm:text-xs text-sky-300 hover:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 gap-1 px-2 py-1.5 justify-center"
            title="Enviar resumo formatado para o Telegram"
          >
            <Send className="h-3 w-3" />
            <span>Telegram</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={generateAIBriefing}
            disabled={loading}
            className="flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 text-[11px] sm:text-xs px-2 py-1.5"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span className="truncate">{loading ? 'Gerando...' : 'Atualizar'}</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}

