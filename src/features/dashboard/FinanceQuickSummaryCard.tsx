import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Clock, DollarSign, Wallet } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/feedback'
import { api } from '@/data/api'
import { formatBRL } from '@/lib/utils'
import { syncAllUnsyncedMaintenance } from '@/lib/maintFinanceSync'
import type { FixedBill, SpendingItem } from '@/data/types'

export function FinanceQuickSummaryCard() {
  const [spending, setSpending] = useState<SpendingItem[]>([])
  const [fixedBills, setFixedBills] = useState<FixedBill[]>([])
  const [loading, setLoading] = useState(true)

  const [monthlyBudget, setMonthlyBudgetState] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('act.financas.monthlyBudget')) || 3500
    } catch {
      return 3500
    }
  })

  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  useEffect(() => {
    void syncAllUnsyncedMaintenance().catch(() => 0).then(() => {
      Promise.all([
        api.list<SpendingItem>('spendingEntries').catch(() => []),
        api.list<FixedBill>('fixedBills').catch(() => []),
      ])
        .then(([entries, bills]) => {
          setSpending(Array.isArray(entries) ? entries : [])
          setFixedBills(Array.isArray(bills) ? bills : [])
        })
        .finally(() => setLoading(false))
    })

    try {
      const b = Number(localStorage.getItem('act.financas.monthlyBudget')) || 3500
      setMonthlyBudgetState(b)
    } catch {}
  }, [])

  // Calculate monthly total from date or createdAt matching YYYY-MM
  const monthSpending = spending.filter((s) => {
    const itemDate = s.date || s.createdAt?.slice(0, 10) || ''
    return itemDate.startsWith(currentMonthKey)
  })
  const totalSpent = monthSpending.reduce((acc, s) => acc + (Number(s.amount) || 0), 0)

  // Calculate pending fixed bills for this month
  const pendingBills = fixedBills.filter((b) => !(b.paidMonths || []).includes(currentMonthKey))
  const pendingBillsTotal = pendingBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0)

  // Budget progress & Safe-to-Spend
  const budgetUsedPct = Math.min(100, Math.round((totalSpent / monthlyBudget) * 100))
  const remainingBudget = Math.max(0, monthlyBudget - totalSpent)
  
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1)
  const safeToSpendPerDay = Math.max(0, remainingBudget / daysRemaining)

  if (loading) return null

  return (
    <Card className="flex flex-col p-3.5 sm:p-4 space-y-3.5 sm:space-y-4 border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20 w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 truncate">
              Finanças & Safe-to-Spend
            </h4>
            <p className="text-[11px] text-zinc-500 truncate">
              Cota livre: <strong className="text-indigo-400 font-num">{formatBRL(safeToSpendPerDay)}/dia</strong> ({daysRemaining}d restantes)
            </p>
          </div>
        </div>

        <Link
          to="/financas"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
        >
          <span>Ver mais</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Grid de Métricas Diretas: Total Gasto, Contas a Pagar e Safe-to-Spend */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 w-full min-w-0">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 sm:p-3 space-y-0.5 sm:space-y-1 min-w-0 overflow-hidden">
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1 truncate">
            <DollarSign className="h-3 w-3 text-emerald-400 shrink-0" />
            <span className="truncate">Total Gasto</span>
          </span>
          <p className="text-sm sm:text-base font-bold font-num text-zinc-100 truncate">
            {formatBRL(totalSpent)}
          </p>
          <p className="text-[9.5px] sm:text-[10px] text-zinc-500 truncate">
            {monthSpending.length} lançamentos
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-2.5 sm:p-3 space-y-0.5 sm:space-y-1 min-w-0 overflow-hidden">
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1 truncate">
            <Clock className="h-3 w-3 text-amber-400 shrink-0" />
            <span className="truncate">Contas a Pagar</span>
          </span>
          <p className="text-sm sm:text-base font-bold font-num text-amber-300 truncate">
            {formatBRL(pendingBillsTotal)}
          </p>
          <p className="text-[9.5px] sm:text-[10px] text-zinc-500 truncate">
            {pendingBills.length} pendentes
          </p>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-2.5 sm:p-3 space-y-0.5 sm:space-y-1 min-w-0 overflow-hidden">
          <span className="text-[9.5px] sm:text-[10px] font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1 truncate">
            <Wallet className="h-3 w-3 text-indigo-400 shrink-0" />
            <span className="truncate">Livre / Dia</span>
          </span>
          <p className="text-sm sm:text-base font-bold font-num text-indigo-300 truncate">
            {formatBRL(safeToSpendPerDay)}
          </p>
          <p className="text-[9.5px] sm:text-[10px] text-indigo-400/80 truncate">
            até fim do mês
          </p>
        </div>
      </div>

      {/* Barra de Progresso do Orçamento */}
      <div className="space-y-1.5 pt-0.5 sm:pt-1 min-w-0 w-full">
        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] sm:text-xs">
          <span className="text-zinc-400 truncate">
            Utilizado: <strong className="text-zinc-200">{budgetUsedPct}%</strong>
          </span>
          <span className="font-num text-zinc-400 truncate">
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
