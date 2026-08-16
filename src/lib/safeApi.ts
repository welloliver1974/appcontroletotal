import type { QueuedMutation } from '@/stores/offlineQueueStore'
import { useOfflineQueueStore } from '@/stores/offlineQueueStore'
import { api } from '@/data/api'
import { toast } from '@/stores/toastStore'

/**
 * On error, the mutation is queued to the offline queue and the error is
 * re-thrown so callers can handle optimistic UI/give feedback.
 */
function handleOfflineFailure<T>(
  collection: string,
  operation: QueuedMutation['operation'],
  payload: unknown,
  _err: unknown,
): T {
  useOfflineQueueStore.getState().enqueue({ collection, operation, payload })
  toast.error('Sem conexão — alteração salva para sincronizar')
  throw new Error(`Offline: ${operation} ${collection}`)
}

/**
 * Safe API wrappers — same surface as `@/data/api` but intercepts network
 * failures and pushes queued-offline mutations to the retry queue.
 */
export const safeApi = {
  async list<T>(collection: string): Promise<T[]> {
    return api.list<T>(collection)
  },
  async create<T extends { id: string }>(collection: string, row: Omit<T, 'id'>): Promise<T> {
    try {
      return await api.create<T>(collection, row)
    } catch (err) {
      return handleOfflineFailure<T>(collection, 'create', row, err)
    }
  },
  async update<T extends { id: string }>(collection: string, id: string, patch: Partial<T>): Promise<T[]> {
    try {
      return await api.update(collection, id, patch)
    } catch (err) {
      return handleOfflineFailure<T[]>(collection, 'update', { id, ...patch }, err)
    }
  },
  async remove<T>(collection: string, id: string): Promise<T[]> {
    try {
      return await api.remove(collection, id)
    } catch (err) {
      return handleOfflineFailure<T[]>(collection, 'remove', { id }, err)
    }
  },
}

/** Helper to read the queue from anywhere (used in batch — e.g. abort calls). */
export function getPendingMutationCount(): number {
  return useOfflineQueueStore.getState().queue.length
}