import { useEffect, useState } from 'react'
import {
  Calendar,
  Fuel,
  Mic,
  Receipt,
  Sparkles,
  Wallet,
} from 'lucide-react'
import { SpendingFormModal } from '@/features/financas/SpendingFormModal'
import { ReceiptScannerModal } from '@/features/financas/ReceiptScannerModal'
import { VoiceNoteRecorderModal } from '@/features/life-log/VoiceNoteRecorderModal'
import { FuelLogModal } from '@/features/manutencao/FuelLogModal'
import { EventModal } from '@/features/agenda/EventModal'
import { api } from '@/data/api'
import { toast } from '@/stores/toastStore'
import { syncMaintenanceRecordToFinance } from '@/lib/maintFinanceSync'
import type { AgendaEvent, Asset, LifeLogEntry, MaintenanceRecord, SpendingItem } from '@/data/types'
import type { ParsedReceiptData } from '@/lib/receiptScanner'

export function DashboardQuickActions({ onRefresh }: { onRefresh?: () => void }) {
  const [showSpending, setShowSpending] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [showFuel, setShowFuel] = useState(false)
  const [showEvent, setShowEvent] = useState(false)

  const [assets, setAssets] = useState<Asset[]>([])
  const [maintRecords, setMaintRecords] = useState<MaintenanceRecord[]>([])

  useEffect(() => {
    Promise.all([
      api.list<Asset>('assets').catch(() => []),
      api.list<MaintenanceRecord>('maintenance').catch(() => []),
    ]).then(([a, m]) => {
      setAssets(Array.isArray(a) ? a : [])
      setMaintRecords(Array.isArray(m) ? m : [])
    })
  }, [])

  const handleSaveSpending = async (draft: Omit<SpendingItem, 'id' | 'createdAt'>) => {
    try {
      await api.create<SpendingItem>('spendingEntries', {
        ...draft,
        createdAt: new Date().toISOString(),
      })
      toast.success('Gasto registrado com sucesso! 💰')
      setShowSpending(false)
      onRefresh?.()
    } catch {
      toast.error('Erro ao registrar gasto.')
    }
  }

  const handleApplyReceipt = async (data: ParsedReceiptData) => {
    try {
      await api.create<SpendingItem>('spendingEntries', {
        amount: data.amount || 0,
        category: data.category || 'Alimentação',
        date: data.date || new Date().toISOString().slice(0, 10),
        time: data.time,
        note: data.establishment
          ? `${data.establishment}${data.items?.length ? ` (${data.items.join(', ')})` : ''}`
          : data.rawSummary || 'Compra Cupom Fiscal',
        createdAt: new Date().toISOString(),
      })
      toast.success('Cupom fiscal salvo como despesa! 🧾✨')
      setShowScanner(false)
      onRefresh?.()
    } catch {
      toast.error('Erro ao salvar despesa do cupom.')
    }
  }

  const handleSaveVoice = async (draft: { title: string; body: string; mood: 1 | 2 | 3 | 4 | 5; tags: string[] }) => {
    try {
      await api.create<LifeLogEntry>('lifeLog', {
        ...draft,
        createdAt: new Date().toISOString(),
      })
      toast.success('Nota de voz gravada no Diário! 🎙️✨')
      setShowVoice(false)
      onRefresh?.()
    } catch {
      toast.error('Erro ao salvar nota de voz.')
    }
  }

  const handleSaveFuel = async (draft: {
    assetId: string
    title: string
    cost: number
    date: string
    odometerKm?: number
    syncFinance?: boolean
  }) => {
    try {
      const created = await api.create<MaintenanceRecord>('maintenance', {
        assetId: draft.assetId,
        title: draft.title,
        cost: draft.cost,
        date: draft.date,
        odometerKm: draft.odometerKm,
      })

      if (draft.cost > 0 && draft.syncFinance !== false) {
        await syncMaintenanceRecordToFinance(created, assets)
      }

      toast.success('Abastecimento registrado com sucesso! ⛽')
      setShowFuel(false)
      onRefresh?.()
    } catch {
      toast.error('Erro ao registrar abastecimento.')
    }
  }

  const handleSaveEvent = async (data: Omit<AgendaEvent, 'id'>) => {
    try {
      await api.create<AgendaEvent>('events', data)
      toast.success('Compromisso agendado com sucesso! 📅')
      setShowEvent(false)
      onRefresh?.()
    } catch {
      toast.error('Erro ao agendar compromisso.')
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3 sm:p-4 backdrop-blur-xl shadow-lg shadow-black/20 w-full min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200 truncate">
                Ações Rápidas em 1 Toque
              </h3>
              <p className="text-[11px] text-zinc-500 truncate">
                Lançamentos instantâneos sem sair do painel
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto min-w-0">
            <button
              type="button"
              onClick={() => setShowSpending(true)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-sm w-full md:w-auto truncate"
            >
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">+ Gasto</span>
            </button>

            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-all shadow-sm w-full md:w-auto truncate"
            >
              <Receipt className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Escanear Cupom</span>
            </button>

            <button
              type="button"
              onClick={() => setShowVoice(true)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/25 hover:bg-purple-500/20 hover:border-purple-500/40 transition-all shadow-sm w-full md:w-auto truncate"
            >
              <Mic className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Gravar Voz</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEvent(true)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/25 hover:bg-rose-500/20 hover:border-rose-500/40 transition-all shadow-sm w-full md:w-auto truncate"
            >
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">+ Evento</span>
            </button>

            <button
              type="button"
              onClick={() => setShowFuel(true)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all shadow-sm col-span-2 sm:col-span-1 md:w-auto truncate"
            >
              <Fuel className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Abastecer</span>
            </button>
          </div>
        </div>
      </div>

      {showSpending && (
        <SpendingFormModal
          open={showSpending}
          onClose={() => setShowSpending(false)}
          onSubmit={handleSaveSpending}
        />
      )}

      {showScanner && (
        <ReceiptScannerModal
          open={showScanner}
          onClose={() => setShowScanner(false)}
          onApply={handleApplyReceipt}
        />
      )}

      {showVoice && (
        <VoiceNoteRecorderModal
          open={showVoice}
          onClose={() => setShowVoice(false)}
          onSubmit={handleSaveVoice}
        />
      )}

      {showEvent && (
        <EventModal
          event={null}
          onClose={() => setShowEvent(false)}
          onSave={handleSaveEvent}
        />
      )}

      {showFuel && (
        <FuelLogModal
          open={showFuel}
          onClose={() => setShowFuel(false)}
          assets={assets}
          records={maintRecords}
          onSubmit={handleSaveFuel}
        />
      )}
    </>
  )
}
