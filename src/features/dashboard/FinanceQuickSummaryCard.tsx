import { useEffect, useState } from 'react'
import { ArrowUpRight, Clock, DollarSign, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/feedback'
import { api } from '@/data/api'
import { formatBRL } from '@/lib/utils'
import type { FixedBill, SpendingItem } from '@/data/types'

export function FinanceQuickSummaryCard() {
  const [spending, setSpending] = useState<SpendingItem[]>([])
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([])
  const [loading, setLoading] = useState(true)

  const currentMonthKey = new Date().toISOString().slice(0, 7) // 'YYYY-MM'

  useEffect(() => {
    Promise.all([
      api.list<SpendingItem>('spendingEntries').catch(() => []),
      api.list<FixedBill>('fixedBills').catch(() => []),
    ])
      .then(([entries, bills]) => {
        setSpending(Array.isArray(entries) ? entries : [])
        setFixedBills(Array.isArray(bills) ? bills : [])
      })
      .finally(() => setLoading(false))
  }, [])

  // Calculate monthly total
  const monthSpending = spending.filter((s) => s.date && s.date.startsWith(currentMonthKey))
  const totalSpent = monthSpending.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)

  // Calculate pending fixed bills for this month
  const pendingBills = fixedBills.filter((b) => !(b.paidMonths || []).includes(currentMonthKey))
  const pendingBillsTotal = pendingBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0)
  const paidBills = fixedBills.filter((b) => (b.paidMonths || []).includes(currentMonthKey))

  // Monthly Budget baseline (default or stored)
  const monthlyBudget = 6000
  const budgetUsedPct = Math.min(100, Math.round((totalSpent / monthlyBudget) * 100))
  const remainingBudget = Math.max(0, monthlyBudget - totalSpent)

  if (loading) return null

  return (
    <Card className="flex flex-col p-4 space-y-4 border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Finanças do Mês
            </h4>
            <p className="text-[11px] text-zinc-500">
              Controle direto sem gráficos complexos
            </p>
          </div>
        </div>

        <a
          href="#financas"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          <span>Ver mais</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Grid de Métricas Diretas */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-emerald-400" />
            Total Gasto no Mês
          </span>
          <p className="text-base font-bold font-num text-zinc-100">
            {formatBRL(totalSpent)}
          </p>
          <p className="text-[10px] text-zinc-500">
            {monthSpending.length} lançamentos realizados
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-3 space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
            <Clock className="h-3 w-3 text-amber-400" />
            Contas Pendentes
          </span>
          <p className="text-base font-bold font-num text-amber-300">
            {formatBRL(pendingBillsTotal)}
          </p>
          <p className="text-[10px] text-zinc-500">
            {pendingBills.length} a pagar · {paidBills.length} quitadas
          </p>
        </div>
      </div>

      {/* Barra de Progresso do Orçamento */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400">
            Orçamento Utilizado: <strong>{budgetUsedPct}%</strong>
          </span>
          <span className="font-num text-zinc-400">
            Restante: <strong className="text-zinc-200">{formatBRL(remainingBudget)}</strong>
          </span>
        </div>
        <ProgressBar
          value={budgetUsedPct}
          tone={budgetUsedPct > 90 ? 'rose' : budgetUsedPct > 70 ? 'orange' : 'emerald'}
        />
      </div>
    </Card>
  )
}
