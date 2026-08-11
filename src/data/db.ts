import { SEED, SEED_VERSION } from './seed'

const PREFIX = 'act.'
const VERSION_KEY = 'act.schemaVersion'

function readRows<T>(collection: string): T[] {
  try {
    const raw = localStorage.getItem(PREFIX + collection)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeRows<T>(collection: string, rows: T[]): void {
  localStorage.setItem(PREFIX + collection, JSON.stringify(rows))
}

/** Tiny mock "database" over localStorage. Each collection is one keyed table. */
export const db = {
  get<T>(collection: string): T[] {
    return readRows<T>(collection)
  },
  set<T>(collection: string, rows: T[]): void {
    writeRows(collection, rows)
  },
  insert<T extends { id: string }>(collection: string, row: T): T[] {
    const rows = readRows<T>(collection)
    rows.push(row)
    writeRows(collection, rows)
    return rows
  },
  update<T extends { id: string }>(collection: string, id: string, patch: Partial<T>): T[] {
    const rows = readRows<T>(collection).map((r) => (r.id === id ? { ...r, ...patch } : r))
    writeRows(collection, rows)
    return rows
  },
  remove<T>(collection: string, id: string): T[] {
    const rows = readRows<T>(collection).filter((r) => (r as { id: string }).id !== id)
    writeRows(collection, rows)
    return rows
  },
  /** Ensure the mock DB is seeded exactly once (per schema version). */
  init(): void {
    if (localStorage.getItem(VERSION_KEY) === String(SEED_VERSION)) return
    for (const [collection, rows] of Object.entries(SEED)) {
      writeRows(collection, rows)
    }
    localStorage.setItem(VERSION_KEY, String(SEED_VERSION))
  },
  /** Wipe everything (used by "reset demo data" helpers). */
  reset(): void {
    localStorage.removeItem(VERSION_KEY)
    this.init()
  },
}