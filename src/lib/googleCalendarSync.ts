import { db } from './db'
import { parseIcalToEvents } from './ical'
import type { AgendaEvent } from '@/data/types'

const STORAGE_KEY = 'act.googleCalendarConfig'

export interface GoogleCalendarConfig {
  icalUrl: string
  autoSync: boolean
  lastSyncAt: string | null
  lastEventsCount: number
}

export function getGoogleCalendarConfig(): GoogleCalendarConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {}

  return {
    icalUrl: '',
    autoSync: true,
    lastSyncAt: null,
    lastEventsCount: 0,
  }
}

export function saveGoogleCalendarConfig(config: GoogleCalendarConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export interface SyncResult {
  ok: boolean
  count: number
  error?: string
  events?: AgendaEvent[]
}

/**
 * Synchronizes events from Google Calendar iCal feed into Supabase/Local Database.
 */
export async function syncGoogleCalendar(customUrl?: string): Promise<SyncResult> {
  const config = getGoogleCalendarConfig()
  const icalUrl = (customUrl || config.icalUrl || '').trim()

  if (!icalUrl) {
    return {
      ok: false,
      count: 0,
      error: 'URL secreta do Google Calendar (iCal) não configurada.',
    }
  }

  // 1. Try serverless backend proxy first (avoids CORS)
  try {
    const res = await fetch('/api/calendar/sync-ical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icalUrl }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.events)) {
        // Also save to local db adapter in case of offline/local fallback
        for (const ev of data.events) {
          await db.update('events', ev.id, ev).catch(async () => {
            await db.insert('events', ev).catch(() => {})
          })
        }

        const now = new Date().toISOString()
        saveGoogleCalendarConfig({
          ...config,
          icalUrl,
          lastSyncAt: now,
          lastEventsCount: data.events.length,
        })

        return {
          ok: true,
          count: data.events.length,
          events: data.events,
        }
      }
    }
  } catch {
    // Continue to direct client-side fallback if running in pure static/local mode
  }

  // 2. Direct client fallback (or through a CORS proxy if needed)
  try {
    const res = await fetch(icalUrl).catch(() => {
      // If direct fetch blocked by CORS, try public proxy fallback
      return fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(icalUrl)}`)
    })

    if (!res.ok) {
      return {
        ok: false,
        count: 0,
        error: `Não foi possível baixar o calendário (HTTP ${res.status}). Verifique o link iCal.`,
      }
    }

    const icalText = await res.text()
    const parsedEvents = parseIcalToEvents(icalText)

    for (const ev of parsedEvents) {
      await db.update('events', ev.id, ev).catch(async () => {
        await db.insert('events', ev).catch(() => {})
      })
    }

    const now = new Date().toISOString()
    saveGoogleCalendarConfig({
      ...config,
      icalUrl,
      lastSyncAt: now,
      lastEventsCount: parsedEvents.length,
    })

    return {
      ok: true,
      count: parsedEvents.length,
      events: parsedEvents,
    }
  } catch (err) {
    return {
      ok: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Erro ao processar sincronização.',
    }
  }
}
