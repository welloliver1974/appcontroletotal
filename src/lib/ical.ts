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
function parseIcalDateTime(rawStr: string): { date: string; time: string; fullDate: Date } | null {
  if (!rawStr) return null

  // Extract pure date string if parameters like TZID exist (e.g. TZID=America/Sao_Paulo:20260818T143000)
  const val = rawStr.includes(':') ? rawStr.split(':').pop() || rawStr : rawStr
  const clean = val.trim()

  // Date only: 20260818
  if (/^\d{8}$/.test(clean)) {
    const y = Number(clean.slice(0, 4))
    const m = Number(clean.slice(4, 6))
    const d = Number(clean.slice(6, 8))
    const dateStr = `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
    return { date: dateStr, time: '08:00', fullDate: new Date(y, m - 1, d, 8, 0) }
  }

  // Date + Time: 20260818T143000 or 20260818T143000Z
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/)
  if (match) {
    const [, y, m, d, hh, mm] = match
    // If ending with Z (UTC), convert to local time (America/Sao_Paulo - Horário de Brasília)
    if (clean.endsWith('Z')) {
      const utcDate = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm)))
      const brFormatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
      const parts = brFormatter.formatToParts(utcDate)
      const getP = (type: string) => parts.find((p) => p.type === type)?.value || '00'
      return {
        date: `${getP('year')}-${getP('month')}-${getP('day')}`,
        time: `${getP('hour')}:${getP('minute')}`,
        fullDate: utcDate,
      }
    }
    return {
      date: `${y}-${m}-${d}`,
      time: `${hh}:${mm}`,
      fullDate: new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm)),
    }
  }

  return null
}

/**
 * Format Date to YYYY-MM-DD
 */
function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
 * Parses raw iCalendar text into AgendaEvent array and expands recurring events.
 */
export function parseIcalToEvents(icalText: string): AgendaEvent[] {
  const lines = unfoldIcal(icalText)
  const rawEvents: Array<{
    uid: string
    title: string
    location?: string
    start: { date: string; time: string; fullDate: Date }
    end?: { date: string; time: string; fullDate: Date }
    rrule?: string
  }> = []

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

      const end = current.DTEND ? parseIcalDateTime(current.DTEND) || undefined : undefined
      const uid = current.UID || `gcal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const title = (current.SUMMARY || current.DESCRIPTION || 'Compromisso').replace(/\\([,;\\])/g, '$1')
      const location = current.LOCATION ? current.LOCATION.replace(/\\([,;\\])/g, '$1') : undefined
      const rrule = current.RRULE

      rawEvents.push({
        uid,
        title,
        location,
        start,
        end,
        rrule,
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
      }
    }
  }

  // Expansion window: 60 days in past to 180 days in future
  const now = new Date()
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 6, 0)

  const events: AgendaEvent[] = []
  const seenIds = new Set<string>()

  for (const item of rawEvents) {
    const category = inferCategory(item.title, item.location)
    const sanitizedUid = item.uid.replace(/[^a-zA-Z0-9_-]/g, '_')
    const baseId = item.uid.startsWith('gcal-')
      ? item.uid
      : `gcal-${sanitizedUid}-${item.start.date}-${item.start.time.replace(':', '')}`

    // Single non-recurring event
    if (!item.rrule) {
      const id = baseId
      if (!seenIds.has(id)) {
        seenIds.add(id)
        events.push({
          id,
          title: item.title,
          date: item.start.date,
          timeStart: item.start.time,
          timeEnd: item.end ? item.end.time : undefined,
          category,
          location: item.location,
        })
      }
      continue
    }

    // Recurring event (RRULE)
    const rruleUpper = item.rrule.toUpperCase()
    const isDaily = rruleUpper.includes('FREQ=DAILY')
    const isWeekly = rruleUpper.includes('FREQ=WEEKLY')
    const isMonthly = rruleUpper.includes('FREQ=MONTHLY')
    const isYearly = rruleUpper.includes('FREQ=YEARLY')

    // Parse UNTIL if exists
    let untilDate: Date | null = null
    const untilMatch = rruleUpper.match(/UNTIL=([0-9T]+Z?)/)
    if (untilMatch) {
      const parsedUntil = parseIcalDateTime(untilMatch[1])
      if (parsedUntil) untilDate = parsedUntil.fullDate
    }

    // Generate occurrences
    const curr = new Date(item.start.fullDate)
    let count = 0
    const maxCount = 200

    while (curr <= windowEnd && count < maxCount) {
      if (untilDate && curr > untilDate) break

      if (curr >= windowStart) {
        const occDateStr = toIsoDate(curr)
        const occId = `${baseId}-${occDateStr}`
        if (!seenIds.has(occId)) {
          seenIds.add(occId)
          events.push({
            id: occId,
            title: item.title,
            date: occDateStr,
            timeStart: item.start.time,
            timeEnd: item.end ? item.end.time : undefined,
            category,
            location: item.location,
          })
        }
      }

      // Step forward
      if (isDaily) {
        curr.setDate(curr.getDate() + 1)
      } else if (isWeekly) {
        curr.setDate(curr.getDate() + 7)
      } else if (isMonthly) {
        curr.setMonth(curr.getMonth() + 1)
      } else if (isYearly) {
        curr.setFullYear(curr.getFullYear() + 1)
      } else {
        break
      }
      count++
    }
  }

  // Sort chronologically
  return events.sort((a, b) => `${a.date} ${a.timeStart}`.localeCompare(`${b.date} ${b.timeStart}`))
}
