import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/data/api'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import type {
  AgendaEvent,
  Asset,
  InboxEmail,
  LifeLogEntry,
  MaintMonth,
  PantryItem,
  WeeklySpending,
} from '@/data/types'

export interface DashboardData {
  events: AgendaEvent[]
  emails: InboxEmail[]
  lifeLog: LifeLogEntry[]
  assets: Asset[]
  pantry: PantryItem[]
  spending: WeeklySpending[]
  maintMonths: MaintMonth[]
}

const DASHBOARD_COLLECTIONS = ['events', 'emails', 'lifeLog', 'assets', 'pantry', 'spending', 'maintMonths']

/** Loads every collection the dashboard reads through the API (async + skeleton + realtime). */
export function useDashboardData(): DashboardData | null {
  const [data, setData] = useState<DashboardData | null>(null)
  const aliveRef = useRef(true)

  const reload = useCallback(async () => {
    const [events, emails, lifeLog, assets, pantry, spending, maintMonths] =
      await Promise.all([
        api.list<AgendaEvent>('events'),
        api.list<InboxEmail>('emails'),
        api.list<LifeLogEntry>('lifeLog'),
        api.list<Asset>('assets'),
        api.list<PantryItem>('pantry'),
        api.list<WeeklySpending>('spending'),
        api.list<MaintMonth>('maintMonths'),
      ])
    if (aliveRef.current) {
      setData({ events, emails, lifeLog, assets, pantry, spending, maintMonths })
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    void reload()
    return () => {
      aliveRef.current = false
    }
  }, [reload])

  useRealtimeSync(DASHBOARD_COLLECTIONS, reload)

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