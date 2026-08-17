import { createClient, PostgrestError } from '@supabase/supabase-js'
import { db as localStorageDb } from '@/data/db'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

type Row = { id: string } & Record<string, unknown>

const supabaseUrl = SUPABASE_URL
const supabaseKey = SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'public' },
      auth: { autoRefreshToken: true, persistSession: true },
    })
  : null

export const useSupabase = !!supabase

/**
 * Camada de mapeamento camelCase (frontend) <-> snake_case (colunas do Supabase).
 * O app foi construído com as collections em camelCase (localStorage mock),
 * mas as migrações do Supabase criaram as colunas em snake_case. Este mapa
 * alinha o adapter para que o app leia/grave no banco real.
 */

/** Nome da collection (camelCase que o app usa) -> nome real da tabela no Supabase. */
const TABLE_OVERRIDES: Record<string, string> = {
  lifeLog: 'life_log',
  // demais collections já têm o mesmo nome no banco
}

/** Mapa de colunas: camelCase (app) -> snake_case (banco). */
const COLUMN_MAPS: Record<string, Record<string, string>> = {
  default: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  lifeLog: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  media: {
    sourceLabel: 'source_label',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  facts: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  reading: {
    updatedAt: 'updated_at',
    createdAt: 'created_at',
  },
  events: {
    timeStart: 'time_start',
    timeEnd: 'time_end',
    location: 'location',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  emails: {
    fromName: 'from_name',
    sentAt: 'sent_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  assets: {
    lifePct: 'life_pct',
    nextMaintenance: 'next_maintenance',
    lastMaintenance: 'last_maintenance',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  maintenance: {
    assetId: 'asset_id',
    odometerKm: 'odometer_km',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  pantry: {
    lowThreshold: 'low_threshold',
    expiresAt: 'expires_at',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  trips: {
    startDate: 'start_date',
    endDate: 'end_date',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  places: {
    where: 'where_text',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}

/** Converte nome da collection para o nome real da tabela. */
function tableName(collection: string): string {
  return TABLE_OVERRIDES[collection] || collection
}

/** Retorna o mapa de colunas para uma collection (fallback no default). */
function columnMap(collection: string): Record<string, string> {
  return COLUMN_MAPS[collection] || COLUMN_MAPS.default
}

/** Converte um objeto de snake_case (do banco) para camelCase (app). */
function toAppShape<T>(raw: Record<string, unknown>, collection: string): T {
  const map = invertMap(columnMap(collection))
  const app: Record<string, unknown> = { ...raw }
  for (const [snake, camel] of Object.entries(map)) {
    if (snake in app) {
      app[camel] = app[snake]
      delete app[snake]
    }
  }
  return app as T
}

/** Converte um objeto de camelCase (app) para snake_case (banco). */
function toDbShape(obj: Record<string, unknown>, collection: string): Record<string, unknown> {
  const map = columnMap(collection)
  const db: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const mapped = map[key] || key
    db[mapped] = value
  }
  return db as Record<string, unknown>
}

/** Inverte o mapa (snake -> camel). */
function invertMap(map: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [camel, snake] of Object.entries(map)) {
    out[snake] = camel
  }
  return out
}

function mapSupabaseError(err: unknown): Error {
  const postgrestErr = err as PostgrestError | undefined
  if (postgrestErr?.message) return new Error(postgrestErr.message)
  const netErr = err as { message?: string } | undefined
  if (netErr?.message) return new Error(netErr.message)
  return new Error('Database unavailable')
}

export const db = {
  /** Lista todas as linhas de uma coleção. */
  async get<T = Row>(collection: string): Promise<T[]> {
    if (!supabase) return localStorageDb.get<T>(collection)
    const table = tableName(collection)
    try {
      const { data, error } = await supabase.from(table).select('*')
      if (error) {
        console.warn(`[db] Supabase error on get(${table}) — falling back to mock:`, error.message)
        return localStorageDb.get<T>(collection)
      }
      return ((data ?? []) as Record<string, unknown>[]).map((row) => toAppShape<T>(row, collection))
    } catch (err) {
      console.warn(`[db] Supabase threw on get(${table}) — falling back to mock:`, mapSupabaseError(err).message)
      return localStorageDb.get<T>(collection)
    }
  },

  /** Substitui todas as linhas de uma coleção. */
  async set<T = Row>(collection: string, rows: T[]): Promise<T[]> {
    if (!supabase) {
      localStorageDb.set<T>(collection, rows)
      return rows
    }
    const table = tableName(collection)
    try {
      for (const row of rows) {
        const { error } = await supabase.from(table).upsert(toDbShape(row as Record<string, unknown>, collection))
        if (error) throw error
      }
      return rows
    } catch (err) {
      console.warn(`[db] Supabase set failed for ${table} — falling back to mock:`, mapSupabaseError(err).message)
      localStorageDb.set<T>(collection, rows)
      return rows
    }
  },

  /** Insere uma nova linha e retorna todas as linhas atualizadas. */
  async insert<T = Row>(collection: string, row: T): Promise<T[]> {
    if (!supabase) {
      const r = row as T & { id: string }
      localStorageDb.insert<T & { id: string }>(collection, r)
      return localStorageDb.get<T>(collection)
    }
    const table = tableName(collection)
    try {
      const { error } = await supabase.from(table).insert(toDbShape(row as Record<string, unknown>, collection))
      if (error) throw error
      return await this.get<T>(collection)
    } catch (err) {
      console.warn(`[db] Supabase insert failed for ${table} — falling back to mock:`, mapSupabaseError(err).message)
      const r = row as T & { id: string }
      localStorageDb.insert<T & { id: string }>(collection, r)
      return localStorageDb.get<T>(collection)
    }
  },

  /** Atualiza uma linha pelo `id`. */
  async update<T = Row>(collection: string, id: string, patch: Partial<T>): Promise<T[]> {
    if (!supabase) {
      localStorageDb.update<T & { id: string }>(collection, id, patch as Partial<T & { id: string }>)
      return localStorageDb.get<T>(collection)
    }
    const table = tableName(collection)
    try {
      const { error } = await supabase.from(table).update(toDbShape(patch as Record<string, unknown>, collection)).eq('id', id)
      if (error) throw error
      return await this.get<T>(collection)
    } catch (err) {
      console.warn(`[db] Supabase update failed for ${table}:${id} — falling back to mock:`, mapSupabaseError(err).message)
      localStorageDb.update<T & { id: string }>(collection, id, patch as Partial<T & { id: string }>)
      return localStorageDb.get<T>(collection)
    }
  },

  /** Remove uma linha pelo `id`. */
  async remove<T = Row>(collection: string, id: string): Promise<T[]> {
    if (!supabase) {
      localStorageDb.remove<T & { id: string }>(collection, id)
      return localStorageDb.get<T>(collection)
    }
    const table = tableName(collection)
    try {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
      return await this.get<T>(collection)
    } catch (err) {
      console.warn(`[db] Supabase remove failed for ${table}:${id} — falling back to mock:`, mapSupabaseError(err).message)
      localStorageDb.remove<T & { id: string }>(collection, id)
      return localStorageDb.get<T>(collection)
    }
  },

  /** Seed inicial — semeia localStorage mock (Supabase já vem com dados via SQL/schema). */
  init(): void {
    localStorageDb.init()
  },

  /** Reseta localStorage mock. */
  reset(): void {
    localStorageDb.reset()
  },
}

export default db