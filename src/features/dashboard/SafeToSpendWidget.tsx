import { useMemo } from 'react'
import { AlertTriangle, CheckCircle, Flame, ShieldAlert, Sparkles, TrendingDown, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { calculateSafeToSpend } from '@/lib/safeToSpend'
import { formatBRL } from '@/lib/utils'
import type { SpendingItem } from '@/data/types'

interface SafeToSpendWidgetProps {
  spending: SpendingItem[]
  monthlyBudget?: number
  onNavigateToFinancas?: () => void
}

export function SafeToSpendWidget({
  spending,
  monthlyBudget,
  onNavigateToFinancas,
}: SafeToSpendWidgetProps) {
  const data = useMemo(() => {
    return calculateSafeToSpend(spending, monthlyBudget)
  }, [spending, monthlyBudget])

  const statusConfig = {
    comfortable: {
      color: 'emerald',
      badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      barColor: 'bg-emerald-500',
      icon: CheckCircle,
      textColor: 'text-emerald-400',
      borderClass: 'border-emerald-500/20',
      bgGlow: 'from-emerald-500/[0.05]',
    },
    attention: {
      color: 'amber',
      badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      barColor: 'bg-amber-500',
      icon: AlertTriangle,
      textColor: 'text-amber-400',
      borderClass: 'border-amber-500/20',
      bgGlow: 'from-amber-500/[0.05]',
    },
    critical: {
      color: 'rose',
      badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      barColor: 'bg-rose-500',
      icon: ShieldAlert,
      textColor: 'text-rose-400',
      borderClass: 'border-rose-500/25',
      bgGlow: 'from-rose-500/[0.07]',
    },
  }[data.paceStatus]

  const StatusIcon = statusConfig.icon

  return (
    <Card
      className={`p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br ${statusConfig.bgGlow} via-zinc-900/60 to-zinc-950/80 ${statusConfig.borderClass} shadow-lg shadow-black/20`}
    >
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-zinc-100 flex items-center gap-1.5">
              <span>Safe-to-Spend Diário</span>
              <span className="chip px-1.5 py-0 text-[10px] text-indigo-300 bg-indigo-500/15 border-indigo-500/30">
                <Sparkles className="h-2.5 w-2.5 inline mr-0.5" /> Hermes Predict
              </span>
            </h3>
          </div>
        </div>

        <span
          className={`chip px-2 py-0.5 text-[11px] font-medium border flex items-center gap-1 ${statusConfig.badgeClass}`}
        >
          <StatusIcon className="h-3 w-3" />
          <span>{data.statusMessage}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3.5">
        {/* Safe-to-spend cota diária */}
        <div className="rounded-xl p-3 bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
            <TrendingDown className="h-3.5 w-3.5 text-indigo-400" /> Cota Livre Diária
          </span>
          <div className="mt-1">
            <p className={`font-num font-display text-xl sm:text-2xl font-black ${statusConfig.textColor}`}>
              {data.formattedSafeToSpend}
              <span className="text-xs text-zinc-400 font-normal"> /dia</span>
            </p>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              restam {data.daysRemaining} dias no mês
            </span>
          </div>
        </div>

        {/* Ritmo Diário Atual (Burn Rate) */}
        <div className="rounded-xl p-3 bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
            <Flame className="h-3.5 w-3.5 text-amber-400" /> Burn Rate Médio
          </span>
          <div className="mt-1">
            <p className="font-num font-display text-xl sm:text-2xl font-black text-zinc-200">
              {data.formattedBurnRate}
              <span className="text-xs text-zinc-400 font-normal"> /dia</span>
            </p>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              gasto real até o dia {data.currentDayOfMonth}
            </span>
          </div>
        </div>

        {/* Saldo Restante do Orçamento */}
        <div className="rounded-xl p-3 bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
          <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5 text-emerald-400" /> Saldo Orçado
          </span>
          <div className="mt-1">
            <p className="font-num font-display text-xl sm:text-2xl font-black text-zinc-200">
              {data.formattedRemainingBudget}
            </p>
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              de {formatBRL(data.monthlyBudget)} orçados
            </span>
          </div>
        </div>
      </div>

      {/* Barra de progresso do mês */}
      <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Consumo do orçamento ({data.progressPercent}%)</span>
          <span className="font-num text-zinc-300">
            {formatBRL(data.totalSpentThisMonth)} de {formatBRL(data.monthlyBudget)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusConfig.barColor}`}
            style={{ width: `${Math.min(100, Math.max(3, data.progressPercent))}%` }}
          />
        </div>
      </div>

      {onNavigateToFinancas && (
        <button
          onClick={onNavigateToFinancas}
          className="mt-3 w-full text-center text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors pt-1"
        >
          Ver detalhes em Finanças ➔
        </button>
      )}
    </Card>
  )
}
