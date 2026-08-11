import { db } from './db'

/** Simulated network latency + jitter, so hooks behave like a real backend. */
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms + Math.random() * 250))

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)

/** Fake async REST-style API. Every mutation also re-persists to localStorage. */
export const api = {
  async list<T>(collection: string): Promise<T[]> {
    await delay()
    return db.get<T>(collection)
  },
  async create<T extends { id: string }>(collection: string, row: Omit<T, 'id'>): Promise<T> {
    await delay(250)
    const full = { ...row, id: uid() } as T
    db.insert(collection, full)
    return full
  },
  async update<T extends { id: string }>(collection: string, id: string, patch: Partial<T>): Promise<T[]> {
    await delay(250)
    return db.update(collection, id, patch)
  },
  async remove<T>(collection: string, id: string): Promise<T[]> {
    await delay(200)
    return db.remove(collection, id)
  },
}