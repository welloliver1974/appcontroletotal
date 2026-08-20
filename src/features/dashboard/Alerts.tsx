import { CalendarClock, CheckCircle2, Mail, ShoppingBasket, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DashboardData } from './dashboardData'
import { upcomingWindowDays } from './dashboardData'
import { EmptyState } from '@/components/ui/feedback'
import { SectionHeader } from '@/components/ui/primitives'
import { cn, relativeDayLabel } from '@/lib/utils'

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
  critico: 'bg-rose-500',
  atencao: 'bg-orange-500',
  info: 'bg-purple-500',
}

function buildAlerts(data: DashboardData): AlertItem[] {
  const items: AlertItem[] = []
  const today = new Date()

  for (const a of data.assets) {
    if (a.nextMaintenance) {
      const overdue = a.nextMaintenance < new Date().toISOString().slice(0, 10)
      if (overdue || upcomingWindowDays(a.nextMaintenance, 7)) {
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

/** Urgent/maintenance grid aggregated from manutenção, despensa and inbox. */
export function AlertsGrid({ data }: { data: DashboardData }) {
  const alerts = buildAlerts(data)

  return (
    <section className="space-y-3">
      <SectionHeader eyebrow="Radar" title="Alertas & avisos" />
      {alerts.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-6 w-6" />}
          title="Tudo em dia por aqui"
          description="Sem manutenções pendentes, itens em falta ou emails críticos."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((a) => (
            <div key={a.id} className="card card-hover flex items-start gap-3 p-3.5">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border', TONES[a.tone])}>
                <a.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-100">{a.title}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500">{a.meta}</p>
              </div>
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', DOTS[a.tone])} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}