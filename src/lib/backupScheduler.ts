import { useBackupStore } from '@/stores/backupStore'
import { toast } from '@/stores/toastStore'
import { db } from '@/lib/db'
import { SEED_VERSION } from '@/data/seed'

/** Collections included in the export — keep in sync with SettingsBackup. */
const COLLECTIONS = [
  'events',
  'emails',
  'lifeLog',
  'facts',
  'reading',
  'media',
  'assets',
  'maintenance',
  'pantry',
  'trips',
  'places',
  'spending',
  'maintMonths',
] as const

type CollectionKey = (typeof COLLECTIONS)[number]
type CollectionsMap = Record<CollectionKey, unknown[]>

interface BackupPayload {
  version: number
  timestamp: string
  kind: 'manual' | 'automatic'
  collections: CollectionsMap
}

/** Build the backup payload for all collections (async — Supabase or localStorage). */
async function buildBackupPayload(kind: 'manual' | 'automatic'): Promise<BackupPayload> {
  const collections = {} as CollectionsMap
  const results = await Promise.all(COLLECTIONS.map((col) => db.get(col)))
  COLLECTIONS.forEach((col, idx) => {
    collections[col] = results[idx]
  })
  return { version: SEED_VERSION, timestamp: new Date().toISOString(), kind, collections }
}

function triggerDownload(payload: BackupPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const prefix = payload.kind === 'automatic' ? 'act-automatic-backup' : 'act-backup'
  a.download = `${prefix}-${payload.timestamp.slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Check whether a scheduled backup should run right now (startup / tab visibility). */
export function maybeRunScheduledBackup(): void {
  const { schedule } = useBackupStore.getState()
  if (!schedule.enabled) return

  const now = new Date()
  const today = now.getDay()
  const currentHour = now.getHours()

  // Só roda se for o dia da semana e já passou da hora configurada.
  if (today !== schedule.dayOfWeek || currentHour < schedule.hour) return

  const last = schedule.lastBackup ? new Date(schedule.lastBackup) : null
  // Já fez backup nesta semana?
  if (last && isSameWeek(last, now) && last.getDay() === schedule.dayOfWeek) return

  runAutomaticBackup()
}

function isSameWeek(a: Date, b: Date): boolean {
  // ISO week number-ish comparison: same week = same Monday-of-the-week.
  const monday = (d: Date) => {
    const c = new Date(d)
    c.setHours(0, 0, 0, 0)
    const day = (c.getDay() + 6) % 7 // Mon=0 … Sun=6
    c.setDate(c.getDate() - day)
    return c.getTime()
  }
  return monday(a) === monday(b)
}

/** Executa o backup automático (gera download + toast + registra no store). */
export function runAutomaticBackup(notify = true): void {
  void buildBackupPayload('automatic').then((payload) => {
    triggerDownload(payload)
    useBackupStore.getState().markBackupDone()
    if (notify) toast.success('Backup semanal automático salvo 📦', { duration: 5000 })
  })
}

/** Backup manual — exposto para components (SettingsBackup). */
export async function runManualBackup(notify = true): Promise<BackupPayload> {
  const payload = await buildBackupPayload('manual')
  triggerDownload(payload)
  if (notify) toast.success('Backup exportado com sucesso 📦', { duration: 4000 })
  return payload
}

/** Init hook — should be called once at startup (main.tsx) and on visibility/focus changes. */
export function initBackupScheduler(): void {
  maybeRunScheduledBackup()

  // Re-checa quando a aba volta a ficar visível (o agendamento "vive" no client,
  // então o melhor momento p/ disparar é quando o app é "reaberto").
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') maybeRunScheduledBackup()
  })
  window.addEventListener('focus', () => maybeRunScheduledBackup())
}

/**
 * Simulate "cloud" persistence of the last backup marker so a future real
 * integration (Google Drive / Dropbox) can reuse the same shape.
 *
 * @deprecated placeholder — real upload lands in a future phase.
 */
export function simulateCloudUpload(_payload: BackupPayload): Promise<void> {
  return Promise.resolve()
}