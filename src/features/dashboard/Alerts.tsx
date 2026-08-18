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
    const overdue = a.nextMaintenance < new Date().toISOString().slice(0, 10)
    if (overdue || upcomingWindowDays(a.nextMaintenance, 7)) {
      items.push({
        id: `ast-${a.id}`,
        kind: 'manutencao',
        title: overdue ? `Manutenção atrasada — ${a.name}` : `Manutenção iminente — ${a.name}`,
        meta: `${relativeDayLabel(a.nextMaintenance, today)} · vida útil ${a.lifePct}%`,
        tone: overdue ? 'critico' : 'atencao',
        icon: Wrench,
      })
    } else if (a.lifePct <= 25) {
      items.push({
        id: `life-${a.id}`,
        kind: 'manutencao',
        title: `Fim de vida útil — ${a.name}`,
        meta: `apenas ${a.lifePct}% restante`,
        tone: 'atencao',
        icon: Wrench,
      })
    }
  }

  for (const p of data.pantry) {
    if (p.qty <= p.lowThreshold) {
      items.push({
        id: `pan-${p.id}`,
        kind: 'estoque',
        title: `Estoque baixo — ${p.name}`,
        meta: `${p.qty} ${p.unit} restantes (mín. ${p.lowThreshold})`,
        tone: p.expiresAt ? 'info' : 'atencao',
        icon: ShoppingBasket,
      })
    }
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