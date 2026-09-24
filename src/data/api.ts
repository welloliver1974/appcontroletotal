import { db, registerDbMutationListener } from '@/lib/db'

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

interface CacheEntry {
  data: unknown[]
  timestamp: number
}

// Cache em memória de curta duração (30 segundos) para navegação instantânea entre abas
const memoryCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 30_000

/**
 * Invalida o cache em memória de uma coleção específica ou de todas.
 * Chamado automaticamente em mutações (create/update/delete) e sincronizações.
 */
export function invalidateApiCache(collection?: string): void {
  if (collection) {
    memoryCache.delete(collection)
  } else {
    memoryCache.clear()
  }
}

// Conecta o listener para que qualquer alteração direta no db (ex: sincronização do Google Calendar) limpe o cache na hora
registerDbMutationListener((collection) => {
  invalidateApiCache(collection)
})

/** REST-style API client — delega para o db adapter com cache transparente de alta velocidade. */
export const api = {
  /**
   * Lista itens de uma coleção. Retorna instantaneamente do cache em memória se consultado recentemente,
   * garantindo transição sem engasgos entre abas.
   */
  async list<T>(collection: string, options?: { force?: boolean }): Promise<T[]> {
    const cached = memoryCache.get(collection)
    const now = Date.now()

    if (!options?.force && cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T[]
    }

    const fresh = await db.get<T>(collection)
    memoryCache.set(collection, {
      data: fresh,
      timestamp: now,
    })
    return fresh
  },

  async create<T extends { id: string }>(collection: string, row: Omit<T, 'id'>): Promise<T> {
    const full = { ...row, id: uid() } as T
    await db.insert<T>(collection, full)
    invalidateApiCache(collection)
    return full
  },

  async update<T extends { id: string }>(collection: string, id: string, patch: Partial<T>): Promise<T[]> {
    const res = await db.update<T & { id: string }>(collection, id, patch as Partial<T & { id: string }>)
    invalidateApiCache(collection)
    return res
  },

  async remove<T>(collection: string, id: string): Promise<T[]> {
    const res = await db.remove<T>(collection, id)
    invalidateApiCache(collection)
    return res
  },

  invalidate(collection?: string): void {
    invalidateApiCache(collection)
  },
}