import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDollarSign,
  Clock,
  Fuel,
  Mic,
  Plane,
  Receipt,
  RotateCcw,
  ShoppingBasket,
  Sparkles,
  SunMedium,
  Wallet,
  Wrench,
} from 'lucide-react'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton, ProgressBar } from '@/components/ui/feedback'
import { cn, todayStr } from '@/lib/utils'
import { useHojeData } from './useHojeData'
import type { TodayPriority, TodayPrioritySeverity, TodayPrioritySource } from './hojeUtils'
import { SpendingFormModal } from '@/features/financas/SpendingFormModal'
import { ReceiptScannerModal } from '@/features/financas/ReceiptScannerModal'
import { VoiceNoteRecorderModal } from '@/features/life-log/VoiceNoteRecorderModal'
import { FuelLogModal } from '@/features/manutencao/FuelLogModal'
import { EventModal } from '@/features/agenda/EventModal'
import { api } from '@/data/api'
import { toast } from '@/stores/toastStore'
import { syncMaintenanceRecordToFinance } from '@/lib/maintFinanceSync'
import { getGoogleCalendarConfig, syncGoogleCalendar } from '@/lib/googleCalendarSync'
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendLocalNotification,
  checkUpcomingEventsReminders,
  checkTodayEventsNotifications,
  type NotificationPermissionStatus,
} from '@/lib/notifications'
import type { AgendaEvent, Asset, LifeLogEntry, MaintenanceRecord, SpendingItem } from '@/data/types'
import type { ParsedReceiptData } from '@/lib/receiptScanner'

function sourceIcon(source: TodayPrioritySource) {
  switch (source) {
    case 'agenda':
      return CalendarClock
    case 'financas':
      return CircleDollarSign
    case 'despensa':
      return ShoppingBasket
    case 'manutencao':
      return Wrench
    case 'viagens':
      return Plane
    case 'habitos':
      return CheckCircle2
    default:
      return Sparkles
  }
}

function sourceColor(source: TodayPrioritySource) {
  switch (source) {
    case 'agenda':
      return 'text-rose-400 bg-rose-500/15 border-rose-500/30'
    case 'financas':
      return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
    case 'despensa':
      return 'text-purple-400 bg-purple-500/15 border-purple-500/30'
    case 'manutencao':
      return 'text-orange-400 bg-orange-500/15 border-orange-500/30'
    case 'viagens':
      return 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30'
    case 'habitos':
      return 'text-sky-400 bg-sky-500/15 border-sky-500/30'
    default:
      return 'text-zinc-400 bg-zinc-500/15 border-zinc-500/30'
  }
}

function severityBadge(severity: TodayPrioritySeverity) {
  switch (severity) {
    case 'critical':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
          Crítico
        </span>
      )
    case 'warning':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Atenção
        </span>
      )
    case 'normal':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-700/50">
          Hoje
        </span>
      )
  }
}

function HojeSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full min-w-0 animate-pulse">
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  )
}

export function HojePage() {
  const navigate = useNavigate()
  const { rawData, plan, loading, reload, toggleHabit, toggleEventCompleted } = useHojeData()
  const module = MODULE_BY_ID.hoje

  // Modais de Ações Rápidas
  const [showSpending, setShowSpending] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [showVoice, setShowVoice] = useState(false)
  const [showFuel, setShowFuel] = useState(false)
  const [showEvent, setShowEvent] = useState(false)
  const [showAllPriorities, setShowAllPriorities] = useState(false)

  const [assets, setAssets] = useState<Asset[]>([])
  const [maintRecords, setMaintRecords] = useState<MaintenanceRecord[]>([])
  const [notifPerm, setNotifPerm] = useState<NotificationPermissionStatus>(() => getNotificationPermission())

  useEffect(() => {
    Promise.all([
      api.list<Asset>('assets').catch(() => []),
      api.list<MaintenanceRecord>('maintenance').catch(() => []),
    ]).then(([a, m]) => {
      setAssets(Array.isArray(a) ? a : [])
      setMaintRecords(Array.isArray(m) ? m : [])
    })
  }, [])

  // Verificador em tempo real de compromissos para Web Push (15 min antes e diário)
  useEffect(() => {
    if (!rawData?.events || rawData.events.length === 0) return

    checkTodayEventsNotifications(rawData.events)
    checkUpcomingEventsReminders(rawData.events)

    const interval = setInterval(() => {
      checkUpcomingEventsReminders(rawData.events)
    }, 60000)

    return () => clearInterval(interval)
  }, [rawData?.events])

  const handleEnablePush = async () => {
    const res = await requestNotificationPermission()
    setNotifPerm(res)
    if (res === 'granted') {
      sendLocalNotification('🔔 Notificações Ativadas no Life OS', {
        body: 'Você receberá avisos automáticos 15 minutos antes de seus compromissos e alertas de despensa!',
      })
      toast.success('Notificações Web Push ativadas com sucesso! 🔔✨')
    } else {
      toast.error('Permissão para notificações não foi concedida.')
    }
  }

  const handleSaveSpending = async (draft: Omit<SpendingItem, 'id' | 'createdAt'>) => {
    try {
      await api.create<SpendingItem>('spendingEntries', {
        ...draft,
        createdAt: new Date().toISOString(),
      })
      toast.success('Gasto registrado com sucesso! 💰')
      setShowSpending(false)
      void reload()
    } catch {
      toast.error('Erro ao registrar gasto.')
    }
  }

  const handleApplyReceipt = async (data: ParsedReceiptData) => {
    try {
      await api.create<SpendingItem>('spendingEntries', {
        amount: data.amount || 0,
        category: data.category || 'Alimentação',
        date: data.date || todayStr(),
        time: data.time,
        note: data.establishment
          ? `${data.establishment}${data.items?.length ? ` (${data.items.join(', ')})` : ''}`
          : data.rawSummary || 'Compra Cupom Fiscal',
        createdAt: new Date().toISOString(),
      })
      toast.success('Cupom fiscal salvo como despesa! 🧾✨')
      setShowScanner(false)
      void reload()
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
      toast.success('Nota gravada no Diário! 🎙️✨')
      setShowVoice(false)
      void reload()
    } catch {
      toast.error('Erro ao salvar nota.')
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
      void reload()
    } catch {
      toast.error('Erro ao registrar abastecimento.')
    }
  }

  const handleSaveEvent = async (data: Omit<AgendaEvent, 'id'>) => {
    try {
      await api.create<AgendaEvent>('events', data)
      toast.success('Compromisso agendado com sucesso! 📅')
      setShowEvent(false)
      void reload()
    } catch {
      toast.error('Erro ao agendar compromisso.')
    }
  }

  const [syncing, setSyncing] = useState(false)

  const handleRefreshAll = async () => {
    setSyncing(true)
    const config = getGoogleCalendarConfig()
    if (config.icalUrl) {
      try {
        const res = await syncGoogleCalendar()
        if (res.ok && res.count > 0) {
          toast.success(`${res.count} eventos atualizados do Google Calendar! 📅✨`)
        }
      } catch {}
    }
    await reload()
    setSyncing(false)
  }

  if (loading) {
    return <HojeSkeleton />
  }

  const totalHabits = rawData?.habits?.length || 0
  const completedHabits = totalHabits - plan.counts.habitsPending
  const habitsProgress = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 100

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-6 pb-20 md:pb-10 min-w-0">
      {/* Header com Data Responsiva e Saudação */}
      <PageHeader module={module}>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Data compacta no mobile: ex: 'Qua, 26 Ago' */}
          <span className="chip inline-flex sm:hidden items-center gap-1 text-[11px] font-medium text-sky-300 bg-sky-500/10 border-sky-500/30 whitespace-nowrap py-1 px-2">
            <SunMedium className="h-3 w-3 text-sky-400 shrink-0" />
            <span>{plan.shortDateLabel}</span>
          </span>
          {/* Data completa no desktop */}
          <span className="chip capitalize hidden sm:inline-flex items-center gap-1.5 text-xs text-sky-300 bg-sky-500/10 border-sky-500/30 whitespace-nowrap">
            <SunMedium className="h-3.5 w-3.5 text-sky-400 shrink-0" />
            {plan.dateLabel}
          </span>
          <button
            type="button"
            onClick={() => void handleRefreshAll()}
            disabled={syncing}
            title="Atualizar dados e sincronizar com Google Calendar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-60"
          >
            <RotateCcw className={cn('h-3.5 w-3.5', syncing ? 'animate-spin text-sky-400' : '')} />
          </button>
        </div>
      </PageHeader>

      {/* Banner discreto para ativar Web Push se ainda não ativado */}
      {notifPerm === 'default' && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-3 sm:px-4 sm:py-3 text-xs text-cyan-200 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Bell className="h-4 w-4 animate-pulse" />
            </div>
            <p className="min-w-0 text-xs">
              <strong className="text-cyan-300">Lembretes 15 min antes:</strong> Ative as notificações Web Push para receber alertas automáticos no celular.
            </p>
          </div>
          <Button
            variant="soft"
            size="sm"
            className="shrink-0 text-xs font-semibold text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/20 self-end sm:self-center"
            onClick={handleEnablePush}
          >
            Ativar Notificações 🔔
          </Button>
        </div>
      )}

      {/* Resumo Matinal / Síntese Hermes */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-zinc-900/80 to-zinc-950/90 p-4 sm:p-5 backdrop-blur-xl shadow-lg shadow-sky-950/20">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 h-36 w-36 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-400 truncate">
                {plan.greeting} · Hermes Cockpit
              </p>
            </div>
            <p className="text-sm sm:text-base font-medium text-zinc-100 leading-relaxed">
              {plan.summary}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0 shrink-0">
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-300">
              <span className="pulse-dot" />
              {plan.counts.pendingEvents === 0 && plan.counts.events > 0 ? (
                <span className="text-emerald-400 font-medium">✓ {plan.counts.events} concluídos</span>
              ) : plan.counts.completedEvents > 0 ? (
                <span>
                  <strong className="text-sky-300">{plan.counts.pendingEvents}</strong> pendente{plan.counts.pendingEvents === 1 ? '' : 's'} <span className="text-zinc-500">({plan.counts.completedEvents}/{plan.counts.events})</span>
                </span>
              ) : (
                <span>{plan.counts.events} eventos</span>
              )}
              <span className="text-zinc-600">·</span>
              <span className={cn(plan.counts.bills > 0 ? 'text-amber-400 font-semibold' : 'text-zinc-400')}>
                {plan.counts.bills} contas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card "Agora" */}
      {plan.now ? (
        <Card
          className="relative overflow-hidden border-sky-500/40 bg-zinc-950/80 p-4 sm:p-5 transition-all shadow-md hover:shadow-sky-500/5 hover:border-sky-500/60 cursor-pointer"
          onClick={() => plan.now?.path && navigate(plan.now.path)}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 shadow-inner">
                <Clock className="h-5 w-5 animate-pulse" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                    Foco de Agora
                  </span>
                  {severityBadge(plan.now.severity)}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-50 break-words leading-snug">{plan.now.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-400 break-words leading-relaxed">{plan.now.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
              {plan.now.source === 'agenda' && plan.now.rawId && (
                <Button
                  variant="soft"
                  size="sm"
                  className="border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (plan.now?.rawId) {
                      void toggleEventCompleted(plan.now.rawId)
                      toast.success('Compromisso marcado como concluído! 🎉')
                    }
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Check-in</span>
                </Button>
              )}

              {plan.now.actionLabel && (
                <Button
                  variant="soft"
                  size="sm"
                  className="border border-sky-500/30 text-sky-300 hover:bg-sky-500/10 gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (plan.now?.path) navigate(plan.now.path)
                  }}
                >
                  <span>{plan.now.actionLabel}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="border-emerald-500/20 bg-emerald-950/10 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">Dia Livre de Urgências</p>
                <p className="text-xs text-zinc-400">Nenhum compromisso ou pendência crítica pendente no momento.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-emerald-400 hover:bg-emerald-500/10 shrink-0"
              onClick={() => setShowEvent(true)}
            >
              + Agendar
            </Button>
          </div>
        </Card>
      )}

      {/* Barra de Ações Rápidas (Mobile-first e Notebook) */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3 sm:p-4 backdrop-blur-xl shadow-lg shadow-black/20">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Ações Rápidas
          </h3>
          <span className="text-[11px] text-zinc-500">1 toque</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setShowSpending(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all shadow-sm"
          >
            <Wallet className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="truncate">+ Gasto</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEvent(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all shadow-sm"
          >
            <Calendar className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="truncate">+ Evento</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVoice(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 px-3 py-2.5 text-xs font-medium text-purple-300 hover:bg-purple-500/20 active:scale-95 transition-all shadow-sm"
          >
            <Mic className="h-4 w-4 shrink-0 text-purple-400" />
            <span className="truncate">+ Diário/Voz</span>
          </button>

          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition-all shadow-sm"
          >
            <Receipt className="h-4 w-4 shrink-0 text-cyan-400" />
            <span className="truncate">Cupom Fiscal</span>
          </button>

          <button
            type="button"
            onClick={() => setShowFuel(true)}
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/10 px-3 py-2.5 text-xs font-medium text-orange-300 hover:bg-orange-500/20 active:scale-95 transition-all shadow-sm"
          >
            <Fuel className="h-4 w-4 shrink-0 text-orange-400" />
            <span className="truncate">+ Combustível</span>
          </button>
        </div>
      </div>

      {/* Grid Principal (2 Colunas no Notebook, 1 Coluna no Mobile) */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-12 items-start">
        {/* Coluna Principal: Top 5 Prioridades do Dia (7 Colunas em Desktop) */}
        <div className="lg:col-span-7 space-y-4">
          {(() => {
            const allList = plan.allPriorities && plan.allPriorities.length > 0 ? plan.allPriorities : plan.priorities
            const displayed = showAllPriorities ? allList : plan.priorities
            const totalCount = allList.length

            return (
              <>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <span>🎯 Prioridades de Hoje</span>
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">
                      {displayed.length}{totalCount > displayed.length ? ` de ${totalCount}` : ''}
                    </span>
                  </h2>
                  {totalCount > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllPriorities(!showAllPriorities)}
                      className="text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors py-1 px-2 rounded-lg hover:bg-sky-500/10"
                    >
                      {showAllPriorities ? 'Mostrar menos (Top 5)' : `Ver todas (${totalCount})`}
                    </button>
                  )}
                  {totalCount <= 5 && (
                    <span className="text-[11px] text-zinc-500 hidden sm:inline">Prioridade inteligente</span>
                  )}
                </div>

                {displayed.length === 0 ? (
                  <Card className="p-6 text-center text-zinc-400 border-zinc-800/80 bg-zinc-950/40">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 mb-3">
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-200">Nada pendente para hoje!</p>
                    <p className="text-xs text-zinc-500 mt-1">Aproveite seu tempo livre ou registre novos planos.</p>
                  </Card>
                ) : (
                  <div className="space-y-2.5">
                    {displayed.map((item: TodayPriority) => {
                      const Icon = sourceIcon(item.source)
                      const colorCls = sourceColor(item.source)
                      const isEvent = item.source === 'agenda' && item.rawId
                      const isDone = Boolean(item.completed)

                      return (
                        <div
                          key={item.id}
                          onClick={() => item.path && navigate(item.path)}
                          className={cn(
                            'group flex items-start justify-between gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3.5 transition-all backdrop-blur-sm hover:border-zinc-700 hover:bg-zinc-900/60 active:scale-[0.99]',
                            item.path ? 'cursor-pointer' : '',
                            isDone ? 'opacity-65 bg-zinc-950/40 border-zinc-800/50' : '',
                          )}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-sm mt-0.5', colorCls)}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <p
                                  className={cn(
                                    'text-sm font-semibold text-zinc-100 break-words leading-snug group-hover:text-sky-300 transition-colors',
                                    isDone ? 'line-through text-zinc-400' : '',
                                  )}
                                >
                                  {item.title}
                                </p>
                                {severityBadge(item.severity)}
                              </div>
                              <p className="text-xs text-zinc-400 break-words leading-relaxed">{item.description}</p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2 self-center ml-1">
                            {isEvent && (
                              <button
                                type="button"
                                title={isDone ? 'Reabrir compromisso' : 'Concluir compromisso'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (item.rawId) {
                                    void toggleEventCompleted(item.rawId)
                                    toast.success(isDone ? 'Compromisso reaberto.' : 'Compromisso concluído! 🎉')
                                  }
                                }}
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-lg border transition-all',
                                  isDone
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                    : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10',
                                )}
                              >
                                {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                              </button>
                            )}

                            {item.path && !isEvent && (
                              <div className="flex items-center text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                <ChevronRight className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )
          })()}

          {/* Se houver alertas críticos adicionais */}
          {plan.alerts.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Avisos Operacionais</h4>
              </div>
              <ul className="space-y-1.5 text-xs text-zinc-300">
                {plan.alerts.map((al) => (
                  <li
                    key={al.id}
                    onClick={() => al.path && navigate(al.path)}
                    className={cn(
                      'flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-amber-500/10 transition-colors',
                      al.path ? 'cursor-pointer' : '',
                    )}
                  >
                    <span className="text-xs text-zinc-200 break-words flex-1 min-w-0">· {al.title}</span>
                    <span className="text-[11px] font-medium text-amber-400/90 shrink-0">{al.actionLabel} →</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Coluna Lateral: Hábitos de Hoje + Métricas (5 Colunas em Desktop) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Checklist de Hábitos */}
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-4 backdrop-blur-xl shadow-lg shadow-black/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                  Hábitos de Hoje
                </h3>
              </div>
              <span className="text-xs font-semibold text-sky-400">
                {completedHabits}/{totalHabits} ({habitsProgress}%)
              </span>
            </div>

            {/* Barra de Progresso */}
            <ProgressBar value={habitsProgress} tone="cyan" className="h-2" />

            {totalHabits === 0 ? (
              <p className="text-xs text-zinc-500 py-2 text-center">Nenhum hábito cadastrado.</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {rawData?.habits?.map((h) => {
                  const today = todayStr()
                  const isDone = (h.completedDates || []).includes(today)

                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => void toggleHabit(h.id)}
                      className={cn(
                        'w-full flex items-center justify-between gap-2.5 p-2.5 rounded-xl border transition-all text-left',
                        isDone
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-zinc-300'
                          : 'border-zinc-800/80 bg-zinc-900/40 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900/70',
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-sm shrink-0">{h.icon || '✨'}</span>
                        <span
                          className={cn(
                            'text-xs font-medium truncate',
                            isDone ? 'line-through text-zinc-400' : 'text-zinc-200',
                          )}
                        >
                          {h.title}
                        </span>
                      </div>

                      <div className="shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Circle className="h-4 w-4 text-zinc-500 hover:text-sky-400 transition-colors" />
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Cartões Rápidos de Status */}
          <div className="grid grid-cols-2 gap-2.5">
            <div
              onClick={() => navigate('/agenda')}
              className="cursor-pointer rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3 hover:border-rose-500/30 transition-all"
            >
              <div className="flex items-center justify-between text-rose-400 mb-1">
                <CalendarClock className="h-4 w-4" />
                <span className="text-base font-bold">{plan.counts.events}</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium truncate">Eventos Hoje</p>
            </div>

            <div
              onClick={() => navigate('/financas')}
              className="cursor-pointer rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3 hover:border-emerald-500/30 transition-all"
            >
              <div className="flex items-center justify-between text-emerald-400 mb-1">
                <CircleDollarSign className="h-4 w-4" />
                <span className="text-base font-bold">{plan.counts.bills}</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium truncate">Contas Pendentes</p>
            </div>

            <div
              onClick={() => navigate('/despensa')}
              className="cursor-pointer rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3 hover:border-purple-500/30 transition-all"
            >
              <div className="flex items-center justify-between text-purple-400 mb-1">
                <ShoppingBasket className="h-4 w-4" />
                <span className="text-base font-bold">{plan.counts.pantryLow}</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium truncate">Alertas Despensa</p>
            </div>

            <div
              onClick={() => navigate('/manutencao')}
              className="cursor-pointer rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-3 hover:border-orange-500/30 transition-all"
            >
              <div className="flex items-center justify-between text-orange-400 mb-1">
                <Wrench className="h-4 w-4" />
                <span className="text-base font-bold">{plan.counts.maintAlerts}</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium truncate">Ativos Críticos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modais Globais de Ação Rápida */}
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

      {showFuel && (
        <FuelLogModal
          open={showFuel}
          assets={assets}
          records={maintRecords}
          onClose={() => setShowFuel(false)}
          onSubmit={handleSaveFuel}
        />
      )}

      {showEvent && (
        <EventModal
          event={null}
          onClose={() => setShowEvent(false)}
          onSave={handleSaveEvent}
        />
      )}
    </div>
  )
}
