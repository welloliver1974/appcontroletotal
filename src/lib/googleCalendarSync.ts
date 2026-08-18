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

  // 1. Try serverless backend proxy first (bypasses CORS and upserts directly to Supabase)
  try {
    const res = await fetch('/api/calendar/sync-ical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icalUrl }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.events)) {
        // Save batch to database adapter
        await db.upsertMany('events', data.events)

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
    // Fallback to client proxy if serverless endpoint is unreachable in dev
  }

  // 2. Direct client fallback (using proxy to bypass browser CORS)
  try {
    const proxyUrls = [
      icalUrl,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(icalUrl)}`,
      `https://corsproxy.io/?url=${encodeURIComponent(icalUrl)}`,
    ]

    let icalText = ''
    for (const url of proxyUrls) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          const text = await res.text()
          if (text && text.includes('BEGIN:VCALENDAR')) {
            icalText = text
            break
          }
        }
      } catch {}
    }

    if (!icalText) {
      return {
        ok: false,
        count: 0,
        error: 'Não foi possível baixar o calendário do Google. Verifique se o endereço iCal secreto está correto.',
      }
    }

    const parsedEvents = parseIcalToEvents(icalText)
    await db.upsertMany('events', parsedEvents)

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
