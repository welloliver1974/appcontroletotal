import { useState } from 'react'
import { Bot, Sparkles, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { DashboardData } from './dashboardData'
import { sendHermesChat } from '@/lib/hermes'
import { toast } from '@/stores/toastStore'

export function HermesBriefingCard({ data }: { data: DashboardData }) {
  const [briefing, setBriefing] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayEvents = data.events.filter((e) => e.date?.startsWith(todayStr))
  const lowStock = data.pantry.filter((p) => p.qty <= p.lowThreshold)

  const generateAIBriefing = async () => {
    setLoading(true)
    try {
      const prompt = `Gere um briefing matinal rápido e amigável (em 2 ou 3 frases curtas e diretas) para o meu dia com base nestes dados:
- Compromissos hoje: ${todayEvents.length > 0 ? todayEvents.map((e) => `${e.title} (${e.timeStart})`).join(', ') : 'Nenhum'}
- Despensa: ${lowStock.length > 0 ? `${lowStock.length} itens com estoque baixo (${lowStock.slice(0, 2).map((i) => i.name).join(', ')})` : 'Estoque ok'}
- Diário/Life-Log: ${data.lifeLog.length} entradas recentes.`

      const res = await sendHermesChat([], prompt)
      setBriefing(res.reply)
      toast.success('Briefing do Hermes gerado! 🧠')
    } catch {
      toast.error('Não foi possível gerar o briefing no momento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="relative overflow-hidden border-indigo-500/30 bg-gradient-to-r from-indigo-950/30 via-zinc-900/60 to-cyan-950/20 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <Bot className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-zinc-100">Briefing Matinal · Hermes AI</h3>
              <span className="chip py-0 text-[10px] text-cyan-300 border-cyan-500/30 bg-cyan-500/10">
                <Sparkles className="h-2.5 w-2.5 mr-1 text-cyan-400" />
                Inteligência Ativa
              </span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
              {briefing ||
                `Hoje você tem ${todayEvents.length} compromisso(s) na agenda e ${lowStock.length} item(ns) em baixa na despensa. Clique para gerar uma análise com IA.`}
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
          {loading ? 'Analisando...' : 'Pedir Conselho com IA'}
        </Button>
      </div>
    </Card>
  )
}
