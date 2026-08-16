import { createClient, PostgrestError } from '@supabase/supabase-js'
import { db as localStorageDb } from '@/data/db'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

type Row = { id: string } & Record<string, unknown>

/**
 * Database adapter com fallback automático para o mock (localStorage).
 *
 * - Se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estiverem definidas → usa Supabase.
 * - Se não estiverem → usa localStorage mock automaticamente (funciona offline).
 *
 * A interface é idêntica ao `db` mock existente (`get/set/insert/update/remove/init/reset`)
 * para que nenhum código no app precise mudar.
 */

const supabaseUrl = SUPABASE_URL
const supabaseKey = SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      db: { schema: 'public' },
      auth: { autoRefreshToken: true, persistSession: true },
    })
  : null

/** True quando o cliente Supabase está configurado. */
export const useSupabase = !!supabase

/**
 * Fallback handler — usa localStorage mock quando Supabase não está disponível
 * ou quando há erro de rede. Mantém o app 100% funcional offline.
 */

function mapSupabaseError(err: unknown): Error {
  const postgrestErr = err as PostgrestError | undefined
  if (postgrestErr?.message) return new Error(postgrestErr.message)
  const netErr = err as { message?: string } | undefined
  if (netErr?.message) return new Error(netErr.message)
  return new Error('Database unavailable')
}

/**
 * Database adapter — mesma interface do mock localStorage, mas usa Supabase quando
 * configurado. Fallback automático pro mock em caso de erro ou ausência de config.
 */
export const db = {
  /** Lista todas as linhas de uma coleção. */
  async get<T = Row>(collection: string): Promise<T[]> {
    if (!supabase) return localStorageDb.get<T>(collection)
    try {
      const { data, error } = await supabase.from(collection).select('*')
      if (error) {
        console.warn(`[db] Supabase error on get(${collection}) — falling back to mock:`, error.message)
        return localStorageDb.get<T>(collection)
      }
      return (data ?? []) as T[]
    } catch (err) {
      console.warn(`[db] Supabase threw on get(${collection}) — falling back to mock:`, mapSupabaseError(err).message)
      return localStorageDb.get<T>(collection)
    }
  },

  /** Substitui todas as linhas de uma coleção (merge semelhante). */
  async set<T = Row>(collection: string, rows: T[]): Promise<T[]> {
    if (!supabase) {
      localStorageDb.set<T>(collection, rows)
      return rows
    }
    try {
      // Upsert each row (Supabase needs primary key match)
      for (const row of rows) {
        const { error } = await supabase.from(collection).upsert(row as Record<string, unknown>)
        if (error) throw error
      }
      return rows
    } catch (err) {
      console.warn(`[db] Supabase set failed for ${collection} — falling back to mock:`, mapSupabaseError(err).message)
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
    try {
      const { error } = await supabase.from(collection).insert(row as Record<string, unknown>)
      if (error) throw error
      return await this.get<T>(collection)
    } catch (err) {
      console.warn(`[db] Supabase insert failed for ${collection} — falling back to mock:`, mapSupabaseError(err).message)
      const r = row as T & { id: string }
      localStorageDb.insert<T & { id: string }>(collection, r)
      return localStorageDb.get<T>(collection)
    }
  },

  /** Atualiza uma linha pelo `id` e retorna todas as linhas atualizadas. */
  async update<T = Row>(collection: string, id: string, patch: Partial<T>): Promise<T[]> {
    if (!supabase) {
      localStorageDb.update<T & { id: string }>(collection, id, patch as Partial<T & { id: string }>)
      return localStorageDb.get<T>(collection)
    }
    try {
      const { error } = await supabase.from(collection).update(patch as Record<string, unknown>).eq('id', id)
      if (error) throw error
      return await this.get<T>(collection)
    } catch (err) {
      console.warn(`[db] Supabase update failed for ${collection}:${id} — falling back to mock:`, mapSupabaseError(err).message)
      localStorageDb.update<T & { id: string }>(collection, id, patch as Partial<T & { id: string }>)
      return localStorageDb.get<T>(collection)
    }
  },

  /** Remove uma linha pelo `id` e retorna todas as linhas atualizadas. */
  async remove<T = Row>(collection: string, id: string): Promise<T[]> {
    if (!supabase) {
      localStorageDb.remove<T & { id: string }>(collection, id)
      return localStorageDb.get<T>(collection)
    }
    try {
      const { error } = await supabase.from(collection).delete().eq('id', id)
      if (error) throw error
      return await this.get<T>(collection)
    } catch (err) {
      console.warn(`[db] Supabase remove failed for ${collection}:${id} — falling back to mock:`, mapSupabaseError(err).message)
      localStorageDb.remove<T & { id: string }>(collection, id)
      return localStorageDb.get<T>(collection)
    }
  },

  /** Seed inicial — semeia localStorage mock (Supabase já vem com dados via SQL/schema). */
  init(): void {
    localStorageDb.init()
  },

  /** Reseta localStorage mock (dados reais viram do seed). */
  reset(): void {
    localStorageDb.reset()
  },
}

export default db