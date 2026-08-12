import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/data/api'
import type { Fact, LifeLogEntry, MediaItem, ReadingEntry } from '@/data/types'

export interface LifeLogData {
  logs: LifeLogEntry[]
  reading: ReadingEntry[]
  media: MediaItem[]
  facts: Fact[]
}

/**
 * Loads life-log data through the mock API. Mutation handlers patch the state
 * directly with what api.create/update/remove returns — no re-fetch, no flicker.
 */
export function useLifeLogData() {
  const [data, setData] = useState<LifeLogData | null>(null)
  const alive = useRef(true)

  const reload = useCallback(async () => {
    const [logs, reading, media, facts] = await Promise.all([
      api.list<LifeLogEntry>('lifeLog'),
      api.list<ReadingEntry>('reading'),
      api.list<MediaItem>('media'),
      api.list<Fact>('facts'),
    ])
    if (alive.current) setData({ logs, reading, media, facts })
  }, [])

  useEffect(() => {
    alive.current = true
    void reload()
    return () => {
      alive.current = false
    }
  }, [reload])

  // Keep `data` non-null after first load; settle existing state while refetching.
  const setLogs = useCallback(
    (logs: LifeLogEntry[]) => setData((d) => (d ? { ...d, logs } : d)),
    [],
  )
  const setReading = useCallback(
    (reading: ReadingEntry[]) => setData((d) => (d ? { ...d, reading } : d)),
    [],
  )
  const setFacts = useCallback(
    (facts: Fact[]) => setData((d) => (d ? { ...d, facts } : d)),
    [],
  )
  const setMedia = useCallback(
    (media: MediaItem[]) => setData((d) => (d ? { ...d, media } : d)),
    [],
  )

  return { data, reload, setLogs, setReading, setMedia, setFacts }
}