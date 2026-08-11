import type { SearchDoc } from './types'
import { db } from './db'
import { fuzzyScore } from '@/lib/utils'

type RowWithId = { id: string } & Record<string, unknown>

/** Build the in-memory "neural" index: every note, fact, asset, event, email, item, trip… */
function buildIndex(): SearchDoc[] {
  const docs: SearchDoc[] = []
  const push = (module: string, kind: SearchDoc['kind'], title: string, body: string, tags: string[] = []) =>
    docs.push({ id: `${module}-${title}-${docs.length}`, module, kind, title, body, tags })

  for (const e of db.get<RowWithId>('events')) {
    push('agenda', 'evento', String(e.title), `${String(e.location ?? '')} ${String(e.category)}`, ['agenda'])
  }
  for (const m of db.get<RowWithId>('emails')) {
    push('agenda', 'email', String(m.subject), String(m.preview ?? '') + ' ' + String(m.from), m.tags as string[])
  }
  for (const l of db.get<RowWithId>('lifeLog')) {
    push('life-log', 'anotacao', String(l.title), String(l.body ?? ''), l.tags as string[])
  }
  for (const f of db.get<RowWithId>('facts')) {
    push('life-log', 'fato', String(f.content).slice(0, 60), String(f.content), f.tags as string[])
  }
  for (const r of db.get<RowWithId>('reading')) {
    push('life-log', 'leitura', String(r.title), `${String(r.author)} · ${String(r.progress)}% · ${String(r.status)}`, r.tags as string[])
  }
  for (const a of db.get<RowWithId>('assets')) {
    push('manutencao', 'ativo', `Próxima manutenção: ${String(a.name)}`, String(a.nextMaintenance), [String(a.category)])
  }
  for (const r of db.get<RowWithId>('maintenance')) {
    push('manutencao', 'ativo', String(r.title), `Custo R$ ${String(r.cost)} em ${String(r.date)}`, ['manutencao'])
  }
  for (const p of db.get<RowWithId>('pantry')) {
    push('despensa', 'item', String(p.name), `${String(p.qty)} ${String(p.unit)} · estoque baixo em ${String(p.lowThreshold)}`, [String(p.category)])
  }
  for (const t of db.get<RowWithId>('trips')) {
    push('viagens', 'viagem', String(t.destination), `${String(t.startDate)} → ${String(t.endDate)} · ${String(t.status)}`, ['viagem'])
  }
  return docs
}

/** Mock semantic search: returns docs ranked by fuzzy relevance, top `limit`. */
export function neuralSearch(query: string, limit = 8): SearchDoc[] {
  const clean = query.trim()
  if (!clean) return []
  return buildIndex()
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