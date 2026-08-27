/**
 * Persistent store for completed calendar events.
 * Keeps completed state safe across page refreshes (F5),
 * Google Calendar iCal syncs, and Supabase schema variations.
 */

import { db } from '@/lib/db'
import type { AgendaEvent } from '@/data/types'

const LOCAL_STORAGE_KEY = 'act.completed_event_ids'
const DOC_VAULT_COMPLETED_ID = 'doc-completed-events'

// In-memory cache for fast synchronous lookups
let cachedCompletedIds: Set<string> | null = null

function getStoredIds(): Set<string> {
  if (cachedCompletedIds !== null) return cachedCompletedIds

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        cachedCompletedIds = new Set(parsed)
        return cachedCompletedIds
      }
    }
  } catch {}

  cachedCompletedIds = new Set()
  return cachedCompletedIds
}

function saveStoredIds(ids: Set<string>): void {
  cachedCompletedIds = ids
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(Array.from(ids)))
  } catch {}

  // Sync to doc_vault asynchronously in background for cloud backup
  void syncToDocVault(ids).catch(() => {})
}

async function syncToDocVault(ids: Set<string>): Promise<void> {
  try {
    const jsonStr = JSON.stringify(Array.from(ids))
    const row = {
      id: DOC_VAULT_COMPLETED_ID,
      title: 'Completed Events Registry',
      category: 'outros',
      notes: jsonStr,
      tags: ['system', 'agenda', 'completed'],
      updatedAt: new Date().toISOString(),
    }
    await db.upsert('docVault', row)
  } catch {}
}

/**
 * Checks if a specific event is marked as completed.
 */
export function isEventCompleted(eventId: string): boolean {
  if (!eventId) return false
  return getStoredIds().has(eventId)
}

/**
 * Marks an event as completed or reopened.
 */
export async function setEventCompleted(eventId: string, completed: boolean): Promise<void> {
  if (!eventId) return
  const ids = new Set(getStoredIds())

  if (completed) {
    ids.add(eventId)
  } else {
    ids.delete(eventId)
  }

  saveStoredIds(ids)
}

/**
 * Enriches an array of AgendaEvent objects with their completed status.
 */
export function enrichEventsWithCompletion(events: AgendaEvent[]): AgendaEvent[] {
  if (!Array.isArray(events)) return []
  const ids = getStoredIds()

  return events.map((ev) => {
    const done = Boolean(ev.completed) || ids.has(ev.id)
    if (ev.completed !== done) {
      return { ...ev, completed: done }
    }
    return ev
  })
}

/**
 * Restores completed events from doc_vault in Supabase on startup.
 */
export async function restoreCompletedEventsFromDb(): Promise<void> {
  try {
    const docs = await db.get<{ id: string; notes?: string }>('docVault')
    const found = Array.isArray(docs) ? docs.find((d) => d.id === DOC_VAULT_COMPLETED_ID) : null
    if (found?.notes) {
      const parsed = JSON.parse(found.notes)
      if (Array.isArray(parsed)) {
        const current = getStoredIds()
        parsed.forEach((id: string) => current.add(id))
        saveStoredIds(current)
      }
    }
  } catch {}
}
