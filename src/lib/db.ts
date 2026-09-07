import { createClient, PostgrestError } from '@supabase/supabase-js'
import { db as localStorageDb } from '@/data/db'
import { enrichEventsWithCompletion, setEventCompleted } from './eventCompletionStore'
import type { AgendaEvent } from '@/data/types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

type Row = { id: string } & Record<string, unknown>
const secretKeyError = SUPABASE_ANON_KEY?.startsWith('sb_secret_')
  ? new Error('VITE_SUPABASE_ANON_KEY está usando uma chave secreta. Use a anon/public key do Supabase no frontend.')
  : null

const supabaseUrl = SUPABASE_URL
const supabaseKey = SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseKey && !secretKeyError
  ? createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'public' },
      auth: { autoRefreshToken: true, persistSession: true },
    })
  : null

export const useSupabase = !!supabase

const TABLES: Record<string, string> = {
  lifeLog: 'life_log',
  maintMonths: 'maint_months',
  spendingEntries: 'spending_entries',
  fixedBills: 'fixed_bills',
  docVault: 'doc_vault',
}

export function tableName(collection: string): string {
  return TABLES[collection] ?? collection
}

/** Shared collections: Household, Expenses, Maintenance, Pantry, Trips, Agenda & Google Calendar Events (visible to everyone in the family) */
export const SHARED_COLLECTIONS = new Set([
  'spending',
  'spendingEntries',
  'spending_entries',
  'fixedBills',
  'fixed_bills',
  'maintenance',
  'maintMonths',
  'maint_months',
  'assets',
  'pantry',
  'trips',
  'trip_stops',
  'places',
  'docVault',
  'doc_vault',
  'events',
])

/** Personal collections: Life-Log, Reading, Media, Facts (isolated per user) */
export const PERSONAL_COLLECTIONS = new Set([
  'lifeLog',
  'life_log',
  'reading',
  'media',
  'facts',
])

export function isPersonalCollection(collection: string): boolean {
  return PERSONAL_COLLECTIONS.has(collection)
}

/** Primary account list (owner of all historical/legacy unassigned data) */
export const PRIMARY_ACCOUNTS = new Set([
  'welloliver@gmail.com',
  'welloliver1974@gmail.com',
  'welloliver',
])

export function isPrimaryUser(email: string | null | undefined): boolean {
  if (!email) return false
  const normalized = email.toLowerCase().trim()
  return PRIMARY_ACCOUNTS.has(normalized) || normalized.startsWith('welloliver')
}

/** Get the currently logged-in user email */
export function getCurrentUserEmail(): string | null {
  try {
    const raw = localStorage.getItem('act.auth.v2')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed?.state?.userEmail || null
    }
  } catch {}
  return null
}

/** Filters personal collections so each user only sees their own notes/diaries/events, while preserving 100% legacy data for welloliver@gmail.com */
export function filterRowsForUser<T>(collection: string, rows: T[]): T[] {
  if (!isPersonalCollection(collection)) return rows
  const currentEmail = getCurrentUserEmail()
  if (!currentEmail) return rows

  const isPrimary = isPrimaryUser(currentEmail)

  return rows.filter((r: unknown) => {
    const row = r as Record<string, unknown>
    const rowEmail = (row.userEmail || row.user_email || row.authorEmail || row.author_email) as string | undefined

    if (rowEmail) {
      return rowEmail.toLowerCase().trim() === currentEmail.toLowerCase().trim()
    }

    // Row has no user assigned (legacy data created prior to multi-user separation) -> Preserved ONLY for welloliver@gmail.com
    return isPrimary
  })
}

/** Enriches newly created personal records with the author user email */
export function enrichRowWithUser<T>(collection: string, row: T): T {
  if (!isPersonalCollection(collection)) return row
  const currentEmail = getCurrentUserEmail()
  if (!currentEmail) return row

  const r = row as Record<string, unknown>
  return {
    ...r,
    userEmail: r.userEmail || currentEmail,
    user_email: r.user_email || currentEmail,
  } as T
}

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function toCamel(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function toSupabaseRow(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toSupabaseRow)
  if (!value || typeof value !== 'object') return value

  const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [
    key === 'from' ? 'from_name' : key === 'where' ? 'where_text' : toSnake(key),
    toSupabaseRow(val),
  ])

  const row = Object.fromEntries(entries)

  // Compatibilidade com coluna next_maintenance (se schema original contiver NOT NULL)
  if ('next_maintenance' in row && (row.next_maintenance === null || row.next_maintenance === undefined || row.next_maintenance === '')) {
    row.next_maintenance = '2099-12-31'
  }

  return row
}

function fromSupabaseRow<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map(fromSupabaseRow) as T
  if (!value || typeof value !== 'object') return value as T

  const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => {
    const camelKey = key === 'from_name' ? 'from' : key === 'where_text' ? 'where' : toCamel(key)
    let parsedVal = fromSupabaseRow(val)

    // Se o valor de nextMaintenance for o sentinela 2099-12-31, converter de volta para null
    if (camelKey === 'nextMaintenance' && parsedVal === '2099-12-31') {
      parsedVal = null
    }

    return [camelKey, parsedVal]
  })

  return Object.fromEntries(entries) as T
}

function localFallbackAllowed(): boolean {
  return true
}

function assertSupabaseConfig(): void {
  if (secretKeyError) throw secretKeyError
}

function fallbackOrThrow<T>(collection: string, err: unknown): T[] {
  const error = mapSupabaseError(err)
  console.warn(`[db] Supabase unavailable for ${collection}, using local fallback:`, error.message)
  return localStorageDb.get<T>(collection)
}

async function getTripStops(tripId: string) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('trip_stops')
    .select('*')
    .eq('trip_id', tripId)
    .order('day', { ascending: true })
    .order('time', { ascending: true, nullsFirst: false })

  if (error) throw error
  return fromSupabaseRow(data ?? [])
}

async function replaceTripStops(tripId: string, stops: unknown[] = []) {
  if (!supabase) return

  const { error: deleteError } = await supabase.from('trip_stops').delete().eq('trip_id', tripId)
  if (deleteError) throw deleteError

  if (stops.length === 0) return

  const rows = stops.map((stop) => ({
    ...(toSupabaseRow(stop) as Record<string, unknown>),
    trip_id: tripId,
  }))
  const { error: insertError } = await supabase.from('trip_stops').insert(rows)
  if (insertError) throw insertError
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
    assertSupabaseConfig()
    if (!supabase) {
      const localRows = localStorageDb.get<T>(collection)
      const filtered = filterRowsForUser<T>(collection, localRows)
      if (collection === 'events') {
        return enrichEventsWithCompletion(filtered as unknown as AgendaEvent[]) as unknown as T[]
      }
      return filtered
    }
    try {
      if (collection === 'trips') {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .order('start_date', { ascending: true })
        if (error) throw error

        const trips = await Promise.all(
          (data ?? []).map(async (trip) => ({
            ...fromSupabaseRow<Record<string, unknown>>(trip),
            stops: await getTripStops(String(trip.id)),
          })),
        )
        return trips as T[]
      }

      const { data, error } = await supabase.from(tableName(collection)).select('*')
      if (error) throw error
      const parsed = fromSupabaseRow<T[]>(data ?? [])
      const filtered = filterRowsForUser<T>(collection, parsed)
      if (collection === 'events') {
        return enrichEventsWithCompletion(filtered as unknown as AgendaEvent[]) as unknown as T[]
      }
      return filtered
    } catch (err) {
      const fallbackRows = fallbackOrThrow<T>(collection, err)
      const filtered = filterRowsForUser<T>(collection, fallbackRows)
      if (collection === 'events') {
        return enrichEventsWithCompletion(filtered as unknown as AgendaEvent[]) as unknown as T[]
      }
      return filtered
    }
  },

  /** Substitui todas as linhas de uma coleção. */
  async set<T = Row>(collection: string, rows: T[]): Promise<T[]> {
    assertSupabaseConfig()
    const enrichedRows = rows.map((r) => enrichRowWithUser(collection, r))
    if (!supabase) {
      localStorageDb.set<T>(collection, enrichedRows)
      return enrichedRows
    }
    try {
      if (collection === 'trips') {
        for (const row of enrichedRows) {
          const { stops, ...trip } = row as Record<string, unknown>
          const { error } = await supabase.from('trips').upsert(toSupabaseRow(trip) as Record<string, unknown>)
          if (error) throw error
          await replaceTripStops(String(trip.id), Array.isArray(stops) ? stops : [])
        }
        return enrichedRows
      }

      for (const row of enrichedRows) {
        const { error } = await supabase.from(tableName(collection)).upsert(toSupabaseRow(row) as Record<string, unknown>)
        if (error) throw error
      }
      return enrichedRows
    } catch (err) {
      if (localFallbackAllowed()) {
        localStorageDb.set<T>(collection, enrichedRows)
        return enrichedRows
      }
      throw mapSupabaseError(err)
    }
  },

  /** Insere uma nova linha e retorna todas as linhas atualizadas. */
  async insert<T = Row>(collection: string, row: T): Promise<T[]> {
    assertSupabaseConfig()
    const enrichedRow = enrichRowWithUser(collection, row)
    if (!supabase) {
      const r = enrichedRow as T & { id: string }
      localStorageDb.insert<T & { id: string }>(collection, r)
      return await this.get<T>(collection)
    }
    try {
      if (collection === 'trips') {
        const { stops, ...trip } = enrichedRow as Record<string, unknown>
        const { error } = await supabase.from('trips').insert(toSupabaseRow(trip) as Record<string, unknown>)
        if (error) throw error
        await replaceTripStops(String(trip.id), Array.isArray(stops) ? stops : [])
        return await this.get<T>(collection)
      }

      const { error } = await supabase.from(tableName(collection)).insert(toSupabaseRow(enrichedRow) as Record<string, unknown>)
      if (error) throw error
      return await this.get<T>(collection)
    } catch (err) {
      if (localFallbackAllowed()) {
        const r = enrichedRow as T & { id: string }
        localStorageDb.insert<T & { id: string }>(collection, r)
        return await this.get<T>(collection)
      }
      throw mapSupabaseError(err)
    }
  },

  /** Insere ou atualiza uma linha (upsert). */
  async upsert<T = Row>(collection: string, row: T): Promise<T[]> {
    assertSupabaseConfig()
    const enrichedRow = enrichRowWithUser(collection, row)
    if (!supabase) {
      const r = enrichedRow as T & { id: string }
      const exists = localStorageDb.get<T & { id: string }>(collection).some((it) => it.id === r.id)
      if (exists) {
        localStorageDb.update<T & { id: string }>(collection, r.id, r)
      } else {
        localStorageDb.insert<T & { id: string }>(collection, r)
      }
      return await this.get<T>(collection)
    }
    try {
      const { error } = await supabase
        .from(tableName(collection))
        .upsert(toSupabaseRow(enrichedRow) as Record<string, unknown>, { onConflict: 'id' })
      if (error) throw error
      return await this.get<T>(collection)
    } catch (err) {
      if (localFallbackAllowed()) {
        const r = enrichedRow as T & { id: string }
        const exists = localStorageDb.get<T & { id: string }>(collection).some((it) => it.id === r.id)
        if (exists) {
          localStorageDb.update<T & { id: string }>(collection, r.id, r)
        } else {
          localStorageDb.insert<T & { id: string }>(collection, r)
        }
        return await this.get<T>(collection)
      }
      throw mapSupabaseError(err)
    }
  },

  /** Insere ou atualiza múltiplas linhas em lote. */
  async upsertMany<T = Row>(collection: string, rows: T[]): Promise<T[]> {
    assertSupabaseConfig()
    if (rows.length === 0) return await this.get<T>(collection)

    const enrichedRows = rows.map((r) => enrichRowWithUser(collection, r))

    if (!supabase) {
      for (const row of enrichedRows) {
        const r = row as T & { id: string }
        const exists = localStorageDb.get<T & { id: string }>(collection).some((it) => it.id === r.id)
        if (exists) {
          localStorageDb.update<T & { id: string }>(collection, r.id, r)
        } else {
          localStorageDb.insert<T & { id: string }>(collection, r)
        }
      }
      return await this.get<T>(collection)
    }
    try {
      const supabaseRows = enrichedRows.map((r) => toSupabaseRow(r) as Record<string, unknown>)
      const { error } = await supabase
        .from(tableName(collection))
        .upsert(supabaseRows, { onConflict: 'id' })
      if (error) throw error
      return await this.get<T>(collection)
    } catch (err) {
      if (localFallbackAllowed()) {
        for (const row of enrichedRows) {
          const r = row as T & { id: string }
          const exists = localStorageDb.get<T & { id: string }>(collection).some((it) => it.id === r.id)
          if (exists) {
            localStorageDb.update<T & { id: string }>(collection, r.id, r)
          } else {
            localStorageDb.insert<T & { id: string }>(collection, r)
          }
        }
        return await this.get<T>(collection)
      }
      throw mapSupabaseError(err)
    }
  },

  /** Atualiza uma linha pelo `id`. */
  async update<T = Row>(collection: string, id: string, patch: Partial<T>): Promise<T[]> {
    assertSupabaseConfig()

    if (collection === 'events' && 'completed' in (patch as Record<string, unknown>)) {
      void setEventCompleted(id, Boolean((patch as Record<string, unknown>).completed))
    }

    if (!supabase) {
      localStorageDb.update<T & { id: string }>(collection, id, patch as Partial<T & { id: string }>)
      return this.get<T>(collection)
    }
    try {
      if (collection === 'trips') {
        const { stops, ...tripPatch } = patch as Record<string, unknown>
        if (Object.keys(tripPatch).length > 0) {
          const { error } = await supabase
            .from('trips')
            .update(toSupabaseRow(tripPatch) as Record<string, unknown>)
            .eq('id', id)
          if (error) throw error
        }
        if (Array.isArray(stops)) await replaceTripStops(id, stops)
        return await this.get<T>(collection)
      }

      const { error } = await supabase
        .from(tableName(collection))
        .update(toSupabaseRow(patch) as Record<string, unknown>)
        .eq('id', id)
      if (error) throw error
      return await this.get<T>(collection)
    } catch (err) {
      if (localFallbackAllowed()) {
        localStorageDb.update<T & { id: string }>(collection, id, patch as Partial<T & { id: string }>)
        return this.get<T>(collection)
      }
      throw mapSupabaseError(err)
    }
  },

  /** Remove uma linha pelo `id`. */
  async remove<T = Row>(collection: string, id: string): Promise<T[]> {
    assertSupabaseConfig()
    if (!supabase) {
      localStorageDb.remove<T & { id: string }>(collection, id)
      return localStorageDb.get<T>(collection)
    }
    try {
      const { error } = await supabase.from(tableName(collection)).delete().eq('id', id)
      if (error) throw error
      return await this.get<T>(collection)
    } catch (err) {
      if (localFallbackAllowed()) {
        localStorageDb.remove<T & { id: string }>(collection, id)
        return localStorageDb.get<T>(collection)
      }
      throw mapSupabaseError(err)
    }
  },

  /** Seed inicial — semeia localStorage mock SOMENTE no fallback (Supabase já vem com dados). */
  init(): void {
    if (!supabase) localStorageDb.init()
  },

  /** Reseta localStorage mock. */
  reset(): void {
    localStorageDb.reset()
  },
}

export default db
