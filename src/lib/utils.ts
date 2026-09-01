/** Join truthy class names into a single className string. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Fuzzy relevance score 0..1 for query against target. 1 = substring/token hit. */
export function fuzzyScore(query: string, target: string): number {
  const q = query.toLowerCase().trim()
  const t = target.toLowerCase()
  if (!q) return 0
  if (t.includes(q)) return 1
  const qTokens = q.split(/\s+/).filter(Boolean)
  const tTokens = t.split(/\s+/).filter(Boolean)
  let hits = 0
  for (const qw of qTokens) {
    if (tTokens.some((tok) => tok.startsWith(qw))) hits++
  }
  return hits / qTokens.length
}

const DAY = 86_400_000

const MONTHS_PT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']

/** Checks if a string is a valid ISO date (YYYY-MM-DD) in a sensible modern range. */
export function isValidIsoDate(input?: string | null): boolean {
  if (!input || typeof input !== 'string') return false
  const trimmed = input.trim()
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return false
  const year = Number(trimmed.slice(0, 4))
  return year >= 2000 && year <= 2100
}

/** Friendly relative label for a date: "hoje", "amanhã", "em 5 dias", "há 3 dias". */
export function relativeDayLabel(input?: string | Date | null, now = new Date()): string {
  if (!input) return 'sem data'

  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!isValidIsoDate(trimmed)) return 'sem data'
    const [y, m, d] = trimmed.slice(0, 10).split('-').map(Number)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const target = new Date(y, m - 1, d).getTime()
    const diff = Math.round((target - today) / DAY)
    if (diff === 0) return 'hoje'
    if (diff === 1) return 'amanhã'
    if (diff === -1) return 'ontem'
    if (diff > 0) return `em ${diff} dias`
    return `há ${Math.abs(diff)} dias`
  }

  const d = input
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return 'sem data'
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOfDay - startOfToday) / DAY)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanhã'
  if (diff === -1) return 'ontem'
  if (diff > 0) return `em ${diff} dias`
  return `há ${Math.abs(diff)} dias`
}

/** Returns clean { day: '21', month: 'AGO' } for date badges without "de". */
export function formatDayAndMonth(input: string | Date): { day: string; month: string } {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const parts = input.slice(0, 10).split('-')
    const mIdx = Number(parts[1]) - 1
    return {
      day: parts[2],
      month: MONTHS_PT[mIdx] || 'MÊS',
    }
  }
  const d = typeof input === 'string' ? new Date(input) : input
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: MONTHS_PT[d.getMonth()] || '',
  }
}

/** "10 ago" style short date for PT-BR. */
export function shortDate(input: string | Date): string {
  const { day, month } = formatDayAndMonth(input)
  return `${day} ${month.toLowerCase()}`
}

export function shortDateTime(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Local ISO date string (YYYY-MM-DD) for a given Date object in local timezone. */
export function formatLocalIsoDate(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** ISO date string for `offsetDays` from reference date in local timezone (YYYY-MM-DD). */
export function isoOffset(offsetDays: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays)
  return formatLocalIsoDate(d)
}

/** Local date key (YYYY-MM-DD) for the start of today in local timezone. */
export function todayStr(now = new Date()): string {
  return formatLocalIsoDate(now)
}

/** Whole days from today until `dateStr` (negative = in the past). */
export function daysUntil(dateStr?: string | null): number {
  if (!isValidIsoDate(dateStr)) return 999
  const [y, m, d] = (dateStr as string).split('-').map((p) => Number(p))
  const [nY, nM, nD] = todayStr().split('-').map((p) => Number(p))
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(nY, nM - 1, nD)) / DAY)
}