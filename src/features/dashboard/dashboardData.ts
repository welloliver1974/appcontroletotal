import { useEffect, useState } from 'react'
import { api } from '@/data/api'
import type {
  AgendaEvent,
  Asset,
  InboxEmail,
  LifeLogEntry,
  MaintMonth,
  PantryItem,
  VocabWeek,
  WeeklySpending,
} from '@/data/types'

export interface DashboardData {
  events: AgendaEvent[]
  emails: InboxEmail[]
  lifeLog: LifeLogEntry[]
  assets: Asset[]
  pantry: PantryItem[]
  spending: WeeklySpending[]
  vocab: VocabWeek[]
  maintMonths: MaintMonth[]
}

/** Loads every collection the dashboard reads through the mock API (async + skeleton). */
export function useDashboardData(): DashboardData | null {
  const [data, setData] = useState<DashboardData | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [events, emails, lifeLog, assets, pantry, spending, vocab, maintMonths] =
        await Promise.all([
          api.list<AgendaEvent>('events'),
          api.list<InboxEmail>('emails'),
          api.list<LifeLogEntry>('lifeLog'),
          api.list<Asset>('assets'),
          api.list<PantryItem>('pantry'),
          api.list<WeeklySpending>('spending'),
          api.list<VocabWeek>('vocab'),
          api.list<MaintMonth>('maintMonths'),
        ])
      if (alive) setData({ events, emails, lifeLog, assets, pantry, spending, vocab, maintMonths })
    })()
    return () => {
      alive = false
    }
  }, [])

  return data
}

/** YYYY-MM-DD → short "02 ago" label, tolerant to naive dates. */
export function shortWeekLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/** Counts an upcoming window in ISO days from today. */
export function upcomingWindowDays(date: string, days: number): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(`${date}T00:00:00`)
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000)
  return diff >= 0 && diff <= days
}