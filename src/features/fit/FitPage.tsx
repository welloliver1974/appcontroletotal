import { useEffect, useState, useMemo } from 'react'
import {
  Activity,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  ExternalLink,
  Flame,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Ruler,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
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

export function FitPage() {
  const module = MODULE_BY_ID['fit']
  const {
    weights,
    measurements,
    bioimpedance,
    templates,
    sessions,
    isSyncing,
    fitUserEmail,
    isFitAuthenticated,
    initFitAuth,
    fetchData,
    logout,
    logWorkoutSession,
    deleteWeightLocal,
    deleteMeasurementLocal,
    getLatestWeight,
    getWeightDelta,
    getLatestMeasurementsByLabel,
    appUrl,
  } = useFitStore()

  const [activeTab, setActiveTab] = useState<'treinos' | 'peso' | 'medidas' | 'bioimpedancia'>('treinos')
  const [weightModalOpen, setWeightModalOpen] = useState(false)
  const [measurementModalOpen, setMeasurementModalOpen] = useState(false)
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  useEffect(() => {
    initFitAuth()
  }, [initFitAuth])

  const latestWeight = getLatestWeight()
  const weightDelta = getWeightDelta()
  const latestMeasurements = getLatestMeasurementsByLabel()
  const latestBio = bioimpedance.length > 0 ? bioimpedance[0] : null

  // Calculate workouts this week
  const workoutsThisWeek = useMemo(() => {
    const today = new Date()
    const firstDayOfWeek = new Date(today)
    firstDayOfWeek.setDate(today.getDate() - today.getDay())
    firstDayOfWeek.setHours(0, 0, 0, 0)

    return sessions.filter((s) => new Date(s.completed_at) >= firstDayOfWeek).length
  }, [sessions])

  // Weight chart data sorted chronologically
  const chartData = useMemo(() => {
    return [...weights]
      .sort((a, b) => a.log_date.localeCompare(b.log_date))
      .map((w) => {
        const parts = w.log_date.split('-')
        const dayMonth = parts.length === 3 ? `${parts[2]}/${parts[1]}` : w.log_date
        return {
          date: dayMonth,
          rawDate: w.log_date,
          peso: w.weight_kg,
        }
      })
  }, [weights])

  const minWeight = useMemo(() => {
    if (chartData.length === 0) return 60
    const min = Math.min(...chartData.map((d) => d.peso))
    return Math.floor(min - 2)
  }, [chartData])

  const maxWeight = useMemo(() => {
    if (chartData.length === 0) return 100
    const max = Math.max(...chartData.map((d) => d.peso))
    return Math.ceil(max + 2)
  }, [chartData])

  return (
    <div className="space-y-6">
      {/* Header com ações rápidas */}
      <PageHeader module={module}>
        <button
          onClick={() => fetchData()}
          disabled={isSyncing}
          className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-2 text-zinc-400 hover:text-zinc-100 active:scale-95 transition-all"
          title="Sincronizar com FitWellHub"
        >
          <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin text-emerald-400')} />
        </button>

        {isFitAuthenticated ? (
          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="truncate max-w-[120px] font-medium" title={fitUserEmail || 'Conectado'}>
              {fitUserEmail ? fitUserEmail.split('@')[0] : 'Conectado'}
            </span>
            <button
              onClick={() => logout()}
              className="text-zinc-400 hover:text-rose-400 p-0.5 ml-1 transition-colors"
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
            className="gap-1.5 border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Conectar Conta</span>
          </Button>
        )}

        <a
          href={appUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-all"
          title="Abrir aplicativo FitWellHub"
        >
          <span>FitWellHub</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        <Button
          variant="soft"
          size="sm"
          onClick={() => setWeightModalOpen(true)}
          className="gap-1.5"
        >
          <Scale className="h-4 w-4 text-emerald-400" />
          <span className="hidden sm:inline">Pesar</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setWorkoutModalOpen(true)}
          className="gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/20"
        >
          <Dumbbell className="h-4 w-4" />
          <span>Treinar</span>
        </Button>
      </PageHeader>

      {/* Banner de Aviso quando não conectado */}
      {!isFitAuthenticated && (
        <div
          onClick={() => setLoginModalOpen(true)}
          className="cursor-pointer rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-emerald-500/10 to-transparent p-4 transition-all hover:border-emerald-500/60"
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
                  Clique aqui para entrar com seu e-mail e senha do FitWell e sincronizar seus treinos, pesos e medidas em tempo real.
                </p>
              </div>
            </div>
            <Button size="sm" variant="primary" className="shrink-0 bg-emerald-500 text-white">
              Conectar 🚀
            </Button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div onClick={() => setWeightModalOpen(true)} className="cursor-pointer">
          <KpiCard
            label="Peso Atual"
            value={latestWeight ? `${latestWeight.weight_kg} kg` : '—'}
            hint={
              weightDelta
                ? weightDelta.diff === 0
                  ? 'Estável'
                  : weightDelta.diff > 0
                  ? `+${weightDelta.diff} kg vs ant.`
                  : `${weightDelta.diff} kg vs ant.`
                : 'Sem histórico'
            }
            icon={Scale}
            soft="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          />
        </div>

        <div onClick={() => setWorkoutModalOpen(true)} className="cursor-pointer">
          <KpiCard
            label="Treinos na Semana"
            value={`${workoutsThisWeek} sessões`}
            hint={workoutsThisWeek >= 4 ? '🔥 Meta batida!' : 'Em andamento'}
            icon={Flame}
            soft="border-orange-500/30 bg-orange-500/10 text-orange-300"
          />
        </div>

        <div onClick={() => setMeasurementModalOpen(true)} className="cursor-pointer">
          <KpiCard
            label="Cintura / Abdômen"
            value={
              latestMeasurements['cintura']
                ? `${latestMeasurements['cintura'].value_cm} cm`
                : latestMeasurements['abdômen']
                ? `${latestMeasurements['abdômen'].value_cm} cm`
                : '—'
            }
            hint={
              latestMeasurements['cintura']
                ? `Em ${latestMeasurements['cintura'].log_date.slice(5)}`
                : 'Medir agora'
            }
            icon={Ruler}
            soft="border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
          />
        </div>

        <div onClick={() => setActiveTab('bioimpedancia')} className="cursor-pointer">
          <KpiCard
            label="Composição Corporal"
            value={latestBio?.body_fat_pct ? `${latestBio.body_fat_pct}% BF` : 'FitWell'}
            hint={
              latestBio?.muscle_mass_kg
                ? `${latestBio.muscle_mass_kg} kg MM`
                : isFitAuthenticated
                ? 'Nuvem ativa'
                : 'Desconectado'
            }
            icon={Activity}
            soft="border-violet-500/30 bg-violet-500/10 text-violet-300"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800/80 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'treinos', label: 'Treinos & Sessões', icon: Dumbbell },
          { id: 'peso', label: 'Evolução do Peso', icon: Scale },
          { id: 'medidas', label: 'Medidas Corporais', icon: Ruler },
          { id: 'bioimpedancia', label: 'Bioimpedância', icon: Activity },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap',
                isActive
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60',
              )}
            >
              <Icon className={cn('h-4 w-4', isActive ? 'text-emerald-400' : 'text-zinc-500')} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: Treinos & Sessões */}
      {activeTab === 'treinos' && (
        <div className="space-y-6">
          {/* Fichas / Rotinas de Treino */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
                Rotinas de Treino Cadastradas
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWorkoutModalOpen(true)}
                className="gap-1 text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Registrar Sessão</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 hover:border-emerald-500/40 hover:bg-zinc-900/80 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Dumbbell className="h-4 w-4" />
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                        Ficha
                      </span>
                    </div>
                    <h3 className="font-semibold text-zinc-100 group-hover:text-emerald-300 transition-colors">
                      {tpl.name}
                    </h3>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                    <button
                      onClick={() => logWorkoutSession(tpl.name, tpl.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Concluir Hoje</span>
                    </button>
                    <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Histórico Recente de Treinos Concluídos */}
          <Card>
            <CardHeader
              title="Histórico de Treinos Realizados"
              subtitle={`${sessions.length} sessões concluídas`}
              action={
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => setWorkoutModalOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Novo Treino</span>
                </Button>
              }
            />

            {sessions.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                <Dumbbell className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                <p className="text-sm font-medium">Nenhum treino registrado ainda.</p>
                <p className="text-xs mt-1 text-zinc-600">
                  Clique em "Concluir Hoje" em uma ficha acima ou fale com o Hermes!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3.5 sm:p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-100 truncate">{session.name}</p>
                        {session.notes && (
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{session.notes}</p>
                        )}
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          {new Date(session.completed_at).toLocaleString('pt-BR', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    </div>

                    <span className="chip text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shrink-0">
                      Concluído
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: Peso & Evolução */}
      {activeTab === 'peso' && (
        <div className="space-y-6">
          {/* Gráfico de Evolução de Peso */}
          <Card>
            <CardHeader
              title="Curva de Peso Corporal"
              subtitle={latestWeight ? `Peso atual: ${latestWeight.weight_kg} kg` : undefined}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setWeightModalOpen(true)}
                  className="gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white"
                >
                  <Scale className="h-3.5 w-3.5" />
                  <span>Nova Pesagem</span>
                </Button>
              }
            />
            <div className="p-4 pt-2">
              {chartData.length < 2 ? (
                <div className="h-56 flex flex-col items-center justify-center text-zinc-500 text-sm">
                  <Scale className="h-8 w-8 mb-2 text-zinc-600" />
                  <p>Adicione pelo menos 2 registros de peso para visualizar o gráfico de linha.</p>
                </div>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                      <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                      <YAxis
                        domain={[minWeight, maxWeight]}
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        unit="kg"
                      />
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
                        fill="url(#weightGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </Card>

          {/* Tabela de Pesagens */}
          <Card>
            <CardHeader title="Histórico de Pesagens" subtitle={`${weights.length} registros no FitWell`} />
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

      {/* TAB 3: Medidas Corporais */}
      {activeTab === 'medidas' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">
              Últimas Medições Registradas
            </h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setMeasurementModalOpen(true)}
              className="gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-white"
            >
              <Ruler className="h-3.5 w-3.5" />
              <span>Nova Medida</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.values(latestMeasurements).map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 hover:border-cyan-500/40 hover:bg-zinc-900/70 transition-all"
              >
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider truncate">
                  {m.label}
                </p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-zinc-100 tracking-tight">
                    {m.value_cm}
                  </span>
                  <span className="text-xs font-semibold text-cyan-400">cm</span>
                </div>
                <p className="mt-2 text-[10px] text-zinc-500">Atualizado em {m.log_date}</p>
              </div>
            ))}
          </div>

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
                    <p className="font-semibold text-zinc-200 text-sm">{m.label}</p>
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

      {/* TAB 4: Bioimpedância */}
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
                  <p className="text-sm font-medium">Nenhum exame de bioimpedância registrado.</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    Você pode registrar seus exames no FitWellHub ou ditar os valores para o Hermes!
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Modais */}
      <FitLoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      <WeightModal open={weightModalOpen} onClose={() => setWeightModalOpen(false)} />
      <MeasurementModal
        open={measurementModalOpen}
        onClose={() => setMeasurementModalOpen(false)}
      />
      <WorkoutModal open={workoutModalOpen} onClose={() => setWorkoutModalOpen(false)} />
    </div>
  )
}
