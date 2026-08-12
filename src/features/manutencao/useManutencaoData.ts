import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/data/api'
import type { Asset, MaintenanceRecord } from '@/data/types'

export interface ManutencaoData {
  assets: Asset[]
  records: MaintenanceRecord[]
}

/**
 * Loads manutencao data through the mock API. Mutation handlers patch the state
 * directly with what api.create/update/remove returns — no re-fetch, no flicker.
 */
export function useManutencaoData() {
  const [data, setData] = useState<ManutencaoData | null>(null)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    const [assets, records] = await Promise.all([
      api.list<Asset>('assets'),
      api.list<MaintenanceRecord>('maintenance'),
    ])
    if (alive.current) setData({ assets, records })
  }, [])

  useEffect(() => {
    alive.current = true
    void reload()
    return () => {
      alive.current = false
    }
  }, [reload])

  const setAssets = useCallback(
    (assets: Asset[]) => setData((d) => (d ? { ...d, assets } : d)),
    [],
  )
  const setRecords = useCallback(
    (records: MaintenanceRecord[]) => setData((d) => (d ? { ...d, records } : d)),
    [],
  )

  return { data, reload, setAssets, setRecords }
}