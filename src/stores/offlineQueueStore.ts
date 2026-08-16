import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { api } from '@/data/api'
import { toast } from './toastStore'

export type QueueOperation = 'create' | 'update' | 'remove'

export interface QueuedMutation {
  id: string
  collection: string
  operation: QueueOperation
  payload: unknown
  timestamp: number // epoch ms
  attempts: number
}

const MAX_ATTEMPTS = 3

interface OfflineQueueState {
  /** Ordered mutations waiting to sync once back online. */
  queue: QueuedMutation[]
  isOnline: boolean
  /** true while retryAll() is flushing the queue. */
  isSyncing: boolean
  /** Last sync attempt result message (for UI). */
  lastSyncResult: string | null
  setOnline: (v: boolean) => void
  setSyncing: (v: boolean) => void
  setLastSyncResult: (msg: string | null) => void
  enqueue: (m: Omit<QueuedMutation, 'id' | 'timestamp' | 'attempts'>) => void
  dequeue: (id: string) => void
  incrementAttempts: (id: string) => void
  clear: () => void
  retryAll: () => Promise<{ synced: number; failed: number }>
}

/**
 * Offline mutations queue (persisted).
 * When the API call fails (network error / offline), the mutation is queued
 * and replayed when connectivity returns.
 */
export const useOfflineQueueStore = create<OfflineQueueState>()(
  persist(
    (set, get) => ({
      queue: [],
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isSyncing: false,
      lastSyncResult: null,

      setOnline: (v) => set({ isOnline: v }),
      setSyncing: (v) => set({ isSyncing: v }),
      setLastSyncResult: (msg) => set({ lastSyncResult: msg }),

      enqueue: (m) => {
        const item: QueuedMutation = {
          ...m,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          attempts: 0,
        }
        set((s) => ({ queue: [...s.queue, item] }))
        toast.info(`Offline — ${m.operation} de "${m.collection}" aguardando sync`, { duration: 4000 })
      },

      dequeue: (id) => set((s) => ({ queue: s.queue.filter((q) => q.id !== id) })),

      incrementAttempts: (id) =>
        set((s) => ({
          queue: s.queue.map((q) => (q.id === id ? { ...q, attempts: q.attempts + 1 } : q)),
        })),

      clear: () => set({ queue: [] }),

      retryAll: async () => {
        const { queue, isSyncing } = get()
        // Guard: skip if offline, empty, or already syncing.
        if (!navigator.onLine || queue.length === 0 || isSyncing) {
          return { synced: 0, failed: 0 }
        }

        set({ isSyncing: true })
        let synced = 0
        let failed = 0

        for (const item of [...queue]) {
          try {
            switch (item.operation) {
              case 'create':
                await api.create(item.collection, item.payload as Record<string, unknown>)
                break
              case 'update':
                await api.update(item.collection, (item.payload as { id: string }).id, item.payload as Partial<Record<string, unknown>>)
                break
              case 'remove':
                await api.remove(item.collection, (item.payload as { id: string }).id)
                break
            }
            get().dequeue(item.id)
            synced++
          } catch {
            get().incrementAttempts(item.id)
            failed++
            // Desiste após MAX_ATTEMPTS falhas.
            const updated = get().queue.find((q) => q.id === item.id)
            if (updated && updated.attempts >= MAX_ATTEMPTS) {
              get().dequeue(item.id)
            }
          }
        }

        set({ isSyncing: false })
        const msg =
          failed === 0
            ? `${synced} alterações sincronizadas.`
            : `${synced} sincronizadas, ${failed} falharam (tentarei novamente).`
        get().setLastSyncResult(msg)
        if (failed === 0) toast.success(msg, { duration: 4000 })
        else toast.warning(msg, { duration: 6000 })

        return { synced, failed }
      },
    }),
    {
      name: 'act.offlineQueue',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ queue: s.queue, isOnline: s.isOnline }),
    },
  ),
)