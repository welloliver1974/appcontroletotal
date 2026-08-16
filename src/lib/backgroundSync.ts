import { useOfflineQueueStore } from '@/stores/offlineQueueStore'

/**
 * Simulated background sync.
 *
 * Real Background Sync API isn't reliably available everywhere, so we bridge
 * events via BroadcastChannel + the `online`/`offline` listeners. Whenever a
 * tab goes online it requests a sync, and any open tab replays the queue.
 */

/** Names the BroadcastChannel used to coordinate sync requests across tabs. */
export const SYNC_CHANNEL = 'hermes-sync'

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  return new BroadcastChannel(SYNC_CHANNEL)
}

/**
 * Register the sync bridge:
 * 1. listens for `sync-request` messages from other tabs and flushes the queue
 * 2. flushes the queue whenever the network comes back online (this tab)
 * 3. keeps the store's `isOnline` flag in sync
 */
export function initBackgroundSync(): void {
  // Track connectivity in the offline queue store.
  const onlineHandler = () => {
    useOfflineQueueStore.getState().setOnline(true)
    useOfflineQueueStore.getState().setSyncing(true)
    void useOfflineQueueStore.getState().retryAll().finally(() => {
      useOfflineQueueStore.getState().setSyncing(false)
    })
  }
  const offlineHandler = () => useOfflineQueueStore.getState().setOnline(false)

  window.addEventListener('online', onlineHandler)
  window.addEventListener('offline', offlineHandler)

  // BroadcastChannel bridge — a request from another tab triggers a flush here too.
  const channel = getChannel()
  if (channel) {
    channel.onmessage = (event) => {
      if (event.data?.type === 'sync-request') {
        void useOfflineQueueStore.getState().retryAll()
      }
    }
  }

  // Initial flush if the queue has leftovers from a previous session.
  if (navigator.onLine) {
    void useOfflineQueueStore.getState().retryAll()
  }
}

/** Ask every OTHER open tab to flush the offline queue. */
export function requestSync(): void {
  void useOfflineQueueStore.getState().retryAll()
  const channel = getChannel()
  if (channel) {
    channel.postMessage({ type: 'sync-request' })
    // closing our side immediately after posting can drop the message on some browsers
    setTimeout(() => channel.close(), 500)
  }
}

/** Total pending mutations across sessions (for UI badges). */
export function pendingSyncCount(): number {
  return useOfflineQueueStore.getState().queue.length
}