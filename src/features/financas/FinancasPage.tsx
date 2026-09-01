import { useMemo, useState } from 'react'
import {
  Calendar,
  Check,
  CircleDollarSign,
  Edit2,
  Filter,
  Plus,
  Receipt,
  Search,
  Trash2,
  Utensils,
  Car,
  Home,
  HeartPulse,
  Film,
  X,
  CreditCard,
} from 'lucide-react'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Skeleton } from '@/components/ui/feedback'
import { usePendingDelete } from '@/lib/usePendingDelete'
import { cn, isoOffset, todayStr } from '@/lib/utils'
import { useFinancasData } from './useFinancasData'
import { SpendingFormModal } from './SpendingFormModal'
import { FixedBillFormModal } from './FixedBillFormModal'
import { MonthlyReportModal } from './MonthlyReportModal'
import { SafeToSpendWidget } from '@/features/dashboard/SafeToSpendWidget'

const CATEGORY_ICONS: Record<string, { icon: typeof Utensils; color: string; bg: string }> = {
  alimentação: { icon: Utensils, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  transporte: { icon: Car, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
  moradia: { icon: Home, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  saúde: { icon: HeartPulse, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
  lazer: { icon: Film, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
  despensa: { icon: Utensils, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
  serviços: { icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  financeiro: { icon: CircleDollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
}

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function currentMonthStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export function FinancasPage() {
  const module = MODULE_BY_ID['financas']
  const {
    data,
    loading,
    addSpending,
    removeSpending,
    addFixedBill,
    removeFixedBill,
    toggleBillPaid,
    setMonthlyBudget,
  } = useFinancasData()

  const [tab, setTab] = useState<'extrato' | 'contas'>('extrato')
  const [spendingModalOpen, setSpendingModalOpen] = useState(false)
  const [billModalOpen, setBillModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState('')
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const { pendingDelete, request } = usePendingDelete()

  const currentTodayStr = useMemo(() => todayStr(), [])
  const thisMonth = useMemo(() => currentMonthStr(), [])

  // Cálculos do Scorecard
  const { todayTotal, todayCount, weekTotal, monthTotal, remainingBudget } = useMemo(() => {
    if (!data) return { todayTotal: 0, todayCount: 0, weekTotal: 0, monthTotal: 0, remainingBudget: 0 }

    const now = new Date()
    const oneWeekAgo = isoOffset(-7, now)

    let todayT = 0
    let todayC = 0
    let weekT = 0
    let monthT = 0

    for (const item of data.spending) {
      const itemDate = item.date || item.createdAt?.slice(0, 10) || ''
      const amount = Number(item.amount) || 0

      if (itemDate === currentTodayStr) {
        todayT += amount
        todayC += 1
      }
      if (itemDate >= oneWeekAgo && itemDate <= currentTodayStr) {
        weekT += amount
      }
      if (itemDate.startsWith(thisMonth)) {
        monthT += amount
      }
    }

    const remaining = Math.max(0, data.monthlyBudget - monthT)

    return {
      todayTotal: todayT,
      todayCount: todayC,
      weekTotal: weekT,
      monthTotal: monthT,
      remainingBudget: remaining,
    }
  }, [data, todayStr, thisMonth])

  // Filtragem do extrato
  const filteredSpending = useMemo(() => {
    if (!data) return []
    let list = [...data.spending].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

    if (categoryFilter) {
      list = list.filter((i) => i.category.toLowerCase() === categoryFilter.toLowerCase())
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (i) => i.note.toLowerCase().includes(q) || i.category.toLowerCase().includes(q),
      )
    }

    return list
  }, [data, categoryFilter, search])

  // Categorias disponíveis no extrato
  const availableCategories = useMemo(() => {
    if (!data) return []
    const set = new Set(data.spending.map((s) => s.category).filter(Boolean))
    return Array.from(set)
  }, [data])

  const handleSaveBudget = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(budgetInput.replace(',', '.'))
    if (!isNaN(num) && num > 0) {
      setMonthlyBudget(num)
    }
    setEditingBudget(false)
  }

  // Contas fixas cálculos
  const { totalBillsAmount, paidBillsCount, unpaidBillsCount } = useMemo(() => {
    if (!data) return { totalBillsAmount: 0, paidBillsCount: 0, unpaidBillsCount: 0 }
    let total = 0
    let paid = 0
    let unpaid = 0
    for (const b of data.fixedBills) {
      total += Number(b.amount) || 0
      if ((b.paidMonths || []).includes(thisMonth)) {
        paid += 1
      } else {
        unpaid += 1
      }
    }
    return { totalBillsAmount: total, paidBillsCount: paid, unpaidBillsCount: unpaid }
  }, [data, thisMonth])

  return (
    <div className="space-y-6">
      <PageHeader module={module} />

      {loading || !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* 1. SCORECARD EXECUTIVO (SEM GRÁFICOS) */}
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {/* Gasto Hoje */}
            <Card className="p-4 space-y-2 border-zinc-800/80 bg-zinc-900/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Gasto Hoje
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>
              <p className="font-display font-num text-xl md:text-2xl font-bold text-zinc-50">
                {formatBRL(todayTotal)}
              </p>
              <p className="text-[11px] text-zinc-500">
                {todayCount === 1 ? '1 lançamento hoje' : `${todayCount} lançamentos hoje`}
              </p>
            </Card>

            {/* Gasto Esta Semana */}
            <Card className="p-4 space-y-2 border-zinc-800/80 bg-zinc-900/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Últimos 7 Dias
                </span>
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
              </div>
              <p className="font-display font-num text-xl md:text-2xl font-bold text-zinc-50">
                {formatBRL(weekTotal)}
              </p>
              <p className="text-[11px] text-zinc-500">
                Média de {formatBRL(weekTotal / 7)} / dia
              </p>
            </Card>

            {/* Total do Mês */}
            <Card className="p-4 space-y-2 border-zinc-800/80 bg-zinc-900/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Total em {currentMonthLabel()}
                </span>
                <Receipt className="h-3.5 w-3.5 text-zinc-500" />
              </div>
              <p className="font-display font-num text-xl md:text-2xl font-bold text-emerald-400">
                {formatBRL(monthTotal)}
              </p>
              <p className="text-[11px] text-zinc-500 capitalize">
                {filteredSpending.length} despesas registradas
              </p>
            </Card>

            {/* Teto / Meta Mensal */}
            <Card className="p-4 space-y-2 border-zinc-800/80 bg-zinc-900/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Teto Mensal
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBudgetInput(String(data.monthlyBudget))
                    setEditingBudget(!editingBudget)
                  }}
                  className="text-zinc-500 hover:text-zinc-300"
                  title="Editar teto mensal"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>

              {editingBudget ? (
                <form onSubmit={handleSaveBudget} className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="3500"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="input-base h-7 text-xs font-mono font-bold"
                  />
                  <Button variant="primary" size="sm" type="submit" className="h-7 px-2 text-xs">
                    OK
                  </Button>
                </form>
              ) : (
                <>
                  <p className="font-display font-num text-xl md:text-2xl font-bold text-zinc-200">
                    {formatBRL(remainingBudget)}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    disponíveis de {formatBRL(data.monthlyBudget)}
                  </p>
                </>
              )}
            </Card>
          </div>

          {/* Safe-to-Spend & Conselheiro Preditivo */}
          <SafeToSpendWidget spending={data.spending} monthlyBudget={data.monthlyBudget} />

          {/* 2. ABAS: EXTRATO DIÁRIO vs CONTAS FIXAS */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              {/* Toggle de Abas */}
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setTab('extrato')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    tab === 'extrato'
                      ? 'bg-zinc-800 text-emerald-300 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200',
                  )}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Extrato de Gastos</span>
                  <span className="font-num text-[10px] opacity-70">({data.spending.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTab('contas')}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    tab === 'contas'
                      ? 'bg-zinc-800 text-emerald-300 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200',
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Contas Fixas do Mês</span>
                  <span className="font-num text-[10px] opacity-70">({data.fixedBills.length})</span>
                </button>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReportModalOpen(true)}
                  className="gap-1.5 text-xs text-zinc-300 hover:text-white border border-zinc-800 bg-zinc-900/60"
                >
                  <Receipt className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Relatório do Mês</span>
                </Button>

                {tab === 'extrato' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSpendingModalOpen(true)}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Plus className="h-3.5 w-3.5" /> Novo Gasto
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setBillModalOpen(true)}
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Plus className="h-3.5 w-3.5" /> Nova Conta Fixa
                  </Button>
                )}
              </div>
            </div>

            {/* ABA A: EXTRATO DIÁRIO */}
            {tab === 'extrato' && (
              <div className="space-y-3">
                {/* Busca e Filtros de Categoria */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                  {/* Categorias */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter(null)}
                      className={cn(
                        'chip px-2.5 py-1 text-xs transition-colors',
                        categoryFilter === null
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                          : 'text-zinc-400 hover:bg-zinc-800',
                      )}
                    >
                      Todas ({data.spending.length})
                    </button>
                    {availableCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                        className={cn(
                          'chip px-2.5 py-1 text-xs transition-colors',
                          categoryFilter === cat
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold'
                            : 'text-zinc-400 hover:bg-zinc-800',
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Campo de Busca */}
                  <div className="relative min-w-[220px] sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar por descrição ou categoria..."
                      className="w-full h-8 pl-8 pr-7 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Lista do Extrato */}
                {data.spending.length === 0 ? (
                  <EmptyState
                    icon={<Receipt className="h-6 w-6" />}
                    title="Nenhum gasto registrado"
                    description="Lance despesas pelo botão acima ou mande no Telegram (ex.: 'gastei 50 no almoço')."
                    action={
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSpendingModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <Plus className="h-3.5 w-3.5" /> Lançar Primeiro Gasto
                      </Button>
                    }
                  />
                ) : filteredSpending.length === 0 ? (
                  <EmptyState
                    icon={<Filter className="h-6 w-6" />}
                    title="Nenhum gasto com esse filtro"
                    description="Tente limpar a busca ou selecionar outra categoria."
                    action={
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearch('')
                          setCategoryFilter(null)
                        }}
                      >
                        Limpar Filtros
                      </Button>
                    }
                  />
                ) : (
                  <div className="card divide-y divide-zinc-800/60 overflow-hidden">
                    {filteredSpending.map((item) => {
                      const catConfig =
                        CATEGORY_ICONS[item.category.toLowerCase()] || CATEGORY_ICONS.alimentação
                      const Icon = catConfig.icon

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3.5 hover:bg-zinc-800/20 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={cn(
                                'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border',
                                catConfig.bg,
                              )}
                            >
                              <Icon className={cn('h-4 w-4', catConfig.color)} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-100 truncate">
                                {item.note || item.category}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-num">
                                <span>{item.category}</span>
                                <span>·</span>
                                <span>{item.date}</span>
                                {item.time && <span>às {item.time}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <span className="font-display font-num text-sm md:text-base font-bold text-zinc-100">
                              {formatBRL(Number(item.amount) || 0)}
                            </span>

                            {pendingDelete === item.id ? (
                              <Button
                                variant="danger"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => request(item.id, () => void removeSpending(item.id))}
                              >
                                Confirmar?
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Excluir gasto"
                                onClick={() => request(item.id, () => void removeSpending(item.id))}
                                className="h-7 w-7 text-zinc-500 hover:text-rose-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ABA B: CONTAS FIXAS & ASSINATURAS DO MÊS */}
            {tab === 'contas' && (
              <div className="space-y-3">
                {/* Banner de Status do Mês */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Vencimentos em {currentMonthLabel()}
                    </p>
                    <p className="text-sm font-medium text-zinc-200">
                      {paidBillsCount} de {data.fixedBills.length} contas pagas este mês
                      {unpaidBillsCount > 0 && ` (${unpaidBillsCount} pendente${unpaidBillsCount > 1 ? 's' : ''})`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-zinc-500 block">Total Mensal Previsto:</span>
                    <span className="font-display font-num text-lg font-bold text-emerald-400">
                      {formatBRL(totalBillsAmount)}
                    </span>
                  </div>
                </div>

                {/* Lista de Contas */}
                {data.fixedBills.length === 0 ? (
                  <EmptyState
                    icon={<Calendar className="h-6 w-6" />}
                    title="Nenhuma conta fixa cadastrada"
                    description="Adicione suas contas recorrentes (Internet, Energia, Aluguel, Assinaturas) para dar baixa mensalmente."
                    action={
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setBillModalOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <Plus className="h-3.5 w-3.5" /> Cadastrar Conta Fixa
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {data.fixedBills.map((bill) => {
                      const isPaid = (bill.paidMonths || []).includes(thisMonth)

                      return (
                        <div
                          key={bill.id}
                          className={cn(
                            'flex items-center justify-between p-3.5 rounded-2xl border transition-all',
                            isPaid
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-zinc-300 opacity-75'
                              : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700 text-zinc-100',
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Checkbox de Pagamento */}
                            <button
                              type="button"
                              onClick={() => toggleBillPaid(bill.id, thisMonth)}
                              className={cn(
                                'h-7 w-7 rounded-xl flex items-center justify-center border transition-colors shrink-0',
                                isPaid
                                  ? 'bg-emerald-500 border-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20'
                                  : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600',
                              )}
                              title={isPaid ? 'Marcar como não paga' : 'Marcar como paga neste mês'}
                            >
                              {isPaid && <Check className="h-4 w-4 stroke-[3]" />}
                            </button>

                            <div className="min-w-0">
                              <p
                                className={cn(
                                  'text-sm font-semibold truncate',
                                  isPaid && 'line-through text-zinc-400',
                                )}
                              >
                                {bill.name}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-num">
                                <span className="chip px-1.5 py-0 text-[10px] bg-zinc-800 text-zinc-300 border-zinc-700">
                                  Vence dia {bill.dueDay}
                                </span>
                                <span>{bill.category}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="font-display font-num text-sm md:text-base font-bold text-zinc-100">
                              {formatBRL(Number(bill.amount) || 0)}
                            </span>

                            {pendingDelete === bill.id ? (
                              <Button
                                variant="danger"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => request(bill.id, () => void removeFixedBill(bill.id))}
                              >
                                OK?
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Excluir conta fixa"
                                onClick={() => request(bill.id, () => void removeFixedBill(bill.id))}
                                className="h-7 w-7 text-zinc-500 hover:text-rose-400"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modais */}
      {spendingModalOpen && (
        <SpendingFormModal
          open={spendingModalOpen}
          onClose={() => setSpendingModalOpen(false)}
          onSubmit={async (draft) => {
            await addSpending(draft)
          }}
        />
      )}

      {billModalOpen && (
        <FixedBillFormModal
          open={billModalOpen}
          onClose={() => setBillModalOpen(false)}
          onSubmit={async (draft) => {
            await addFixedBill(draft)
          }}
        />
      )}

      {reportModalOpen && data && (
        <MonthlyReportModal
          open={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          spending={data.spending}
          fixedBills={data.fixedBills}
          monthlyBudget={data.monthlyBudget}
        />
      )}
    </div>
  )
}
