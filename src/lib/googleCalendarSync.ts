import { db, supabase, getCurrentUserEmail } from './db'
import { parseIcalToEvents } from './ical'
import { enrichEventsWithCompletion } from './eventCompletionStore'
// formatLocalIsoDate removed — no longer needed after simplifying sync logic
import type { AgendaEvent } from '@/data/types'

export interface GoogleCalendarConfig {
  icalUrl: string
  autoSync: boolean
  lastSyncAt: string | null
  lastEventsCount: number
}

export function getGoogleCalendarConfig(): GoogleCalendarConfig {
  const currentEmail = getCurrentUserEmail() || 'welloliver@gmail.com'
  const key = `act.googleCalendarConfig_${currentEmail.toLowerCase().trim()}`
  try {
    const raw = localStorage.getItem(key) || (currentEmail.startsWith('welloliver') ? localStorage.getItem('act.googleCalendarConfig') : null)
    if (raw) {
      return JSON.parse(raw)
    }
  } catch {}

  return {
    icalUrl: '',
    autoSync: false,
    lastSyncAt: null,
    lastEventsCount: 0,
  }
}

export function saveGoogleCalendarConfig(config: GoogleCalendarConfig): void {
  const currentEmail = getCurrentUserEmail() || 'welloliver@gmail.com'
  const key = `act.googleCalendarConfig_${currentEmail.toLowerCase().trim()}`
  localStorage.setItem(key, JSON.stringify(config))
  
  // Persiste no Supabase por usuário (app_settings)
  if (supabase) {
    void Promise.resolve(
      supabase.from('app_settings').upsert({
        id: `gcal_config_${currentEmail.toLowerCase().trim()}`,
        data: config,
        updated_at: new Date().toISOString(),
      })
    ).catch(() => {})
  }
}

export async function restoreGoogleCalendarConfigFromDb(): Promise<GoogleCalendarConfig> {
  const currentEmail = getCurrentUserEmail() || 'welloliver@gmail.com'
  const current = getGoogleCalendarConfig()
  if (current.icalUrl) {
    saveGoogleCalendarConfig(current)
    return current
  }

  if (supabase) {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('data')
        .eq('id', `gcal_config_${currentEmail.toLowerCase().trim()}`)
        .maybeSingle()
      if (data?.data?.icalUrl) {
        const restored: GoogleCalendarConfig = {
          icalUrl: data.data.icalUrl,
          autoSync: data.data.autoSync ?? true,
          lastSyncAt: data.data.lastSyncAt ?? null,
          lastEventsCount: data.data.lastEventsCount ?? 0,
        }
        saveGoogleCalendarConfig(restored)
        return restored
      }
    } catch {}
  }

  return current
}

export interface SyncResult {
  ok: boolean
  count: number
  error?: string
  events?: AgendaEvent[]
}

/**
 * Helper to fetch and parse a single iCal URL (with proxies & cache buster)
 */
async function fetchAndParseSingleIcal(icalUrl: string): Promise<AgendaEvent[]> {
  const cacheBuster = `_cb=${Date.now()}`
  const separator = icalUrl.includes('?') ? '&' : '?'
  const freshIcalUrl = `${icalUrl}${separator}${cacheBuster}`

  // 1. Try serverless backend proxy first
  try {
    const res = await fetch('/api/calendar/sync-ical', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
      body: JSON.stringify({ icalUrl: freshIcalUrl }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.success && Array.isArray(data.events)) {
        return data.events
      }
    }
  } catch {}

  // 2. Direct client fallback with proxies
  const proxyUrls = [
    freshIcalUrl,
    `https://corsproxy.io/?url=${encodeURIComponent(freshIcalUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(freshIcalUrl)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(freshIcalUrl)}&_t=${Date.now()}`,
  ]

  let icalText = ''
  for (const url of proxyUrls) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (res.ok) {
        const text = await res.text()
        if (text && text.includes('BEGIN:VCALENDAR')) {
          icalText = text
          break
        }
      }
    } catch {}
  }

  if (icalText) {
    return parseIcalToEvents(icalText)
  }

  return []
}

/**
 * Synchronizes events from Google Calendar iCal feed(s) into Supabase/Local Database.
 * Supports multiple URLs separated by newlines or commas (e.g. personal + spouse shared calendar).
 */
export async function syncGoogleCalendar(customUrl?: string): Promise<SyncResult> {
  let config = getGoogleCalendarConfig()
  if (!config.icalUrl) {
    config = await restoreGoogleCalendarConfigFromDb()
  }
  const rawUrl = (customUrl || config.icalUrl || '').trim()

  if (!rawUrl) {
    return {
      ok: false,
      count: 0,
      error: 'URL secreta do Google Calendar (iCal) não configurada.',
    }
  }

  // Extrai todas as URLs válidas fornecidas (separadas por vírgula, ponto-e-vírgula ou quebra de linha)
  const urlList = rawUrl
    .split(/[\n,;]+/)
    .map((u) => u.trim())
    .filter((u) => u.startsWith('http'))

  if (urlList.length === 0) {
    return {
      ok: false,
      count: 0,
      error: 'Nenhuma URL de calendário válida informada.',
    }
  }

  try {
    const allEvents: AgendaEvent[] = []
    const seenMap = new Map<string, AgendaEvent>()

    // Baixa e processa cada URL em paralelo
    const results = await Promise.all(urlList.map((url) => fetchAndParseSingleIcal(url)))

    const currentEmail = getCurrentUserEmail() || 'welloliver@gmail.com'
    const isSilvia = currentEmail.toLowerCase().includes('silvinha')
    const userPrefix = isSilvia ? 'silvia' : 'well'

    for (const eventList of results) {
      for (const ev of eventList) {
        const rawId = ev.id || `ev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        const scopedId = rawId.startsWith(`gcal-${userPrefix}-`)
          ? rawId
          : (rawId.startsWith('gcal-') ? `gcal-${userPrefix}-${rawId.slice(5)}` : `gcal-${userPrefix}-${rawId}`)

        const scopedEvent: AgendaEvent = {
          ...ev,
          id: scopedId,
          userEmail: currentEmail,
          authorEmail: currentEmail,
        }

        if (!seenMap.has(scopedEvent.id)) {
          seenMap.set(scopedEvent.id, scopedEvent)
          allEvents.push(scopedEvent)
        }
      }
    }

    if (allEvents.length === 0 && urlList.length > 0) {
      return {
        ok: false,
        count: 0,
        error: 'Não foi possível baixar os eventos. Verifique se os endereços iCal secretos estão corretos.',
      }
    }

    // Enriquece com status concluído persistido e salva em batches para não travar o celular
    const enrichedEvents = enrichEventsWithCompletion(allEvents)
    const BATCH_SIZE = 100
    for (let i = 0; i < enrichedEvents.length; i += BATCH_SIZE) {
      const batch = enrichedEvents.slice(i, i + BATCH_SIZE)
      await db.upsertMany('events', batch)
    }

    const now = new Date().toISOString()
    saveGoogleCalendarConfig({
      ...config,
      icalUrl: rawUrl,
      lastSyncAt: now,
      lastEventsCount: enrichedEvents.length,
    })

    return {
      ok: true,
      count: enrichedEvents.length,
      events: enrichedEvents,
    }
  } catch (err) {
    return {
      ok: false,
      count: 0,
      error: err instanceof Error ? err.message : 'Erro ao processar sincronização.',
    }
  }
}
