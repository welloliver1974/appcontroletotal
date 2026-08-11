import type { LifeLogEntry } from '@/data/types'
import { fuzzyScore, shortDate } from '@/lib/utils'

export const MOODS: Array<LifeLogEntry['mood']> = [1, 2, 3, 4, 5]

export const MOOD_LABEL: Record<LifeLogEntry['mood'], string> = {
  1: 'Fechado',
  2: 'Pra baixo',
  3: 'Neutro',
  4: 'Bom',
  5: 'Ótimo',
}

/** "saude, treino, saude" → ['saude','treino'] — trimmed, lowercase, deduped. */
export function parseTags(raw: string): string[] {
  return [...new Set(raw.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean))]
}

/** Mean mood as a 1-decimal string, '—' when there are no entries. */
export function avgMood(logs: LifeLogEntry[]): string {
  if (logs.length === 0) return '—'
  const sum = logs.reduce((acc, l) => acc + l.mood, 0)
  return (sum / logs.length).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

/** Number of distinct calendar days that have at least one entry. */
export function distinctDays(logs: LifeLogEntry[]): number {
  return new Set(logs.map((l) => l.createdAt.slice(0, 10))).size
}

/** Coerce a raw number to 0..100; anything not finite becomes 0. */
export function clampProgress(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

interface RankedHit {
  entry: LifeLogEntry
  score: number
}

/** Top-5 entries matching `q` by fuzzy score over title/body/tags. */
export function rankHits(entries: LifeLogEntry[], q: string): RankedHit[] {
  const clean = q.trim()
  if (!clean) return []
  return entries
    .map((entry) => ({
      entry,
      score: Math.max(
        fuzzyScore(clean, entry.title),
        fuzzyScore(clean, entry.body),
        fuzzyScore(clean, entry.tags.join(' ')),
      ),
    }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || b.entry.createdAt.localeCompare(a.entry.createdAt))
    .slice(0, 5)
}

/** Mock Hermes reply, synthesized from the best-matching entries (PT-BR). */
export function composeHermesAnswer(q: string, hits: RankedHit[]): string {
  if (hits.length === 0) {
    return 'Ainda não encontrei nada no seu diário sobre isso. Tenta reformular ou usar outra palavra-chave.'
  }

  const lines: string[] = []
  const n = hits.length
  lines.push(
    `Encontrei ${n} anotação${n > 1 ? 'ões' : ''} relacionada${n > 1 ? 's' : ''} a "${q}".`,
  )

  const best = hits[0].entry
  lines.push(`Mais próxima: "${best.title}" · ${shortDate(best.createdAt)} · humor ${best.mood}/5`)

  for (const { entry } of hits.slice(0, 3)) {
    const excerpt = entry.body ? `: ${entry.body.slice(0, 140)}${entry.body.length > 140 ? '…' : ''}` : ''
    lines.push(`• ${entry.title}${excerpt}`)
  }

  const moods = hits.map((h) => h.entry.mood)
  const mean = moods.reduce((a, b) => a + b, 0) / moods.length
  const label = MOOD_LABEL[Math.round(mean) as LifeLogEntry['mood']]
  lines.push(
    `O tom dessas anotações é ${label.toLowerCase()} — média ${mean.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/5.`,
  )

  const counts = new Map<string, number>()
  for (const { entry } of hits) for (const tag of entry.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  const recurring = [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([tag]) => tag)
  if (recurring.length > 0) lines.push(`Temas recorrentes: ${recurring.join(', ')}.`)

  return lines.join('\n')
}