import { CalendarClock, Inbox as InboxIcon, NotebookPen } from 'lucide-react'
import type { DashboardData } from './dashboardData'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/feedback'
import { cn, relativeDayLabel, shortDate, shortDateTime } from '@/lib/utils'

const CATEGORY: Record<string, string> = {
  reuniao: 'text-rose-300 bg-rose-500/15 border-rose-500/30',
  pessoal: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30',
  habit: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
  viagem: 'text-blue-300 bg-blue-500/15 border-blue-500/30',
}

function Mood({ value }: { value: number }) {
  return (
    <span className="flex shrink-0 gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            i <= value ? 'bg-emerald-400' : 'bg-zinc-700/70',
          )}
        />
      ))}
    </span>
  )
}

export function UpcomingCard({ data }: { data: DashboardData }) {
  const upcoming = data.events
    .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date) || a.timeStart.localeCompare(b.timeStart))
    .slice(0, 5)

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Próximos compromissos"
        subtitle={`${upcoming.length} pela frente`}
        action={<CalendarClock className="h-4 w-4 text-rose-400" />}
      />
      {upcoming.length === 0 ? (
        <div className="p-4">
          <EmptyState title="Nada agendado" description="Compromissos futuros aparecem aqui." />
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/70">
          {upcoming.map((e) => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              <div
                className={cn(
                  'flex h-10 w-11 shrink-0 flex-col items-center justify-center rounded-lg border',
                  CATEGORY[e.category],
                )}
              >
                <span className="font-num text-[13px] font-semibold leading-none">
                  {shortDate(e.date).split(' ')[0]}
                </span>
                <span className="text-[9px] uppercase leading-tight">
                  {shortDate(e.date).split(' ')[1]}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-100">{e.title}</p>
                <p className="truncate text-xs text-zinc-500">
                  <span className="font-num">{e.timeStart}</span>
                  {e.location ? ` · ${e.location}` : ''} · {relativeDayLabel(e.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function EmailsCard({ data }: { data: DashboardData }) {
  const emails = [...data.emails]
    .sort((a, b) => {
      const ra = a.importance === 'critico' ? 0 : 1
      const rb = b.importance === 'critico' ? 0 : 1
      return ra - rb || b.sentAt.localeCompare(a.sentAt)
    })
    .slice(0, 4)

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Emails críticos"
        subtitle="priorizados pelo Hermes"
        action={<InboxIcon className="h-4 w-4 text-rose-400" />}
      />
      {emails.length === 0 ? (
        <div className="p-4">
          <EmptyState title="Inbox limpo" description="Emails importantes filtrados pelo Hermes." />
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/70">
          {emails.map((e) => (
            <div key={e.id} className="px-4 py-3">
              <div className="flex items-center gap-2">
                {e.importance === 'critico' && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                )}
                <p className="truncate text-sm font-medium text-zinc-100">{e.subject}</p>
              </div>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {e.from} · <span className="font-num">{relativeDayLabel(e.sentAt)}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function RecentLogCard({ data }: { data: DashboardData }) {
  const entries = [...data.lifeLog]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Life-Log recente"
        subtitle="seu diário com IA"
        action={<NotebookPen className="h-4 w-4 text-emerald-400" />}
      />
      {entries.length === 0 ? (
        <div className="p-4">
          <EmptyState title="Sem anotações" description="Novas entradas aparecem aqui." />
        </div>
      ) : (
        <div className="divide-y divide-zinc-800/70">
          {entries.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-100">{l.title}</p>
                <p className="truncate text-xs text-zinc-500">
                  <span className="font-num">{shortDateTime(l.createdAt)}</span>
                </p>
              </div>
              <Mood value={l.mood} />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}