import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/data/api'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import type {
  AgendaEvent,
  Asset,
  DailyHabit,
  FixedBill,
  MaintenanceRecord,
  PantryItem,
  Trip,
} from '@/data/types'
import { buildTodayPlan, type RawTodayData, type TodayPlan, todayIsoString } from './hojeUtils'

const HOJE_COLLECTIONS = [
  'events',
  'fixedBills',
  'pantry',
  'assets',
  'maintenance',
  'habits',
  'trips',
]

export interface UseHojeDataResult {
  rawData: RawTodayData | null
  plan: TodayPlan
  loading: boolean
  reload: () => Promise<void>
  toggleHabit: (habitId: string) => Promise<void>
  toggleEventCompleted: (eventId: string) => Promise<void>
}

export function useHojeData(): UseHojeDataResult {
  const [rawData, setRawData] = useState<RawTodayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())
  const aliveRef = useRef(true)

  // Atualiza relógio local a cada 30 segundos e quando a aba ganha foco
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 30000)

    const onFocus = () => setNow(new Date())
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  const reload = useCallback(async () => {
    try {
      const [events, fixedBills, pantry, assets, maintenance, habits, trips] = await Promise.all([
        api.list<AgendaEvent>('events').catch(() => []),
        api.list<FixedBill>('fixedBills').catch(() => []),
        api.list<PantryItem>('pantry').catch(() => []),
        api.list<Asset>('assets').catch(() => []),
        api.list<MaintenanceRecord>('maintenance').catch(() => []),
        api.list<DailyHabit>('habits').catch(() => []),
        api.list<Trip>('trips').catch(() => []),
      ])

      if (aliveRef.current) {
        setRawData({
          events: Array.isArray(events) ? events : [],
          fixedBills: Array.isArray(fixedBills) ? fixedBills : [],
          pantry: Array.isArray(pantry) ? pantry : [],
          assets: Array.isArray(assets) ? assets : [],
          maintenance: Array.isArray(maintenance) ? maintenance : [],
          habits: Array.isArray(habits) ? habits.sort((a, b) => (a.order || 0) - (b.order || 0)) : [],
          trips: Array.isArray(trips) ? trips : [],
        })
      }
    } finally {
      if (aliveRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    aliveRef.current = true
    void reload()
    return () => {
      aliveRef.current = false
    }
  }, [reload])

  useRealtimeSync(HOJE_COLLECTIONS, reload)

  const toggleHabit = useCallback(
    async (habitId: string) => {
      if (!rawData) return
      const today = todayIsoString(now)
      const target = rawData.habits.find((h) => h.id === habitId)
      if (!target) return

      const isDone = (target.completedDates || []).includes(today)
      const nextDates = isDone
        ? target.completedDates.filter((d) => d !== today)
        : [...(target.completedDates || []), today]

      // Atualização otimista imediata
      setRawData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          habits: prev.habits.map((h) => (h.id === habitId ? { ...h, completedDates: nextDates } : h)),
        }
      })

      await api.update<DailyHabit>('habits', habitId, { completedDates: nextDates }).catch(() => {
        void reload()
      })
    },
    [rawData, now, reload],
  )

  const toggleEventCompleted = useCallback(
    async (eventId: string) => {
      if (!rawData) return
      const target = rawData.events.find((e) => e.id === eventId)
      if (!target) return

      const nextCompleted = !target.completed

      // Atualização otimista imediata
      setRawData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          events: prev.events.map((e) => (e.id === eventId ? { ...e, completed: nextCompleted } : e)),
        }
      })

      await api.update<AgendaEvent>('events', eventId, { completed: nextCompleted }).catch(() => {
        void reload()
      })
    },
    [rawData, reload],
  )

  const plan = useMemo(() => {
    return buildTodayPlan(rawData || {}, now)
  }, [rawData, now])

  return {
    rawData,
    plan,
    loading,
    reload,
    toggleHabit,
    toggleEventCompleted,
  }
}
