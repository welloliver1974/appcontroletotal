import { useMemo } from 'react'
import { Copy, Share2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'
import type { FixedBill, SpendingItem } from '@/data/types'

interface MonthlyReportModalProps {
  open: boolean
  onClose: () => void
  spending: SpendingItem[]
  fixedBills: FixedBill[]
  monthlyBudget: number
}

function formatBRL(val: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

export function MonthlyReportModal({
  open,
  onClose,
  spending,
  fixedBills,
  monthlyBudget,
}: MonthlyReportModalProps) {
  const currentMonth = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const monthLabel = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }, [])

  // Cálculos do mês
  const {
    monthTotal,
    monthSpendingCount,
    categoryBreakdown,
    paidBills,
    unpaidBills,
    remainingBudget,
    budgetUsagePct,
  } = useMemo(() => {
    const monthItems = spending.filter((s) => (s.date || '').startsWith(currentMonth))
    let total = 0
    const catMap: Record<string, number> = {}

    for (const item of monthItems) {
      const amt = Number(item.amount) || 0
      total += amt
      const cat = item.category || 'Outros'
      catMap[cat] = (catMap[cat] || 0) + amt
    }

    const catArray = Object.entries(catMap)
      .map(([name, amount]) => ({
        name,
        amount,
        pct: total > 0 ? Math.round((amount / total) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)

    const paid: FixedBill[] = []
    const unpaid: FixedBill[] = []
    let billsTotal = 0

    for (const bill of fixedBills) {
      billsTotal += Number(bill.amount) || 0
      if ((bill.paidMonths || []).includes(currentMonth)) {
        paid.push(bill)
      } else {
        unpaid.push(bill)
      }
    }

    const remaining = Math.max(0, monthlyBudget - total)
    const usagePct = monthlyBudget > 0 ? Math.min(100, Math.round((total / monthlyBudget) * 100)) : 0

    return {
      monthTotal: total,
      monthSpendingCount: monthItems.length,
      categoryBreakdown: catArray,
      paidBills: paid,
      unpaidBills: unpaid,
      _totalBillsAmount: billsTotal,
      remainingBudget: remaining,
      budgetUsagePct: usagePct,
    }
  }, [spending, fixedBills, monthlyBudget, currentMonth])

  // Texto formatado para WhatsApp / Telegram
  const formattedText = useMemo(() => {
    const lines = [
      `📊 *LIFE OS HUB — RELATÓRIO FINANCEIRO*`,
      `🗓️ *Mês:* ${monthLabel.toUpperCase()}`,
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `💵 *Total de Gastos:* ${formatBRL(monthTotal)} (${monthSpendingCount} lançamentos)`,
      `🎯 *Teto Mensal:* ${formatBRL(monthlyBudget)}`,
      `💰 *Saldo Disponível:* ${formatBRL(remainingBudget)} (${100 - budgetUsagePct}% livre)`,
      ``,
      `🏷️ *Gastos por Categoria:*`,
      ...categoryBreakdown.map((c) => `• ${c.name}: ${formatBRL(c.amount)} (${c.pct}%)`),
      ``,
      `📌 *Contas Fixas & Assinaturas (${paidBills.length}/${fixedBills.length} pagas):*`,
      ...paidBills.map((b) => `✓ ${b.name}: ${formatBRL(Number(b.amount))} (Pago)`),
      ...unpaidBills.map((b) => `⏳ ${b.name}: ${formatBRL(Number(b.amount))} (Vence dia ${b.dueDay})`),
      `━━━━━━━━━━━━━━━━━━━━━━`,
      `Gerado automaticamente pelo Life OS Hub 🚀`,
    ]
    return lines.join('\n')
  }, [
    monthLabel,
    monthTotal,
    monthSpendingCount,
    monthlyBudget,
    remainingBudget,
    budgetUsagePct,
    categoryBreakdown,
    paidBills,
    unpaidBills,
    fixedBills.length,
  ])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText)
      toast.success('Relatório copiado para colar no WhatsApp / Telegram! 📋')
    } catch {
      toast.info(formattedText)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Relatório Financeiro - ${monthLabel}`,
          text: formattedText,
        })
      } catch {}
    } else {
      handleCopy()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Relatório Executivo do Mês 📋" wide>
      <div className="space-y-4 pt-1">
        {/* Scorecard Rápido */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Total Gasto</span>
            <p className="font-display font-num text-lg font-bold text-emerald-400">
              {formatBRL(monthTotal)}
            </p>
            <p className="text-[10px] text-zinc-500">{monthSpendingCount} lançamentos</p>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Saldo do Teto</span>
            <p className="font-display font-num text-lg font-bold text-zinc-100">
              {formatBRL(remainingBudget)}
            </p>
            <p className="text-[10px] text-zinc-500">de {formatBRL(monthlyBudget)}</p>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-zinc-400">Contas Fixas</span>
            <p className="font-display font-num text-lg font-bold text-zinc-100">
              {paidBills.length} / {fixedBills.length}
            </p>
            <p className="text-[10px] text-zinc-500">
              {unpaidBills.length === 0 ? 'Todas pagas ✓' : `${unpaidBills.length} pendente(s)`}
            </p>
          </div>
        </div>

        {/* Prévia Formatada para Mensagem */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
            <span>Prévia do Relatório Formatado (WhatsApp / Telegram)</span>
            <span className="text-[10px] text-zinc-500 font-mono">Markdown pronto</span>
          </label>
          <pre className="p-3.5 bg-zinc-950/90 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-56 overflow-y-auto select-all leading-relaxed">
            {formattedText}
          </pre>
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNativeShare}
              className="gap-1.5 text-xs text-zinc-300 hover:text-white"
            >
              <Share2 className="h-3.5 w-3.5" /> Compartilhar
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleCopy}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20"
            >
              <Copy className="h-4 w-4" /> Copiar para WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
