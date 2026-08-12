import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/data/api'
import type { PantryItem } from '@/data/types'

export interface DespensaData {
  items: PantryItem[]
}

/**
 * Loads despensa data through the mock API. Mutation handlers patch the state
 * directly with what api.create/update/remove returns — no re-fetch, no flicker.
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

  const setItems = useCallback(
    (items: PantryItem[]) => setData((d) => (d ? { ...d, items } : d)),
    [],
  )

  return { data, reload, setItems }
}