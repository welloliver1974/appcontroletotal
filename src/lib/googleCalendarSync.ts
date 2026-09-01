import { db } from './db'
import { parseIcalToEvents } from './ical'
import { enrichEventsWithCompletion } from './eventCompletionStore'
import { formatLocalIsoDate } from './utils'
import type { AgendaEvent } from '@/data/types'

const STORAGE_KEY = 'act.googleCalendarConfig'
const DOC_VAULT_CONFIG_ID = 'sys-gcal-config'

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
  
  // Persiste de forma definitiva no banco de dados (docVault / Supabase)
  void db.upsert('docVault', {
    id: DOC_VAULT_CONFIG_ID,
    title: 'Google Calendar Config',
    category: 'outro',
    url: config.icalUrl,
    notes: JSON.stringify(config),
    tags: ['system', 'config'],
    createdAt: new Date().toISOString(),
  }).catch(() => {})
}

export async function restoreGoogleCalendarConfigFromDb(): Promise<GoogleCalendarConfig> {
  const current = getGoogleCalendarConfig()
  if (current.icalUrl) {
    // Garante que o banco também tenha a cópia
    saveGoogleCalendarConfig(current)
    return current
  }

  try {
    const docs = await db.get<{ id: string; url?: string; notes?: string }>('docVault')
    const found = Array.isArray(docs) ? docs.find((d) => d.id === DOC_VAULT_CONFIG_ID) : null
    if (found) {
      let parsedConfig: GoogleCalendarConfig | null = null
      if (found.notes) {
        try {
          parsedConfig = JSON.parse(found.notes)
        } catch {}
      }
      const restored: GoogleCalendarConfig = {
        icalUrl: (found.url || parsedConfig?.icalUrl || '').trim(),
        autoSync: parsedConfig?.autoSync ?? true,
        lastSyncAt: parsedConfig?.lastSyncAt ?? null,
        lastEventsCount: parsedConfig?.lastEventsCount ?? 0,
      }
      if (restored.icalUrl) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(restored))
        return restored
      }
    }
  } catch {}

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

    for (const eventList of results) {
      for (const ev of eventList) {
        if (!seenMap.has(ev.id)) {
          seenMap.set(ev.id, ev)
          allEvents.push(ev)
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

    // Identifica e remove eventos do Google Calendar que foram apagados no Google
    try {
      const existingEvents = await db.get<AgendaEvent>('events')
      const incomingGcalIds = new Set(allEvents.map((e) => e.id))

      const now = new Date()
      const windowStart = formatLocalIsoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1))
      const windowEnd = formatLocalIsoDate(new Date(now.getFullYear(), now.getMonth() + 6, 0))

      const orphanedGcalEvents = (Array.isArray(existingEvents) ? existingEvents : []).filter(
        (e) =>
          typeof e.id === 'string' &&
          e.id.startsWith('gcal-') &&
          e.date >= windowStart &&
          e.date <= windowEnd &&
          !incomingGcalIds.has(e.id),
      )

      for (const orphan of orphanedGcalEvents) {
        await db.remove('events', orphan.id)
      }
    } catch {}

    // Enriquece com status concluído persistido e salva em lote
    const enrichedEvents = enrichEventsWithCompletion(allEvents)
    await db.upsertMany('events', enrichedEvents)

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
