import type { AgendaEvent } from '@/data/types'

/**
 * Categorize event based on keywords in title and location.
 */
function inferCategory(title: string, location?: string): AgendaEvent['category'] {
  const text = `${title} ${location || ''}`.toLowerCase()
  if (/(meet|reuni[aã]o|call|sync|alinhamento|1:1|1on1|entrevista|apresenta[cç][aã]o|zoom|teams|google meet)/.test(text)) {
    return 'reuniao'
  }
  if (/(voo|hotel|viagem|aeroporto|embarque|airbnb|trip|flight|check-in)/.test(text)) {
    return 'viagem'
  }
  if (/(treino|academia|h[aá]bito|estudo|rem[eé]dio|medita[cç][aã]o|corrida|foco|leitura)/.test(text)) {
    return 'habit'
  }
  return 'pessoal'
}

/**
 * Parse iCal date/time strings (e.g. 20260818T143000Z, 20260818, TZID=...:20260818T113000)
 */
function parseIcalDateTime(rawStr: string): { date: string; time: string } | null {
  if (!rawStr) return null

  // Extract pure date string if parameters like TZID exist (e.g. TZID=America/Sao_Paulo:20260818T143000)
  const val = rawStr.includes(':') ? rawStr.split(':').pop() || rawStr : rawStr
  const clean = val.trim()

  // Date only: 20260818
  if (/^\d{8}$/.test(clean)) {
    const y = clean.slice(0, 4)
    const m = clean.slice(4, 6)
    const d = clean.slice(6, 8)
    return { date: `${y}-${m}-${d}`, time: '08:00' }
  }

  // Date + Time: 20260818T143000 or 20260818T143000Z
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/)
  if (match) {
    const [, y, m, d, hh, mm] = match
    // If ending with Z (UTC), convert to local time
    if (clean.endsWith('Z')) {
      const utcDate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm)))
      const localY = utcDate.getFullYear()
      const localM = String(utcDate.getMonth() + 1).padStart(2, '0')
      const localD = String(utcDate.getDate()).padStart(2, '0')
      const localH = String(utcDate.getHours()).padStart(2, '0')
      const localMin = String(utcDate.getMinutes()).padStart(2, '0')
      return { date: `${localY}-${localM}-${localD}`, time: `${localH}:${localMin}` }
    }
    return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` }
  }

  return null
}

/**
 * Unfolds folded lines in iCalendar (RFC 5545).
 */
function unfoldIcal(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  const unfolded: string[] = []

  for (const line of lines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (unfolded.length > 0) {
        unfolded[unfolded.length - 1] += line.slice(1)
      }
    } else {
      unfolded.push(line)
    }
  }

  return unfolded
}

/**
 * Parses raw iCalendar text into AgendaEvent array.
 */
export function parseIcalToEvents(icalText: string): AgendaEvent[] {
  const lines = unfoldIcal(icalText)
  const events: AgendaEvent[] = []
  let inEvent = false
  let current: Record<string, string> = {}

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true
      current = {}
      continue
    }

    if (trimmed === 'END:VEVENT') {
      inEvent = false
      if (current.STATUS === 'CANCELLED') continue
      if (!current.SUMMARY && !current.DESCRIPTION) continue

      const start = parseIcalDateTime(current.DTSTART || '')
      if (!start) continue

      const end = parseIcalDateTime(current.DTEND || '')
      const uid = current.UID || `gcal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const id = uid.startsWith('gcal-') ? uid : `gcal-${uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48)}`
      const title = (current.SUMMARY || current.DESCRIPTION || 'Compromisso').replace(/\\([,;\\])/g, '$1')
      const location = current.LOCATION ? current.LOCATION.replace(/\\([,;\\])/g, '$1') : undefined

      events.push({
        id,
        title,
        date: start.date,
        timeStart: start.time,
        timeEnd: end ? end.time : undefined,
        category: inferCategory(title, location),
        location,
      })
      continue
    }

    if (inEvent) {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        const fullKey = line.slice(0, colonIdx)
        const val = line.slice(colonIdx + 1)
        const keyName = fullKey.split(';')[0].trim().toUpperCase()
        current[keyName] = val
        if (fullKey.includes(';')) {
          current[`${keyName}_RAW`] = line
        }
      }
    }
  }

  // Sort chronologically by date and start time
  return events.sort((a, b) => `${a.date} ${a.timeStart}`.localeCompare(`${b.date} ${b.timeStart}`))
}
