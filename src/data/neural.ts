import type { SearchDoc } from './types'
import { db } from '@/lib/db'
import { fuzzyScore } from '@/lib/utils'

type RowWithId = { id: string } & Record<string, unknown>

/** Build the in-memory "neural" index: every note, fact, asset, event, email, item, trip… */
async function buildIndex(): Promise<SearchDoc[]> {
  const docs: SearchDoc[] = []
  const push = (module: string, kind: SearchDoc['kind'], title: string, body: string, tags: string[] = []) =>
    docs.push({ id: `${module}-${title}-${docs.length}`, module, kind, title, body, tags })

  const [events, emails, lifeLog, facts, reading, media, assets, maintenance, pantry, trips, places] =
    await Promise.all([
      db.get<RowWithId>('events'),
      db.get<RowWithId>('emails'),
      db.get<RowWithId>('lifeLog'),
      db.get<RowWithId>('facts'),
      db.get<RowWithId>('reading'),
      db.get<RowWithId>('media'),
      db.get<RowWithId>('assets'),
      db.get<RowWithId>('maintenance'),
      db.get<RowWithId>('pantry'),
      db.get<RowWithId>('trips'),
      db.get<RowWithId>('places'),
    ])

  for (const e of events) {
    push('agenda', 'evento', String(e.title), `${String(e.location ?? '')} ${String(e.category)}`, ['agenda'])
  }
  for (const m of emails) {
    push('agenda', 'email', String(m.subject), String(m.preview ?? '') + ' ' + String(m.from), m.tags as string[])
  }
  for (const l of lifeLog) {
    push('life-log', 'anotacao', String(l.title), String(l.body ?? ''), l.tags as string[])
  }
  for (const f of facts) {
    push('life-log', 'fato', String(f.content).slice(0, 60), String(f.content), f.tags as string[])
  }
  for (const r of reading) {
    push('life-log', 'leitura', String(r.title), `${String(r.author)} · ${String(r.progress)}% · ${String(r.status)}`, r.tags as string[])
  }
  for (const m of media) {
    push('life-log', 'midia', String(m.title), `${String(m.summary)} ${String(m.sourceLabel)} · ${String(m.minutes)} min`, m.tags as string[])
  }
  for (const a of assets) {
    push('manutencao', 'ativo', `Próxima manutenção: ${String(a.name)}`, String(a.nextMaintenance), [String(a.category)])
  }
  for (const r of maintenance) {
    push('manutencao', 'ativo', String(r.title), `Custo R$ ${String(r.cost)} em ${String(r.date)}`, ['manutencao'])
  }
  for (const p of pantry) {
    push('despensa', 'item', String(p.name), `${String(p.qty)} ${String(p.unit)} · estoque baixo em ${String(p.lowThreshold)}`, [String(p.category)])
  }
  for (const t of trips) {
    const stopTitles = Array.isArray(t.stops)
      ? (t.stops as RowWithId[]).map((s) => String(s.title)).slice(0, 4)
      : []
    const extra = stopTitles.length > 0 ? ` — ${stopTitles.join(' · ')}` : ''
    push(
      'viagens',
      'viagem',
      String(t.destination),
      `${String(t.startDate)} → ${String(t.endDate)} · ${String(t.status)}${extra}`,
      ['viagem'],
    )
  }
  for (const p of places) {
    push('viagens', 'viagem', String(p.name), `${String(p.where)} · ${p.visited ? 'visitado' : 'a visitar'}`, ['viagem', 'lugar'])
  }
  return docs
}

/** Mock semantic search: returns docs ranked by fuzzy relevance, top `limit`. */
export async function neuralSearch(query: string, limit = 8): Promise<SearchDoc[]> {
  const clean = query.trim()
  if (!clean) return []
  const index = await buildIndex()
  return index
    .map((doc) => ({
      doc,
      score: Math.max(
        fuzzyScore(clean, doc.title),
        fuzzyScore(clean, doc.body),
        fuzzyScore(clean, doc.tags.join(' ')),
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ doc }) => doc)
}