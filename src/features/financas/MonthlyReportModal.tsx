import { useMemo } from 'react'
import { Copy, Printer, Send } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { toast } from '@/stores/toastStore'
import { sendDirectTelegramMessage } from '@/lib/hermes'
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
      remainingBudget: remaining,
      budgetUsagePct: usagePct,
    }
  }, [spending, fixedBills, monthlyBudget, currentMonth])

  // Texto formatado para WhatsApp / Telegram
  const formattedText = useMemo(() => {
    const lines = [
      `📊 *RELATÓRIO FINANCEIRO — ${monthLabel.toUpperCase()}*`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `💰 *Total Gasto:* ${formatBRL(monthTotal)} (${monthSpendingCount} lançamentos)`,
      `🎯 *Teto Orçamentário:* ${formatBRL(monthlyBudget)}`,
      `📉 *Saldo Restante:* ${formatBRL(remainingBudget)} (${100 - budgetUsagePct}% disponível)`,
      ``,
      `📁 *Gastos por Categoria:*`,
      ...categoryBreakdown.map(
        (c) => `• *${c.name}:* ${formatBRL(c.amount)} (${c.pct}%)`,
      ),
      categoryBreakdown.length === 0 ? '• Nenhum gasto registrado neste mês.' : '',
      ``,
      `📌 *Contas Fixas:*`,
      `• Pagas (${paidBills.length}): ${paidBills.map((b) => b.name).join(', ') || 'Nenhuma'}`,
      `• Pendentes (${unpaidBills.length}): ${unpaidBills.map((b) => `${b.name} (${formatBRL(b.amount)})`).join(', ') || 'Nenhuma pendente ✓'}`,
      ``,
      `🚀 _Gerado pelo Life OS Hub_`,
    ]

    return lines.filter(Boolean).join('\n')
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
  ])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText)
      toast.success('Relatório copiado para a área de transferência! 📋')
    } catch {
      toast.info(formattedText)
    }
  }

  const handleSendTelegram = async () => {
    const res = await sendDirectTelegramMessage(formattedText)
    if (res.ok) {
      toast.success('Relatório financeiro enviado direto para seu Telegram! 📱✈️')
    } else {
      const telegramUrl = `https://t.me/share/url?text=${encodeURIComponent(formattedText)}`
      window.open(telegramUrl, '_blank', 'noopener,noreferrer')
      toast.info('Abrindo Telegram...')
    }
  }

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      toast.error('Permita pop-ups no navegador para gerar o PDF.')
      return
    }

    const categoriesRows = categoryBreakdown
      .map(
        (c) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${c.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${formatBRL(c.amount)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">${c.pct}%</td>
        </tr>`,
      )
      .join('')

    const fixedRows = [
      ...paidBills.map(
        (b) => `
        <tr>
          <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9;">${b.name}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">${formatBRL(b.amount)}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #16a34a; font-weight: bold;">Pago ✓</td>
        </tr>`,
      ),
      ...unpaidBills.map(
        (b) => `
        <tr>
          <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9;">${b.name}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; text-align: right;">${formatBRL(b.amount)}</td>
          <td style="padding: 6px 12px; border-bottom: 1px solid #f1f5f9; text-align: right; color: #ea580c; font-weight: bold;">Pendente</td>
        </tr>`,
      ),
    ].join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Financeiro - ${monthLabel}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 40px; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 14px; color: #64748b; margin-top: 4px; text-transform: capitalize; }
          .kpis { display: flex; gap: 16px; margin-bottom: 28px; }
          .kpi-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; background: #f8fafc; }
          .kpi-title { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; }
          .kpi-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
          th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 700; color: #334155; border-bottom: 2px solid #cbd5e1; }
          .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .footer { border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; }
          @media print {
            body { margin: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Life OS Hub — Relatório Financeiro</h1>
            <p class="subtitle">Fechamento do Mês: ${monthLabel}</p>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            Emissão: ${new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>

        <div class="kpis">
          <div class="kpi-card">
            <div class="kpi-title">Total Gasto</div>
            <div class="kpi-value" style="color: #0f172a;">${formatBRL(monthTotal)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Teto Mensal</div>
            <div class="kpi-value">${formatBRL(monthlyBudget)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Saldo Restante</div>
            <div class="kpi-value" style="color: ${remainingBudget > 0 ? '#16a34a' : '#dc2626'};">${formatBRL(remainingBudget)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Lançamentos</div>
            <div class="kpi-value">${monthSpendingCount}</div>
          </div>
        </div>

        <div class="section-title">Detalhamento por Categoria</div>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th style="text-align: right;">Total Gasto</th>
              <th style="text-align: right;">Participação</th>
            </tr>
          </thead>
          <tbody>
            ${categoriesRows || '<tr><td colspan="3" style="padding: 12px; text-align: center;">Nenhum gasto registrado.</td></tr>'}
          </tbody>
        </table>

        <div class="section-title">Contas Fixas & Recorrentes</div>
        <table>
          <thead>
            <tr>
              <th>Conta</th>
              <th style="text-align: right;">Valor</th>
              <th style="text-align: right;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${fixedRows || '<tr><td colspan="3" style="padding: 12px; text-align: center;">Nenhuma conta cadastrada.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Documento gerado automaticamente pelo Life OS Hub • Copiloto Hermes AI
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    toast.success('Gerando documento para impressão / salvar em PDF! 📄✨')
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
            <span>Prévia do Relatório Formatado (Telegram / Mensagens)</span>
            <span className="text-[10px] text-zinc-500 font-mono">Markdown pronto</span>
          </label>
          <pre className="p-3.5 bg-zinc-950/90 border border-zinc-800 rounded-xl text-xs font-mono text-zinc-300 whitespace-pre-wrap max-h-56 overflow-y-auto select-all leading-relaxed">
            {formattedText}
          </pre>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrintPDF}
              className="gap-1.5 text-xs text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:bg-amber-500/10"
              title="Gerar PDF executivo para impressão ou download"
            >
              <Printer className="h-3.5 w-3.5" /> PDF / Imprimir
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs text-zinc-300 hover:text-white border border-zinc-800"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar Texto
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSendTelegram}
              className="gap-1.5 bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 font-medium text-xs"
            >
              <Send className="h-3.5 w-3.5" /> Telegram Bot
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
