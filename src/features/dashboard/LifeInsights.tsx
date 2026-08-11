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

// Recharts v3 Tooltip content may be a component; keep payload loosely typed.
function ChartTooltip({
  active,
  payload,
  format,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string; payload: { week: string } }>
  format?: (n: number) => string
}) {
  if (!active || !payload?.length) return null
  const formatted = format ? format(Number(payload[0]?.value ?? 0)) : payload[0]?.value
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/95 px-3 py-2 text-xs shadow-xl shadow-black/40">
      <p className="font-num font-semibold text-zinc-200">{formatted}</p>
      <p className="mt-0.5 text-zinc-500">{shortWeekLabel(payload[0].payload.week)}</p>
    </div>
  )
}

/** 3 compact trend charts (Life Insights) driven by the mock series. */
export function LifeInsights({ data }: { data: DashboardData }) {
  return (
    <section className="space-y-3">
      <SectionHeader
        eyebrow="Life Insights"
        title="Tendências"
        action={<span className="chip">últimas 8 semanas</span>}
      />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {/* Gastos */}
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

        {/* Vocabulário */}
        <Card>
          <CardHeader title="Vocabulário" subtitle="palavras novas por semana" />
          <div className="h-40 p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.vocab} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="week"
                  tickFormatter={(v: string) => shortWeekLabel(v)}
                  {...AXIS}
                  tick={{ fill: '#71717a', fontSize: 10 }}
                />
                <YAxis {...AXIS} tick={{ fill: '#71717a', fontSize: 10 }} width={26} />
                <Tooltip content={<ChartTooltip format={(n) => `+${n} palavras`} />} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} />
                <Bar dataKey="words" name="Palavras" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Manutenção */}
        <Card>
          <CardHeader title="Frequência de manutenção" subtitle={`nº de registros / mês`} />
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
      </div>
    </section>
  )
}