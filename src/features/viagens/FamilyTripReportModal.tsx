import { useEffect, useMemo, useState } from 'react'
import {
  Coins,
  Copy,
  MapPin,
  Share2,
  Users,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { db } from '@/lib/db'
import type { SpendingItem, Trip } from '@/data/types'
import { toast } from '@/stores/toastStore'

interface FamilyTripReportModalProps {
  open: boolean
  onClose: () => void
  trip: Trip
}

export function FamilyTripReportModal({ open, onClose, trip }: FamilyTripReportModalProps) {
  const [spending, setSpending] = useState<SpendingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open) {
      setLoading(true)
      db.get<SpendingItem>('spending_entries')
        .then((items) => {
          // Filtrar gastos que caem no período da viagem
          const tripItems = items.filter(
            (s) => s.date && s.date >= trip.startDate && s.date <= trip.endDate,
          )
          setSpending(tripItems)
        })
        .catch(() => setSpending([]))
        .finally(() => setLoading(false))
    }
  }, [open, trip])

  // Total gasto e agrupamento por categoria
  const { total, byCategory } = useMemo(() => {
    let sum = 0
    const catMap: Record<string, { total: number; count: number; items: SpendingItem[] }> = {}

    for (const item of spending) {
      const amt = Number(item.amount) || 0
      sum += amt
      const cat = item.category || 'Outros'
      if (!catMap[cat]) {
        catMap[cat] = { total: 0, count: 0, items: [] }
      }
      catMap[cat].total += amt
      catMap[cat].count += 1
      catMap[cat].items.push(item)
    }

    return { total: sum, byCategory: catMap }
  }, [spending])

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  // Gerar mensagem formatada para WhatsApp
  const generateWhatsAppReport = () => {
    const lines = [
      `🌴 *RELATÓRIO DE GASTOS DA VIAGEM EM FAMÍLIA* 👨‍👩‍👧‍👦`,
      `📍 *Destino:* ${trip.destination}`,
      `📅 *Período:* ${trip.startDate} a ${trip.endDate}`,
      ``,
      `💰 *VALOR TOTAL INVESTIDO:* ${formatBRL(total)}`,
      `📊 *Total de Lançamentos:* ${spending.length}`,
      ``,
      `🏷️ *Detalhamento por Categoria:*`,
    ]

    Object.entries(byCategory).forEach(([cat, data]) => {
      const pct = total > 0 ? ((data.total / total) * 100).toFixed(0) : 0
      lines.push(`• *${cat}:* ${formatBRL(data.total)} (${pct}%) — ${data.count} gasto(s)`)
    })

    if (spending.length > 0) {
      lines.push(``)
      lines.push(`🧾 *Principais Gastos:*`)
      spending.slice(0, 10).forEach((s) => {
        lines.push(`- ${s.date}: ${s.note || s.category} — ${formatBRL(s.amount)}`)
      })
    }

    lines.push(``)
    lines.push(`🚀 _Gerado pelo Life OS Hub_`)
    return lines.join('\n')
  }

  const handleCopy = async () => {
    const text = generateWhatsAppReport()
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Relatório copiado! Pronto para colar no WhatsApp. 📋')
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  const handleShare = async () => {
    const text = generateWhatsAppReport()
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Gastos Viagem: ${trip.destination}`,
          text,
        })
      } catch {}
    } else {
      await handleCopy()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Relatório de Gastos da Viagem em Família 👨‍👩‍👧‍👦">
      <div className="space-y-4 pt-1">
        {/* Header do Relatório */}
        <div className="bg-gradient-to-br from-rose-950/40 via-zinc-900 to-zinc-950 border border-rose-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="chip px-2 py-0.5 text-[10px] bg-rose-500/20 text-rose-300 font-bold uppercase tracking-wider border-rose-500/40">
              <Users className="inline h-3 w-3 mr-1" />
              Viagem em Família
            </span>
            <span className="font-mono text-xs text-zinc-400">
              {trip.startDate} ➔ {trip.endDate}
            </span>
          </div>

          <div>
            <h3 className="font-display text-lg font-bold text-zinc-100 flex items-center gap-1.5">
              <MapPin className="h-5 w-5 text-rose-400" />
              {trip.destination}
            </h3>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex items-baseline justify-between">
            <span className="text-xs text-zinc-400">Total de Despesas no Período:</span>
            <span className="font-display font-num text-xl font-bold text-rose-400">
              {formatBRL(total)}
            </span>
          </div>
        </div>

        {/* Categorias */}
        {loading ? (
          <p className="text-xs text-zinc-400 text-center py-4">Carregando despesas da viagem...</p>
        ) : spending.length === 0 ? (
          <div className="text-center p-6 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-1">
            <Coins className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-300">Nenhum gasto registrado nesta data.</p>
            <p className="text-[11px] text-zinc-500">
              Lance despesas no módulo de Finanças dentro do período da viagem ({trip.startDate} a {trip.endDate}) para vê-las aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-200">
              Resumo por Categoria ({spending.length} lançamentos):
            </h4>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {Object.entries(byCategory).map(([cat, data]) => {
                const pct = total > 0 ? Math.round((data.total / total) * 100) : 0
                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-xs"
                  >
                    <div>
                      <span className="font-medium text-zinc-200">{cat}</span>
                      <span className="text-[10px] text-zinc-500 block">
                        {data.count} item(ns) · {pct}% do total
                      </span>
                    </div>
                    <span className="font-display font-num font-bold text-zinc-100">
                      {formatBRL(data.total)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="soft"
              size="sm"
              onClick={handleCopy}
              disabled={spending.length === 0}
              className="gap-1.5 text-xs text-rose-300 bg-rose-500/10 border-rose-500/30"
            >
              <Copy className="h-3.5 w-3.5" /> Copiar Texto
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleShare}
              disabled={spending.length === 0}
              className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
            >
              <Share2 className="h-3.5 w-3.5" /> Compartilhar no WhatsApp
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
