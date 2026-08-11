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

/** Friendly relative label for a date: "hoje", "amanhã", "em 5 dias", "há 3 dias". */
export function relativeDayLabel(input: string | Date, now = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOfDay - startOfToday) / DAY)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanhã'
  if (diff === -1) return 'ontem'
  if (diff > 0) return `em ${diff} dias`
  return `há ${Math.abs(diff)} dias`
}

/** "10 ago" style short date for PT-BR. */
export function shortDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
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

/** ISO date string for `offsetDays` from today (YYYY-MM-DD). */
export function isoOffset(offsetDays: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}