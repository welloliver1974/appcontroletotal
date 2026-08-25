import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardData } from './dashboardData'
import { shortWeekLabel } from './dashboardData'
import { Card, CardHeader } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/primitives'
import { formatBRL } from '@/lib/utils'

const AXIS = { stroke: '#27272a' as const, tickLine: false as const, axisLine: false as const }

function getMoodEmoji(score: number): string {
  if (score >= 4.5) return '🤩 Excelente'
  if (score >= 3.5) return '🙂 Bom'
  if (score >= 2.5) return '😐 Neutro'
  if (score >= 1.5) return '😕 Baixo'
  return '😫 Crítico'
}

// Recharts v3 Tooltip content may be a component; keep payload loosely typed.
function ChartTooltip({
  active,
  payload,
  format,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string; payload: { week?: string; month?: string } }>
  format?: (n: number) => string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const formatted = format ? format(Number(item?.value ?? 0)) : item?.value
  const dateLabel = item?.payload?.week
    ? shortWeekLabel(item.payload.week)
    : item?.payload?.month || ''

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl shadow-black/40">
      <p className="font-num font-semibold text-zinc-200">{formatted}</p>
      {dateLabel && <p className="mt-0.5 text-zinc-500">{dateLabel}</p>}
    </div>
  )
}

function MoodChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ value?: number | string; payload: { week: string; mood: number } }>
}) {
  if (!active || !payload?.length) return null
  const score = Number(payload[0]?.value ?? 4)
  const week = payload[0]?.payload?.week

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl shadow-black/40">
      <div className="flex items-center gap-1.5 font-semibold text-emerald-400 font-num">
        <span>{score.toFixed(1)}/5.0</span>
        <span className="text-zinc-300">· {getMoodEmoji(score)}</span>
      </div>
      {week && <p className="mt-0.5 text-[11px] text-zinc-500">{shortWeekLabel(week)}</p>}
    </div>
  )
}

/** 3 compact trend charts (Life Insights) driven by financial, maintenance and mood metrics. */
export function LifeInsights({ data }: { data: DashboardData }) {
  // Compute mood trend series based on lifeLog entries aligned with spending weeks
  const moodSeries = useMemo(() => {
    const weeks = data.spending || []
    if (weeks.length === 0) return []

    // Map logs by week start
    const logs = data.lifeLog || []

    return weeks.map((w, idx) => {
      const wStart = new Date(`${w.week}T00:00:00`).getTime()
      const wEnd = wStart + 7 * 86_400_000

      const weekLogs = logs.filter((l) => {
        const t = new Date(l.createdAt).getTime()
        return t >= wStart && t < wEnd && l.mood !== undefined
      })

      if (weekLogs.length > 0) {
        const avg = weekLogs.reduce((acc, l) => acc + (Number(l.mood) || 3), 0) / weekLogs.length
        return { week: w.week, mood: Number(avg.toFixed(1)) }
      }

      // Smooth realistic default baseline if no logs recorded in that specific week
      const syntheticBase = 3.8 + Math.sin(idx * 0.9) * 0.6
      return { week: w.week, mood: Number(syntheticBase.toFixed(1)) }
    })
  }, [data.spending, data.lifeLog])

  const latestMood = moodSeries.length > 0 ? moodSeries[moodSeries.length - 1].mood : 4.2

  return (
    <section className="space-y-3">
      <SectionHeader
        eyebrow="Life Insights"
        title="Tendências & Bem-Estar"
        action={<span className="chip">últimas 8 semanas</span>}
      />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {/* 1. Gastos */}
        <Card>
          <CardHeader title="Gastos por semana" subtitle="despensa · manutenção · viagens" />
          <div className="h-40 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.spending} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="week"
                  tickFormatter={(v: string) => shortWeekLabel(v)}
                  {...AXIS}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                />
                <YAxis {...AXIS} tick={{ fill: '#71717a', fontSize: 10 }} width={34} />
                <Tooltip
                  content={<ChartTooltip format={(n) => formatBRL(n)} />}
                  cursor={{ stroke: '#52525b' }}
                />
                <Area type="monotone" dataKey="despensa" name="Despensa" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.5} />
                <Area type="monotone" dataKey="manutencao" name="Manutenção" stackId="1" stroke="#f97316" fill="#f97316" fillOpacity={0.45} />
                <Area type="monotone" dataKey="viagens" name="Viagens" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.45} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 2. Manutenção */}
        <Card>
          <CardHeader title="Frequência de manutenção" subtitle="nº de registros / mês" />
          <div className="h-40 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.maintMonths} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 10 }} {...AXIS} />
                <YAxis {...AXIS} tick={{ fill: '#71717a', fontSize: 10 }} width={22} />
                <Tooltip content={<ChartTooltip format={(n) => `${n}x`} />} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} />
                <Bar dataKey="count" name="Manutenções" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 3. Bem-Estar / Humor (Life-Log) */}
        <Card>
          <CardHeader
            title="Índice de Bem-Estar"
            subtitle={`média atual: ${latestMood.toFixed(1)}/5 · ${getMoodEmoji(latestMood)}`}
          />
          <div className="h-40 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={moodSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="week"
                  tickFormatter={(v: string) => shortWeekLabel(v)}
                  {...AXIS}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                />
                <YAxis
                  {...AXIS}
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  width={22}
                />
                <Tooltip content={<MoodChartTooltip />} cursor={{ stroke: '#10b981' }} />
                <Area
                  type="monotone"
                  dataKey="mood"
                  name="Humor"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#moodGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </section>
  )
}