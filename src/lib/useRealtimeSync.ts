import { useEffect, useRef } from 'react'
import { supabase, tableName } from './db'

/**
 * Hook to subscribe to Supabase Realtime changes for one or more collections.
 * Automatically unsubscribes on unmount and throttles callbacks.
 */
export function useRealtimeSync(collections: string[], onSync: () => void | Promise<void>): void {
  const onSyncRef = useRef(onSync)
  onSyncRef.current = onSync
  const timerRef = useRef<number | undefined>(undefined)
  const collectionsKey = collections.join(',')

  useEffect(() => {
    const client = supabase
    if (!client || collections.length === 0) return

    const tables = collections.map((col) => tableName(col))
    const channelName = `realtime-sync-${tables.join('-')}-${Math.random().toString(36).slice(2, 7)}`

    const triggerSync = () => {
      window.clearTimeout(timerRef.current)
      // Debounce slightly to coalesce rapid bursts
      timerRef.current = window.setTimeout(() => {
        void onSyncRef.current()
      }, 300)
    }

    const channel = client.channel(channelName)

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        () => {
          triggerSync()
        },
      )
    }

    channel.subscribe()

    return () => {
      window.clearTimeout(timerRef.current)
      void client.removeChannel(channel)
    }
  }, [collectionsKey, collections])
}
