import { useEffect, useState, useMemo } from 'react'
import {
  Activity,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  Dumbbell,
  ExternalLink,
  Flame,
  GitCompare,
  HeartPulse,
  LayoutGrid,
  Layers,
  LineChart as LineChartIcon,
  LogIn,
  LogOut,
  Minus,
  Plus,
  RefreshCw,
  Ruler,
  Scale,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MODULE_BY_ID } from '@/lib/modules'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import { useFitStore } from '@/stores/fitStore'
import { WeightModal } from './WeightModal'
import { MeasurementModal } from './MeasurementModal'
import { WorkoutModal } from './WorkoutModal'
import { FitLoginModal } from './FitLoginModal'
import { cn } from '@/lib/utils'

type TabType = 'geral' | 'treinos' | 'peso' | 'medidas' | 'bioimpedancia'
type WeightRange = '7d' | '30d' | '90d' | 'all'
type MeasureFilter = 'todas' | 'tronco' | 'superiores' | 'inferiores' | 'indices' | 'grafico'

const ZONE_MAP: Record<string, 'tronco' | 'superiores' | 'inferiores'> = {
  cintura: 'tronco',
  abdômen: 'tronco',
  quadril: 'tronco',
  'peitoral / tórax': 'tronco',
  peitoral: 'tronco',
  tórax: 'tronco',
  ombros: 'tronco',
  pescoço: 'superiores',
  'braço direito': 'superiores',
  'braço esquerdo': 'superiores',
  'bíceps direito': 'superiores',
  'bíceps esquerdo': 'superiores',
  'antebraço direito': 'superiores',
  'antebraço esquerdo': 'superiores',
  'coxa direita': 'inferiores',
  'coxa esquerda': 'inferiores',
  'panturrilha direita': 'inferiores',
  'panturrilha esquerda': 'inferiores',
}

const MEASURE_COLORS = ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6']

export function FitPage() {
  const module = MODULE_BY_ID['fit']
  const {
    weights,
    measurements,
    bioimpedance,
    sessions,
    isSyncing,
    fitUserEmail,
    isFitAuthenticated,
    userHeightCm,
    measurementGoals,
    setupAutoSync,
    fetchData,
    logout,
    setUserHeightCm,
    deleteWorkoutSession,
    deleteWeightLocal,
    deleteMeasurementLocal,
    getLatestWeight,
    getWeightDelta,
    getWeightStats,
    getWeeklyStreak,
    getLatestWorkoutSession,
    getMeasurementDeltas,
    getHealthIndices,
    appUrl,
  } = useFitStore()

  const [activeTab, setActiveTab] = useState<TabType>('geral')
  const [weightRange, setWeightRange] = useState<WeightRange>('30d')
  const [measureFilter, setMeasureFilter] = useState<MeasureFilter>('todas')
  const [selectedMultiLines, setSelectedMultiLines] = useState<string[]>(['cintura', 'peitoral / tórax', 'braço direito'])
  const [editingHeight, setEditingHeight] = useState(false)
  const [tempHeight, setTempHeight] = useState<string>(String(userHeightCm || 175))

  const [weightModalOpen, setWeightModalOpen] = useState(false)
  const [measurementModalOpen, setMeasurementModalOpen] = useState(false)
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  // Sincronização 100% automática (Realtime + Focus + Background)
  useEffect(() => {
    const cleanup = setupAutoSync()
    return cleanup
  }, [setupAutoSync])

  const latestWeight = getLatestWeight()
  const weightDelta = getWeightDelta()
  const weightStats = getWeightStats()
  const streak = getWeeklyStreak()
  const { session: latestSession, relativeTime: latestSessionTime } = getLatestWorkoutSession()
  const measurementDeltas = getMeasurementDeltas()
  const healthIndices = getHealthIndices()
  const latestBio = bioimpedance.length > 0 ? bioimpedance[0] : null

  // Weight chart data filtered by range
  const chartData = useMemo(() => {
    const sorted = [...weights].sort((a, b) => a.log_date.localeCompare(b.log_date))
    if (sorted.length === 0) return []

    const now = new Date()
    let cutoff = new Date()
    if (weightRange === '7d') cutoff.setDate(now.getDate() - 7)
    else if (weightRange === '30d') cutoff.setDate(now.getDate() - 30)
    else if (weightRange === '90d') cutoff.setDate(now.getDate() - 90)
    else cutoff = new Date('2000-01-01')

    const cutoffStr = cutoff.toISOString().slice(0, 10)
    const filtered = sorted.filter((w) => w.log_date >= cutoffStr)
    const baseList = filtered.length > 0 ? filtered : sorted.slice(-10)

    return baseList.map((w) => {
      const parts = w.log_date.split('-')
      const dayMonth = parts.length === 3 ? `${parts[2]}/${parts[1]}` : w.log_date
      return {
        date: dayMonth,
        rawDate: w.log_date,
        peso: w.weight_kg,
      }
    })
  }, [weights, weightRange])

  const minChart = useMemo(() => {
    if (chartData.length === 0) return 60
    const min = Math.min(...chartData.map((d) => d.peso))
    return Math.floor(min - 1)
  }, [chartData])

  const maxChart = useMemo(() => {
    if (chartData.length === 0) return 100
    const max = Math.max(...chartData.map((d) => d.peso))
    return Math.ceil(max + 1)
  }, [chartData])

  // Multi-line chart data for measurements evolution
  const multiLineChartData = useMemo(() => {
    if (measurements.length === 0) return []
    const datesSet = new Set<string>()
    const dataByDate: Record<string, Record<string, number>> = {}

    for (const m of measurements) {
      datesSet.add(m.log_date)
      if (!dataByDate[m.log_date]) dataByDate[m.log_date] = {}
      dataByDate[m.log_date][m.label.toLowerCase().trim()] = m.value_cm
    }

    const sortedDates = Array.from(datesSet).sort((a, b) => a.localeCompare(b))
    return sortedDates.map((dateStr) => {
      const parts = dateStr.split('-')
      const dayMonth = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr
      return {
        date: dayMonth,
        rawDate: dateStr,
        ...dataByDate[dateStr],
      }
    })
  }, [measurements])

  // Filtered measurement deltas based on zone filter
  const filteredMeasurementDeltas = useMemo(() => {
    if (measureFilter === 'todas' || measureFilter === 'indices' || measureFilter === 'grafico') {
      return measurementDeltas
    }
    return measurementDeltas.filter((m) => {
      const key = m.label.toLowerCase().trim()
      const zone = ZONE_MAP[key]
      return zone === measureFilter
    })
  }, [measurementDeltas, measureFilter])

  // Available measurement labels for multi-line comparison
  const availableLabels = useMemo(() => {
    const set = new Set<string>()
    for (const m of measurements) {
      set.add(m.label.toLowerCase().trim())
    }
    return Array.from(set)
  }, [measurements])

  // Hermes Fit Insight dinâmico
  const hermesInsight = useMemo(() => {
    const parts: string[] = []

    if (streak.count === 0) {
      parts.push('Nenhum treino registrado ainda nesta semana. Que tal agendar a primeira sessão no FitWellHub?')
    } else if (streak.isGoalMet) {
      parts.push(`🔥 Excelente! Meta semanal batida com ${streak.count} treinos concluídos!`)
    } else {
      parts.push(`Você já concluiu ${streak.count} de ${streak.goal} treinos previstos para esta semana. Mantenha o ritmo!`)
    }

    if (latestWeight) {
      if (weightDelta && weightDelta.diff !== 0) {
        const diffStr = weightDelta.diff > 0 ? `+${weightDelta.diff} kg` : `${weightDelta.diff} kg`
        parts.push(`Peso atual em ${latestWeight.weight_kg} kg (${diffStr} vs última pesagem).`)
      } else {
        parts.push(`Peso estável em ${latestWeight.weight_kg} kg.`)
      }
    }

    if (healthIndices.ice) {
      parts.push(`Índice Cintura/Estatura: ${healthIndices.ice.value} (${healthIndices.ice.classification}).`)
    }

    return parts.join(' ')
  }, [streak, latestWeight, weightDelta, healthIndices])

  const handleSaveHeight = (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(tempHeight.replace(',', '.'))
    if (!isNaN(val) && val >= 100 && val <= 250) {
      setUserHeightCm(val)
      setEditingHeight(false)
    }
  }

  const toggleMultiLineLabel = (label: string) => {
    if (selectedMultiLines.includes(label)) {
      if (selectedMultiLines.length > 1) {
        setSelectedMultiLines(selectedMultiLines.filter((l) => l !== label))
      }
    } else {
      if (selectedMultiLines.length < 5) {
        setSelectedMultiLines([...selectedMultiLines, label])
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com ações rápidas e indicador de sincronização */}
      <PageHeader module={module}>
        {/* Status de Sincronização Automática Compacto */}
        <button
          type="button"
          onClick={() => fetchData()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2 sm:px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all shrink-0"
          title="Sincronização em tempo real ativa. Clique para forçar atualização agora."
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="hidden lg:inline font-medium">Sincronizado</span>
          <RefreshCw className={cn('h-3.5 w-3.5 text-emerald-400 shrink-0', isSyncing && 'animate-spin')} />
        </button>

        {isFitAuthenticated ? (
          <div className="hidden xl:flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-300 shrink-0">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="truncate max-w-[100px] font-medium" title={fitUserEmail || 'Conectado'}>
              {fitUserEmail ? fitUserEmail.split('@')[0] : 'Conectado'}
            </span>
            <button
              onClick={() => logout()}
              className="text-zinc-500 hover:text-rose-400 p-0.5 ml-0.5 transition-colors"
              title="Desconectar conta FitWell"
            >
              <LogOut className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Button
            variant="soft"
            size="sm"
            onClick={() => setLoginModalOpen(true)}
            className="hidden sm:inline-flex gap-1.5 border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 shrink-0 text-xs px-2 sm:px-3"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Conectar</span>
          </Button>
        )}

        <a
          href={appUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-emerald-300 transition-all shadow-sm shrink-0"
          title="Abrir aplicativo FitWellHub para treinar"
        >
          <span className="hidden xs:inline sm:inline">FitWellHub</span>
          <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
        </a>

        <Button
          variant="soft"
          size="sm"
          onClick={() => setWeightModalOpen(true)}
          className="gap-1.5 shrink-0 px-2.5 sm:px-3"
        >
          <Scale className="h-3.5 w-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Pesar</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setMeasurementModalOpen(true)}
          className="gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20 shrink-0 px-2.5 sm:px-3"
        >
          <Ruler className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Medir</span>
        </Button>
      </PageHeader>

      {/* Banner de Aviso quando não conectado */}
      {!isFitAuthenticated && (
        <div
          onClick={() => setLoginModalOpen(true)}
          className="cursor-pointer rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent p-4 transition-all hover:border-emerald-500/60 shadow-lg shadow-amber-950/10"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <LogIn className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-zinc-100">
                  Conecte sua conta do FitWellHub
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Entre com seu e-mail e senha do FitWell para puxar seus treinos, pesos e medidas em tempo real automaticamente.
                </p>
              </div>
            </div>
            <Button size="sm" variant="primary" className="shrink-0 bg-emerald-500 text-white">
              Conectar 🚀
            </Button>
          </div>
        </div>
      )}

      {/* Card Inteligente: Hermes Fit Insights */}
      <Card className="relative overflow-hidden border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900/70 to-teal-950/30 p-4 sm:p-5 shadow-lg shadow-emerald-950/20">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
            <Bot className="h-5 w-5" />
          </div>
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs sm:text-sm text-zinc-100">Hermes Fit Radar</h3>
              <span className="chip py-0 px-2 text-[9px] sm:text-[10px] text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                <Sparkles className="h-2.5 w-2.5 mr-1 text-emerald-400" />
                Live Sync
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-3xl">
              {hermesInsight}
            </p>
          </div>
        </div>
      </Card>

      {/* Navegação por Abas / Seletor de Visualização */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'geral', label: 'Visão Geral', icon: LayoutGrid },
          { id: 'treinos', label: 'Treinos Realizados', icon: Dumbbell, count: sessions.length },
          { id: 'peso', label: 'Evolução do Peso', icon: Scale, count: weights.length },
          { id: 'medidas', label: 'Medidas Corporais', icon: Ruler, count: measurements.length },
          { id: 'bioimpedancia', label: 'Bioimpedância', icon: Activity, count: bioimpedance.length },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-all',
                isActive
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200 border border-zinc-800/60',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.2 text-[10px] font-bold',
                    isActive ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* TAB 1: VISÃO GERAL (BENTO GRID EXECUTIVO) */}
      {activeTab === 'geral' && (
        <div className="space-y-6">
          {/* Top Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Streak Semanal */}
            <Card className="p-4 flex flex-col justify-between border-zinc-800 bg-zinc-900/40 hover:border-emerald-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Consistência Semanal
                  </span>
                  <Flame className={cn('h-4 w-4', streak.count > 0 ? 'text-orange-400' : 'text-zinc-600')} />
                </div>

                <div className="grid grid-cols-7 gap-1.5 my-2">
                  {streak.days.map((day) => (
                    <div
                      key={day.dateStr}
                      className={cn(
                        'flex flex-col items-center justify-center p-1.5 rounded-xl border text-center transition-all',
                        day.trained
                          ? 'bg-orange-500/20 border-orange-500/50 text-orange-300 font-bold'
                          : day.isToday
                          ? 'bg-zinc-800 border-zinc-600 text-zinc-200 font-semibold'
                          : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-600',
                      )}
                      title={day.workoutName ? `${day.dayLabel}: ${day.workoutName}` : `${day.dayLabel} (${day.dateStr})`}
                    >
                      <span className="text-[9px] uppercase font-bold">{day.dayLabel}</span>
                      <span className="text-xs mt-0.5">{day.dayNumber}</span>
                      {day.trained ? (
                        <Flame className="h-3 w-3 mt-1 text-orange-400 fill-orange-400/30" />
                      ) : (
                        <Minus className="h-3 w-3 mt-1 text-zinc-700" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                <span className="text-zinc-400">
                  {streak.count} de {streak.goal} treinos
                </span>
                <span className={cn('font-bold', streak.isGoalMet ? 'text-emerald-400' : 'text-orange-400')}>
                  {streak.isGoalMet ? '🔥 Meta Batida!' : `${streak.goal - streak.count} restantes`}
                </span>
              </div>
            </Card>

            {/* 2. Último Treino Realizado */}
            <Card className="p-4 flex flex-col justify-between border-zinc-800 bg-zinc-900/40 hover:border-emerald-500/30 transition-all">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Último Treino
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Dumbbell className="h-3.5 w-3.5" />
                  </span>
                </div>

                {latestSession ? (
                  <div className="mt-1">
                    <p className="font-bold text-base text-zinc-100 line-clamp-1">
                      {latestSession.name}
                    </p>
                    <p className="text-xs text-emerald-400 font-medium mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{latestSessionTime}</span>
                    </p>
                    {latestSession.notes && (
                      <p className="text-xs text-zinc-400 mt-2 line-clamp-2 italic bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/40">
                        "{latestSession.notes}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-zinc-500 text-xs">
                    <p>Nenhum treino concluído ainda.</p>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 transition-colors"
                >
                  <span>Abrir FitWell</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span className="text-[11px] text-zinc-500">
                  {sessions.length} total
                </span>
              </div>
            </Card>

            {/* 3. Peso Atual & Tendência */}
            <Card className="p-4 flex flex-col justify-between border-zinc-800 bg-zinc-900/40 hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => setWeightModalOpen(true)}>
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Peso Atual
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Scale className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="mt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-zinc-100 tracking-tight">
                      {latestWeight ? latestWeight.weight_kg : '—'}
                    </span>
                    <span className="text-sm font-bold text-zinc-400">kg</span>
                  </div>

                  {weightDelta && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                      {weightDelta.diff === 0 ? (
                        <span className="chip py-0 px-2 text-[10px] text-zinc-400 border-zinc-700 bg-zinc-800">
                          Estável
                        </span>
                      ) : weightDelta.diff < 0 ? (
                        <span className="chip py-0 px-2 text-[10px] text-emerald-300 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-0.5">
                          <TrendingDown className="h-3 w-3" />
                          <span>{weightDelta.diff} kg</span>
                        </span>
                      ) : (
                        <span className="chip py-0 px-2 text-[10px] text-amber-300 border-amber-500/30 bg-amber-500/10 flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" />
                          <span>+{weightDelta.diff} kg</span>
                        </span>
                      )}
                      <span className="text-[11px] text-zinc-500">vs pesagem anterior</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                <span>{latestWeight ? `Data: ${latestWeight.log_date}` : 'Sem registros'}</span>
                <span className="text-emerald-400 font-semibold">+ Pesar</span>
              </div>
            </Card>

            {/* 4. Medidas em Foco */}
            <Card className="p-4 flex flex-col justify-between border-zinc-800 bg-zinc-900/40 hover:border-emerald-500/30 transition-all cursor-pointer" onClick={() => setActiveTab('medidas')}>
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Circunferências
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <Ruler className="h-3.5 w-3.5" />
                  </span>
                </div>

                <div className="space-y-2 mt-2">
                  {measurementDeltas.slice(0, 2).map((m) => (
                    <div key={m.label} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 capitalize font-medium">{m.label}:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-zinc-100">{m.current} cm</span>
                        {typeof m.diff === 'number' && (
                          <span
                            className={cn(
                              'text-[10px] font-semibold',
                              m.diff === 0 ? 'text-zinc-500' : m.diff < 0 ? 'text-emerald-400' : 'text-amber-400',
                            )}
                          >
                            ({m.diff > 0 ? `+${m.diff}` : m.diff}cm)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}

                  {measurementDeltas.length === 0 && (
                    <p className="text-zinc-500 text-xs py-2 text-center">Nenhuma medida salva</p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                <span>{measurementDeltas.length} regiões salvas</span>
                <span className="text-emerald-400 font-semibold">+ Medir</span>
              </div>
            </Card>
          </div>

          {/* Gráfico Rápido de Peso + Timeline de Treinos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico Curva de Peso */}
            <Card className="lg:col-span-2">
              <CardHeader
                title="Curva de Peso Corporal"
                subtitle={latestWeight ? `Peso atual: ${latestWeight.weight_kg} kg` : undefined}
                action={
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                    {(['7d', '30d', '90d', 'all'] as WeightRange[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setWeightRange(r)}
                        className={cn(
                          'px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all',
                          weightRange === r
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200',
                        )}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                }
              />
              <div className="p-4 pt-2">
                {chartData.length < 2 ? (
                  <div className="h-60 flex flex-col items-center justify-center text-zinc-500 text-sm">
                    <Scale className="h-8 w-8 mb-2 text-zinc-600" />
                    <p>Adicione pelo menos 2 registros para visualizar a curva gráfica.</p>
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="weightGradOverview" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                        <YAxis domain={[minChart, maxChart]} stroke="#71717a" fontSize={11} tickLine={false} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null
                            const d = payload[0].payload
                            return (
                              <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 p-2.5 text-xs shadow-xl">
                                <p className="font-bold text-emerald-400">{d.peso} kg</p>
                                <p className="text-zinc-500">{d.rawDate}</p>
                              </div>
                            )
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="peso"
                          stroke="#10b981"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#weightGradOverview)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </Card>

            {/* Últimos Treinos Concluídos */}
            <Card className="flex flex-col justify-between">
              <CardHeader
                title="Treinos Recentes"
                subtitle="Sincronizados do FitWellHub"
                action={
                  <a
                    href={appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                  >
                    <span>Treinar ↗</span>
                  </a>
                }
              />

              <div className="divide-y divide-zinc-800/60 overflow-y-auto max-h-72 flex-1">
                {sessions.slice(0, 5).map((s) => (
                  <div key={s.id} className="p-3.5 hover:bg-white/[0.02] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs text-zinc-100 truncate">{s.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {new Date(s.completed_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteWorkoutSession(s.id)}
                      className="text-zinc-600 hover:text-rose-400 p-1 transition-colors"
                      title="Excluir treino"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {sessions.length === 0 && (
                  <div className="p-6 text-center text-zinc-500 text-xs">
                    <Dumbbell className="h-6 w-6 mx-auto mb-1.5 text-zinc-600" />
                    <p>Nenhum treino concluído ainda.</p>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-zinc-800/60 bg-zinc-950/20 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('treinos')}
                  className="text-xs text-zinc-400 hover:text-zinc-200 w-full justify-center"
                >
                  Ver Histórico Completo ({sessions.length})
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: TREINOS REALIZADOS (HISTÓRICO SINCRONIZADO) */}
      {activeTab === 'treinos' && (
        <div className="space-y-6">
          {/* Banner Chamada para o FitWellHub */}
          <div className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-emerald-950/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Dumbbell className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-zinc-100">
                  Execução de Treinos no FitWellHub
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 max-w-xl">
                  Para iniciar um treino, registrar cargas, séries e repetições com cronômetro, abra o FitWellHub. Quando você clicar em "Finalizar Treino" lá, o registro cairá aqui automaticamente em tempo real!
                </p>
              </div>
            </div>

            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-xs px-4 py-2.5 transition-all shadow-lg shadow-emerald-500/20 shrink-0"
            >
              <span>Abrir FitWellHub</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Histórico Completo de Treinos */}
          <Card>
            <CardHeader
              title="Histórico de Treinos Sincronizados"
              subtitle={`${sessions.length} sessões concluídas`}
              action={
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => setWorkoutModalOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Registrar Manual</span>
                </Button>
              }
            />

            {sessions.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">
                <Dumbbell className="h-10 w-10 mx-auto mb-3 text-zinc-600" />
                <p className="text-sm font-medium">Nenhum treino concluído registrado ainda.</p>
                <p className="text-xs mt-1 text-zinc-600">
                  Abra o FitWellHub para iniciar sua ficha de treino!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-zinc-100 truncate">{session.name}</p>
                        {session.notes && (
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{session.notes}</p>
                        )}
                        <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {new Date(session.completed_at).toLocaleString('pt-BR', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="chip text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                        Concluído
                      </span>
                      <button
                        onClick={() => deleteWorkoutSession(session.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Excluir este treino do histórico"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: PESO & EVOLUÇÃO */}
      {activeTab === 'peso' && (
        <div className="space-y-6">
          {/* KPIs Estatísticos do Peso */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard
              label="Peso Atual"
              value={latestWeight ? `${latestWeight.weight_kg} kg` : '—'}
              hint={latestWeight ? `Em ${latestWeight.log_date}` : 'Sem dados'}
              icon={Scale}
              soft="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            />
            <KpiCard
              label="Menor Peso"
              value={weightStats.min ? `${weightStats.min} kg` : '—'}
              hint="Histórico total"
              icon={TrendingDown}
              soft="border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
            />
            <KpiCard
              label="Maior Peso"
              value={weightStats.max ? `${weightStats.max} kg` : '—'}
              hint="Histórico total"
              icon={TrendingUp}
              soft="border-amber-500/30 bg-amber-500/10 text-amber-300"
            />
            <KpiCard
              label="Média Geral"
              value={weightStats.avg ? `${weightStats.avg} kg` : '—'}
              hint={`${weightStats.totalEntries} registros`}
              icon={Activity}
              soft="border-violet-500/30 bg-violet-500/10 text-violet-300"
            />
          </div>

          {/* Gráfico Detalhado de Evolução */}
          <Card>
            <CardHeader
              title="Curva Detalhada de Evolução"
              action={
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                    {(['7d', '30d', '90d', 'all'] as WeightRange[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setWeightRange(r)}
                        className={cn(
                          'px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all',
                          weightRange === r
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200',
                        )}
                      >
                        {r.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setWeightModalOpen(true)}
                    className="gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white"
                  >
                    <Scale className="h-3.5 w-3.5" />
                    <span>Nova Pesagem</span>
                  </Button>
                </div>
              }
            />
            <div className="p-4 pt-2">
              {chartData.length < 2 ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-sm">
                  <Scale className="h-8 w-8 mb-2 text-zinc-600" />
                  <p>Adicione pelo menos 2 registros para visualizar o gráfico de linha.</p>
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="weightGradDetailed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                      <YAxis domain={[minChart, maxChart]} stroke="#71717a" fontSize={11} tickLine={false} />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0].payload
                            return (
                              <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 p-2.5 text-xs shadow-xl">
                                <p className="font-bold text-emerald-400">{d.peso} kg</p>
                                <p className="text-zinc-500">{d.rawDate}</p>
                              </div>
                            )
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="peso"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#weightGradDetailed)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>

          {/* Tabela de Pesagens */}
          <Card>
            <CardHeader title="Histórico de Pesagens" subtitle={`${weights.length} registros sincronizados`} />
            <div className="divide-y divide-zinc-800/60 max-h-96 overflow-y-auto">
              {weights.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800/60 text-zinc-300 font-bold text-xs">
                      kg
                    </div>
                    <div>
                      <p className="font-bold text-zinc-100 text-sm">{w.weight_kg} kg</p>
                      <p className="text-[11px] text-zinc-500">{w.log_date}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteWeightLocal(w.id)}
                    className="text-xs text-zinc-600 hover:text-rose-400 p-1.5 transition-colors"
                    title="Excluir"
                  >
                    Excluir
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: MEDIDAS CORPORAIS COMPLETO & ZONAS ANATÔMICAS */}
      {activeTab === 'medidas' && (
        <div className="space-y-6">
          {/* Top Bar com Sub-Filtros e Ações */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-2xl overflow-x-auto w-full sm:w-auto scrollbar-none">
              {[
                { id: 'todas', label: 'Todas', icon: Layers },
                { id: 'tronco', label: 'Tronco & Core', icon: Activity },
                { id: 'superiores', label: 'Superiores', icon: Dumbbell },
                { id: 'inferiores', label: 'Inferiores', icon: Flame },
                { id: 'indices', label: 'Calculadoras & Índices', icon: HeartPulse },
                { id: 'grafico', label: 'Comparativo Multi-Linhas', icon: LineChartIcon },
              ].map((f) => {
                const Icon = f.icon
                const isSelected = measureFilter === f.id
                return (
                  <button
                    key={f.id}
                    onClick={() => setMeasureFilter(f.id as MeasureFilter)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                      isSelected
                        ? 'bg-cyan-500 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{f.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setMeasurementModalOpen(true)}
                className="gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/20"
              >
                <Ruler className="h-3.5 w-3.5" />
                <span>Nova Medida</span>
              </Button>
            </div>
          </div>

          {/* SEÇÃO 1: CALCULADORAS & ÍNDICES DE SAÚDE */}
          {(measureFilter === 'indices' || measureFilter === 'todas') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <HeartPulse className="h-4 w-4 text-cyan-400" />
                  <span>Calculadoras & Índices Corporais de Saúde</span>
                </h3>

                {/* Botão de Ajustar Altura */}
                <button
                  onClick={() => setEditingHeight(!editingHeight)}
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>Sua Altura: {userHeightCm || 175} cm</span>
                </button>
              </div>

              {/* Form de Edição de Altura */}
              {editingHeight && (
                <form
                  onSubmit={handleSaveHeight}
                  className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 flex items-center gap-3 animate-in fade-in duration-200"
                >
                  <div className="flex-1">
                    <label className="text-xs font-bold text-zinc-300">
                      Informe sua Estatura / Altura (em cm)
                    </label>
                    <input
                      type="number"
                      value={tempHeight}
                      onChange={(e) => setTempHeight(e.target.value)}
                      className="input w-full mt-1 text-sm font-bold text-cyan-300"
                      placeholder="Ex: 178"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="primary" className="bg-cyan-500 text-white mt-5">
                    Salvar Altura
                  </Button>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Índice Cintura-Estatura (ICE) */}
                <Card className="p-4 border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Índice Cintura/Estatura (ICE)
                    </span>
                    <span className="text-[10px] font-bold text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 rounded-md">
                      Ideal &lt; 0.50
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-zinc-100">
                        {healthIndices.ice ? healthIndices.ice.value : '—'}
                      </span>
                      <span className="text-xs text-zinc-500">ratio</span>
                    </div>
                    <p className="text-xs mt-1 font-semibold text-emerald-400">
                      {healthIndices.ice ? healthIndices.ice.classification : 'Requer medida de cintura'}
                    </p>
                  </div>
                </Card>

                {/* 2. Índice Cintura-Quadril (ICQ) */}
                <Card className="p-4 border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Índice Cintura/Quadril (ICQ)
                    </span>
                    <span className="text-[10px] font-bold text-violet-400 border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 rounded-md">
                      OMS
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-zinc-100">
                        {healthIndices.icq ? healthIndices.icq.value : '—'}
                      </span>
                      <span className="text-xs text-zinc-500">ratio</span>
                    </div>
                    <p className="text-xs mt-1 font-semibold text-emerald-400">
                      {healthIndices.icq ? healthIndices.icq.classification : 'Requer cintura e quadril'}
                    </p>
                  </div>
                </Card>

                {/* 3. IMC Estimado */}
                <Card className="p-4 border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      IMC Atual
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                      {userHeightCm || 175} cm
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-zinc-100">
                        {healthIndices.imc ? `${healthIndices.imc.value}` : '—'}
                      </span>
                      <span className="text-xs text-zinc-500">kg/m²</span>
                    </div>
                    <p className="text-xs mt-1 font-semibold text-emerald-400">
                      {healthIndices.imc ? healthIndices.imc.classification : 'Requer pesagem'}
                    </p>
                  </div>
                </Card>

                {/* 4. Simetria Muscular */}
                <Card className="p-4 border-zinc-800 bg-zinc-900/50">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Simetria Muscular
                    </span>
                    <GitCompare className="h-3.5 w-3.5 text-orange-400" />
                  </div>
                  <div className="space-y-1 mt-1 text-xs">
                    {healthIndices.symmetries.length > 0 ? (
                      healthIndices.symmetries.map((sym) => (
                        <div key={sym.label} className="flex items-center justify-between">
                          <span className="text-zinc-400">{sym.label}:</span>
                          <span className={cn('font-bold', sym.diff <= 0.5 ? 'text-emerald-400' : 'text-amber-400')}>
                            Δ {sym.diff} cm
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-zinc-500 text-xs py-2">
                        Meça lados D e E para calcular simetria
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* SEÇÃO 2: GRÁFICO COMPARATIVO MULTI-LINHAS */}
          {(measureFilter === 'grafico' || measureFilter === 'todas') && (
            <Card>
              <CardHeader
                title="Evolução Comparativa das Medidas"
                subtitle="Compare o histórico de diferentes regiões corporais ao mesmo tempo"
                action={
                  <div className="flex flex-wrap items-center gap-1.5">
                    {availableLabels.map((lbl, idx) => {
                      const isSelected = selectedMultiLines.includes(lbl)
                      const color = MEASURE_COLORS[idx % MEASURE_COLORS.length]
                      return (
                        <button
                          key={lbl}
                          onClick={() => toggleMultiLineLabel(lbl)}
                          className={cn(
                            'px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all capitalize',
                            isSelected
                              ? 'bg-zinc-800 border-zinc-500 text-zinc-100 shadow-sm'
                              : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:text-zinc-300',
                          )}
                          style={{ borderColor: isSelected ? color : undefined }}
                        >
                          <span
                            className="inline-block w-2 h-2 rounded-full mr-1"
                            style={{ backgroundColor: color }}
                          />
                          {lbl}
                        </button>
                      )
                    })}
                  </div>
                }
              />
              <div className="p-4 pt-2">
                {multiLineChartData.length < 2 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-sm">
                    <Ruler className="h-8 w-8 mb-2 text-zinc-600" />
                    <p>Adicione medições em datas diferentes para visualizar o comparativo.</p>
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={multiLineChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                        <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip
                          content={({ active, payload, label: lDate }) => {
                            if (!active || !payload?.length) return null
                            return (
                              <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 p-3 text-xs shadow-xl space-y-1.5">
                                <p className="font-bold text-zinc-300 border-b border-zinc-800 pb-1">{payload[0]?.payload?.rawDate || lDate}</p>
                                {payload.map((item: any) => (
                                  <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                                    <span style={{ color: item.color }} className="capitalize font-semibold">{item.name}:</span>
                                    <span className="font-bold text-zinc-100">{item.value} cm</span>
                                  </div>
                                ))}
                              </div>
                            )
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        {selectedMultiLines.map((lbl, idx) => {
                          const color = MEASURE_COLORS[idx % MEASURE_COLORS.length]
                          return (
                            <Line
                              key={lbl}
                              type="monotone"
                              dataKey={lbl}
                              name={lbl}
                              stroke={color}
                              strokeWidth={3}
                              dot={{ r: 4, fill: color }}
                              activeDot={{ r: 6 }}
                              connectNulls
                            />
                          )
                        })}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* SEÇÃO 3: CARDS VISUAIS DE MEDIDAS COM METAS & VARIAÇÃO */}
          {measureFilter !== 'grafico' && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Circunferências ({filteredMeasurementDeltas.length} regiões)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredMeasurementDeltas.map((m) => {
                  const goal = measurementGoals[m.label.toLowerCase().trim()]
                  return (
                    <div
                      key={m.label}
                      className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 hover:border-cyan-500/40 hover:bg-zinc-900/70 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
                            {m.label}
                          </p>
                          {typeof m.diff === 'number' && (
                            <span
                              className={cn(
                                'chip py-0 px-1.5 text-[9px] font-bold',
                                m.diff === 0
                                  ? 'border-zinc-700 bg-zinc-800 text-zinc-400'
                                  : m.diff < 0
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300',
                              )}
                            >
                              {m.diff > 0 ? `+${m.diff}` : m.diff} cm
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-zinc-100 tracking-tight">
                            {m.current}
                          </span>
                          <span className="text-xs font-semibold text-cyan-400">cm</span>
                        </div>
                      </div>

                      {/* Barra de Meta se existir */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-800/60">
                        {goal ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-zinc-400">
                              <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                                <Target className="h-3 w-3" />
                                <span>Meta: {goal} cm</span>
                              </span>
                              <span>{Math.abs(Number((m.current - goal).toFixed(1)))} cm rest.</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-400 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.max(15, (goal / m.current) * 100))}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-zinc-500 flex items-center justify-between">
                            <span>Atualizado em {m.logDate}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Histórico Geral de Medidas */}
          <Card>
            <CardHeader title="Histórico Completo de Medidas" subtitle={`${measurements.length} medições salvas`} />
            <div className="divide-y divide-zinc-800/60 max-h-96 overflow-y-auto">
              {measurements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  <div>
                    <p className="font-semibold text-zinc-200 text-sm capitalize">{m.label}</p>
                    <p className="text-[11px] text-zinc-500">{m.log_date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-cyan-300 text-sm">{m.value_cm} cm</span>
                    <button
                      onClick={() => deleteMeasurementLocal(m.id)}
                      className="text-xs text-zinc-600 hover:text-rose-400 transition-colors"
                      title="Excluir"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 5: BIOIMPEDÂNCIA */}
      {activeTab === 'bioimpedancia' && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Bioimpedância & Composição Corporal"
              subtitle={latestBio ? `Última medição realizada em ${latestBio.log_date}` : 'Nenhum exame cadastrado'}
            />
            <div className="p-4">
              {latestBio ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-4">
                    <p className="text-xs text-zinc-500 font-semibold">% de Gordura Corporal</p>
                    <p className="text-2xl font-extrabold text-orange-400 mt-1">
                      {latestBio.body_fat_pct ? `${latestBio.body_fat_pct}%` : '—'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-4">
                    <p className="text-xs text-zinc-500 font-semibold">Massa Muscular</p>
                    <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                      {latestBio.muscle_mass_kg ? `${latestBio.muscle_mass_kg} kg` : '—'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-4">
                    <p className="text-xs text-zinc-500 font-semibold">Água Corporal</p>
                    <p className="text-2xl font-extrabold text-cyan-400 mt-1">
                      {latestBio.body_water_pct ? `${latestBio.body_water_pct}%` : '—'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-4">
                    <p className="text-xs text-zinc-500 font-semibold">Gordura Visceral</p>
                    <p className="text-2xl font-extrabold text-rose-400 mt-1">
                      {latestBio.visceral_fat ? `Nível ${latestBio.visceral_fat}` : '—'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-4">
                    <p className="text-xs text-zinc-500 font-semibold">Taxa Metabólica Basal</p>
                    <p className="text-2xl font-extrabold text-violet-400 mt-1">
                      {latestBio.bmr_machine ? `${latestBio.bmr_machine} kcal` : '—'}
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/70 p-4">
                    <p className="text-xs text-zinc-500 font-semibold">Idade Metabólica</p>
                    <p className="text-2xl font-extrabold text-amber-400 mt-1">
                      {latestBio.metabolic_age ? `${latestBio.metabolic_age} anos` : '—'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-zinc-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                  <p>Nenhum log de bioimpedância cadastrado ainda.</p>
                  <p className="text-xs mt-1 text-zinc-600">
                    Você pode importar ou lançar seus exames através do FitWellHub.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modais */}
      <WeightModal open={weightModalOpen} onClose={() => setWeightModalOpen(false)} />
      <MeasurementModal open={measurementModalOpen} onClose={() => setMeasurementModalOpen(false)} />
      <WorkoutModal open={workoutModalOpen} onClose={() => setWorkoutModalOpen(false)} />
      <FitLoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </div>
  )
}
