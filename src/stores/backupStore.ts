import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export interface BackupSchedule {
  enabled: boolean
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number
  /** 0-23 */
  hour: number
  /** ISO timestamp of the last successful automatic backup. */
  lastBackup: string | null
  /** Number of automatic backups performed. */
  backupCount: number
}

const DEFAULT_SCHEDULE: BackupSchedule = {
  enabled: false,
  dayOfWeek: 1, // Segunda-feira
  hour: 2, // 02:00
  lastBackup: null,
  backupCount: 0,
}

interface BackupState {
  schedule: BackupSchedule
  setEnabled: (enabled: boolean) => void
  setDayOfWeek: (day: number) => void
  setHour: (hour: number) => void
  markBackupDone: () => void
  reset: () => void
}

/** Backup scheduler settings (persisted). The actual scheduler lives in backupScheduler.ts. */
export const useBackupStore = create<BackupState>()(
  persist(
    (set) => ({
      schedule: DEFAULT_SCHEDULE,
      setEnabled: (enabled) => set((s) => ({ schedule: { ...s.schedule, enabled } })),
      setDayOfWeek: (dayOfWeek) => set((s) => ({ schedule: { ...s.schedule, dayOfWeek } })),
      setHour: (hour) => set((s) => ({ schedule: { ...s.schedule, hour } })),
      markBackupDone: () =>
        set((s) => ({
          schedule: {
            ...s.schedule,
            lastBackup: new Date().toISOString(),
            backupCount: s.schedule.backupCount + 1,
          },
        })),
      reset: () => set({ schedule: DEFAULT_SCHEDULE }),
    }),
    { name: 'act.backupSchedule', storage: createJSONStorage(() => localStorage) },
  ),
)