import { useState } from 'react'
import { Bot, Sparkles, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { DashboardData } from './dashboardData'
import { sendHermesChat } from '@/lib/hermes'
import { toast } from '@/stores/toastStore'

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
  const urgentAssets = data.assets.filter((a) => a.lifePct <= 20)

  const generateAIBriefing = async () => {
    setLoading(true)
    try {
      const prompt = `Gere um briefing matinal rápido, motivador e executivo (em 2 ou 3 frases curtas e diretas) para o meu dia com base nestes dados:
- Compromissos hoje: ${todayEvents.length > 0 ? todayEvents.map((e) => `${e.title} às ${e.timeStart}`).join(', ') : 'Nenhum compromisso marcado'}
- Despensa: ${lowStock.length > 0 ? `${lowStock.length} itens precisando de compra (${lowStock.slice(0, 3).map((i) => i.name).join(', ')})` : 'Estoque 100% em dia'}
- Manutenção: ${urgentAssets.length > 0 ? `${urgentAssets.length} ativo(s) com vida útil crítica (${urgentAssets.map((a) => a.name).join(', ')})` : 'Tudo revisado'}
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

    if (urgentAssets.length > 0) {
      parts.push(`⚠️ Atenção na manutenção: ${urgentAssets[0].name} com vida útil baixa`)
    }

    return parts.join('. ') + '.'
  }

  return (
    <Card className="relative overflow-hidden border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-zinc-900/60 to-cyan-950/20 p-5 shadow-lg shadow-indigo-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <Bot className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-zinc-100">Briefing do Hermes · Life OS Hub</h3>
              <span className="chip py-0 text-[10px] text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                <Sparkles className="h-2.5 w-2.5 mr-1 text-cyan-400" />
                Inteligência Ativa
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed max-w-2xl">
              {briefing || smartSummary()}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={generateAIBriefing}
          disabled={loading}
          className="shrink-0 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analisando...' : 'Gerar com IA'}
        </Button>
      </div>
    </Card>
  )
}

