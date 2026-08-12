import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/data/api'
import type { Place, Trip } from '@/data/types'

export interface ViagensData {
  trips: Trip[]
  places: Place[]
}

/**
 * Loads trips + places through the mock API. Mutation handlers patch the state
 * directly with what api.create/update/remove returns — no re-fetch, no flicker.
 */
export function useViagensData() {
  const [data, setData] = useState<ViagensData | null>(null)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    const [trips, places] = await Promise.all([
      api.list<Trip>('trips'),
      api.list<Place>('places'),
    ])
    if (alive.current) setData({ trips, places })
  }, [])

  useEffect(() => {
    alive.current = true
    void reload()
    return () => {
      alive.current = false
    }
  }, [reload])

  const setTrips = useCallback(
    (trips: Trip[]) => setData((d) => (d ? { ...d, trips } : d)),
    [],
  )
  const setPlaces = useCallback(
    (places: Place[]) => setData((d) => (d ? { ...d, places } : d)),
    [],
  )

  return { data, reload, setTrips, setPlaces }
}