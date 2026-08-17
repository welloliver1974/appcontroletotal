import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/data/api'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import type { Place, Trip } from '@/data/types'

export interface ViagensData {
  trips: Trip[]
  places: Place[]
}

const VIAGENS_COLLECTIONS = ['trips', 'places']

/**
 * Loads trips + places through the API with realtime updates.
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

  useRealtimeSync(VIAGENS_COLLECTIONS, reload)

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