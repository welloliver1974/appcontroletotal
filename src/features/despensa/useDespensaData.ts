import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/data/api'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import type { PantryItem } from '@/data/types'

export interface DespensaData {
  items: PantryItem[]
}

const DESPENSA_COLLECTIONS = ['pantry']

/**
 * Loads despensa data through the API with realtime updates.
 */
export function useDespensaData() {
  const [data, setData] = useState<DespensaData | null>(null)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    const items = await api.list<PantryItem>('pantry')
    if (alive.current) setData({ items })
  }, [])

  useEffect(() => {
    alive.current = true
    void reload()
    return () => {
      alive.current = false
    }
  }, [reload])

  useRealtimeSync(DESPENSA_COLLECTIONS, reload)

  const setItems = useCallback(
    (items: PantryItem[]) => setData((d) => (d ? { ...d, items } : d)),
    [],
  )

  return { data, reload, setItems }
}