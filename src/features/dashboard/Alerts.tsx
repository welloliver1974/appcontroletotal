import { Link } from 'react-router-dom'
import { ArrowUpRight, BellRing, CalendarClock, CheckCircle2, Mail, ShoppingBasket, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DashboardData } from './dashboardData'
import { upcomingWindowDays } from './dashboardData'
import { Card } from '@/components/ui/Card'
import { cn, isValidIsoDate, relativeDayLabel } from '@/lib/utils'

type Tone = 'critico' | 'atencao' | 'info'

interface AlertItem {
  id: string
  kind: 'manutencao' | 'estoque' | 'email' | 'agenda'
  title: string
  meta: string
  tone: Tone
  icon: LucideIcon
}

const TONES: Record<Tone, string> = {
  critico: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  atencao: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  info: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
}

const DOTS: Record<Tone, string> = {
  critico: 'bg-rose-500 shadow-sm shadow-rose-500/50',
  atencao: 'bg-orange-500',
  info: 'bg-purple-500',
}

function buildAlerts(data: DashboardData): AlertItem[] {
  const items: AlertItem[] = []
  const today = new Date()

  for (const a of data.assets) {
    if (isValidIsoDate(a.nextMaintenance)) {
      const overdue = (a.nextMaintenance as string) < new Date().toISOString().slice(0, 10)
      if (overdue || upcomingWindowDays(a.nextMaintenance as string, 7)) {
        items.push({
          id: `ast-${a.id}`,
          kind: 'manutencao',
          title: overdue ? `Manutenção atrasada — ${a.name}` : `Manutenção iminente — ${a.name}`,
          meta: `${relativeDayLabel(a.nextMaintenance, today)}${a.lifePct ? ` · vida útil ${a.lifePct}%` : ''}`,
          tone: overdue ? 'critico' : 'atencao',
          icon: Wrench,
        })
      }
    } else if (typeof a.lifePct === 'number' && a.lifePct > 0 && a.lifePct <= 20) {
      items.push({
        id: `life-${a.id}`,
        kind: 'manutencao',
        title: `Atenção — ${a.name}`,
        meta: `Saúde do ativo em ${a.lifePct}%`,
        tone: 'atencao',
        icon: Wrench,
      })
    }
  }

  // Agrupamento consolidado de itens de despensa
  const lowStock = data.pantry.filter((p) => p.qty <= p.lowThreshold)
  if (lowStock.length > 0) {
    const names = lowStock.slice(0, 4).map((p) => p.name).join(', ')
    const extra = lowStock.length > 4 ? ` e mais ${lowStock.length - 4}` : ''
    const hasZero = lowStock.some((p) => p.qty === 0)

    items.push({
      id: 'pantry-low-stock-grouped',
      kind: 'estoque',
      title: `${lowStock.length} ${lowStock.length === 1 ? 'item em falta' : 'itens em falta para comprar'}`,
      meta: `${names}${extra}`,
      tone: hasZero ? 'critico' : 'atencao',
      icon: ShoppingBasket,
    })
  }

  const expiring = data.pantry.filter((p) => {
    if (!p.expiresAt) return false
    const exp = new Date(p.expiresAt)
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 0 && diffDays <= 3
  })

  if (expiring.length > 0) {
    const names = expiring.slice(0, 3).map((p) => p.name).join(', ')
    const extra = expiring.length > 3 ? ` e mais ${expiring.length - 3}` : ''

    items.push({
      id: 'pantry-expiring-grouped',
      kind: 'estoque',
      title: `${expiring.length} ${expiring.length === 1 ? 'item vencendo em breve' : 'itens com validade próxima'}`,
      meta: `${names}${extra}`,
      tone: 'info',
      icon: ShoppingBasket,
    })
  }

  for (const e of data.emails) {
    if (e.importance === 'critico' && !e.read) {
      items.push({
        id: `eml-${e.id}`,
        kind: 'email',
        title: `Email crítico — ${e.subject}`,
        meta: e.from,
        tone: 'critico',
        icon: Mail,
      })
    }
  }

  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const localToday = `${y}-${m}-${d}`

  for (const ev of data.events) {
    if (ev.date === localToday) {
      items.push({
        id: `ev-${ev.id}`,
        kind: 'agenda',
        title: `Hoje: ${ev.title}`,
        meta: `${ev.timeStart}${ev.timeEnd ? ` – ${ev.timeEnd}` : ''}${ev.location ? ` · ${ev.location}` : ''}`,
        tone: 'info',
        icon: CalendarClock,
      })
    }
  }

  const rank: Record<Tone, number> = { critico: 0, atencao: 1, info: 2 }
  return items.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 8)
}

/** Radar de alertas em formato Card Premium, consistente com Finanças e Compras. */
export function AlertsGrid({ data }: { data: DashboardData }) {
  const alerts = buildAlerts(data)

  return (
    <Card className="flex flex-col p-3.5 sm:p-4 space-y-3.5 sm:space-y-4 border-zinc-800/80 bg-zinc-900/60 shadow-lg shadow-black/20 w-full min-w-0 overflow-hidden">
      {/* Header do Card */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <BellRing className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 truncate">
              Radar de Alertas
            </h4>
            <p className="text-[11px] text-zinc-500 truncate">
              Pendências prioritárias
            </p>
          </div>
        </div>

        {alerts.length > 0 ? (
          <span className="chip text-[9.5px] sm:text-[10px] text-amber-400 border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-medium shrink-0">
            {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
          </span>
        ) : (
          <span className="chip text-[9.5px] sm:text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-medium shrink-0">
            ✅ Em dia
          </span>
        )}
      </div>

      {/* Lista de Alertas ou Estado Vazio */}
      {alerts.length === 0 ? (
        <div className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-zinc-300 min-w-0">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-zinc-200 truncate">Tudo em dia por aqui!</p>
            <p className="text-[11px] text-zinc-500 truncate">
              Sem manutenções atrasadas ou itens em falta.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5 w-full min-w-0">
          {alerts.map((a) => {
            const targetPath =
              a.kind === 'manutencao'
                ? '/manutencao'
                : a.kind === 'estoque'
                ? '/despensa'
                : '/agenda'

            return (
              <Link
                key={a.id}
                to={targetPath}
                className="group flex items-center gap-2.5 sm:gap-3 p-2.5 rounded-xl border border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all min-w-0 w-full overflow-hidden"
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                    TONES[a.tone],
                  )}
                >
                  <a.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                      {a.title}
                    </p>
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-zinc-400 transition-all shrink-0" />
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{a.meta}</p>
                </div>
                <span className={cn('h-2 w-2 shrink-0 rounded-full', DOTS[a.tone])} />
              </Link>
            )
          })}
        </div>
      )}
    </Card>
  )
}