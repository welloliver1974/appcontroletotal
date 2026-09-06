import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  type FitBioimpedance,
  type FitMeasurement,
  type FitWeight,
  type FitWorkoutSession,
  type FitWorkoutTemplate,
  fetchFitBioimpedance,
  fetchFitMeasurements,
  fetchFitWeights,
  fetchFitWorkoutSessions,
  fetchFitWorkoutTemplates,
  insertFitBioimpedance,
  insertFitMeasurement,
  insertFitWeight,
  insertFitWorkoutSession,
  getFitwellSession,
  loginFitwell,
  logoutFitwell,
  FITWELL_APP_URL,
} from '@/lib/fitwellClient'
import { toast } from './toastStore'

interface FitState {
  weights: FitWeight[]
  measurements: FitMeasurement[]
  bioimpedance: FitBioimpedance[]
  templates: FitWorkoutTemplate[]
  sessions: FitWorkoutSession[]
  loading: boolean
  isSyncing: boolean
  lastSync: string | null
  appUrl: string
  fitUserEmail: string | null
  isFitAuthenticated: boolean

  // Actions
  initFitAuth: () => Promise<void>
  login: (email: string, pass: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  fetchData: () => Promise<void>
  logWeight: (weightKg: number, date?: string) => Promise<boolean>
  logMeasurement: (label: string, valueCm: number, date?: string) => Promise<boolean>
  logWorkoutSession: (name: string, templateId?: string, notes?: string) => Promise<boolean>
  logBioimpedance: (data: Partial<FitBioimpedance>) => Promise<boolean>
  deleteWeightLocal: (id: string) => void
  deleteMeasurementLocal: (id: string) => void
  getLatestWeight: () => FitWeight | null
  getWeightDelta: () => { current: number; previous: number; diff: number } | null
  getLatestMeasurementsByLabel: () => Record<string, FitMeasurement>
}

// Initial default templates if none returned
const DEFAULT_TEMPLATES: FitWorkoutTemplate[] = [
  { id: 'tpl-1', name: 'Treino A — Peito & Tríceps' },
  { id: 'tpl-2', name: 'Treino B — Costas & Bíceps' },
  { id: 'tpl-3', name: 'Treino C — Pernas & Panturrilha' },
  { id: 'tpl-4', name: 'Treino D — Ombros & Abdômen' },
]

export const useFitStore = create<FitState>()(
  persist(
    (set, get) => ({
      weights: [],
      measurements: [],
      bioimpedance: [],
      templates: DEFAULT_TEMPLATES,
      sessions: [],
      loading: false,
      isSyncing: false,
      lastSync: null,
      appUrl: FITWELL_APP_URL,
      fitUserEmail: null,
      isFitAuthenticated: false,

      initFitAuth: async () => {
        const session = await getFitwellSession()
        if (session?.user) {
          set({
            fitUserEmail: session.user.email || null,
            isFitAuthenticated: true,
          })
          await get().fetchData()
        } else {
          set({ isFitAuthenticated: false })
        }
      },

      login: async (email: string, pass: string) => {
        set({ isSyncing: true })
        const res = await loginFitwell(email, pass)
        if (res.ok && res.user) {
          set({
            fitUserEmail: res.user.email || email,
            isFitAuthenticated: true,
            isSyncing: false,
          })
          toast.success(`Conectado à conta FitWell (${res.user.email})! 🏋️‍♂️`)
          await get().fetchData()
          return { ok: true }
        }
        set({ isSyncing: false })
        return { ok: false, error: res.error || 'Credenciais inválidas no FitWellHub.' }
      },

      logout: async () => {
        await logoutFitwell()
        set({
          fitUserEmail: null,
          isFitAuthenticated: false,
        })
        toast.info('Desconectado do FitWellHub.')
      },

      fetchData: async () => {
        set({ loading: true, isSyncing: true })
        try {
          const [weights, measurements, bioimpedance, templates, sessions] = await Promise.all([
            fetchFitWeights(30),
            fetchFitMeasurements(50),
            fetchFitBioimpedance(10),
            fetchFitWorkoutTemplates(),
            fetchFitWorkoutSessions(20),
          ])

          set((state) => ({
            weights: weights.length > 0 ? weights : state.weights,
            measurements: measurements.length > 0 ? measurements : state.measurements,
            bioimpedance: bioimpedance.length > 0 ? bioimpedance : state.bioimpedance,
            templates: templates.length > 0 ? templates : state.templates,
            sessions: sessions.length > 0 ? sessions : state.sessions,
            lastSync: new Date().toISOString(),
            loading: false,
            isSyncing: false,
          }))
        } catch (err) {
          console.warn('[FitStore] Falha ao sincronizar dados com FitWell:', err)
          set({ loading: false, isSyncing: false })
        }
      },

      logWeight: async (weightKg: number, date?: string) => {
        const logDate = date || new Date().toISOString().slice(0, 10)
        const localEntry: FitWeight = {
          id: `w-${Date.now()}`,
          weight_kg: Number(weightKg),
          log_date: logDate,
          created_at: new Date().toISOString(),
        }

        // Optimistic local update
        set((state) => {
          const filtered = state.weights.filter((w) => w.log_date !== logDate)
          return { weights: [localEntry, ...filtered].sort((a, b) => b.log_date.localeCompare(a.log_date)) }
        })

        // Cloud insert
        const remote = await insertFitWeight(weightKg, logDate)
        if (remote) {
          set((state) => ({
            weights: state.weights.map((w) => (w.id === localEntry.id ? remote : w)),
          }))
        }
        toast.success(`Peso de ${weightKg} kg registrado com sucesso! ⚖️`)
        return true
      },

      logMeasurement: async (label: string, valueCm: number, date?: string) => {
        const logDate = date || new Date().toISOString().slice(0, 10)
        const localEntry: FitMeasurement = {
          id: `m-${Date.now()}`,
          label: label.trim(),
          value_cm: Number(valueCm),
          log_date: logDate,
          created_at: new Date().toISOString(),
        }

        set((state) => ({
          measurements: [localEntry, ...state.measurements],
        }))

        const remote = await insertFitMeasurement(label, valueCm, logDate)
        if (remote) {
          set((state) => ({
            measurements: state.measurements.map((m) => (m.id === localEntry.id ? remote : m)),
          }))
        }
        toast.success(`Medida ${label} (${valueCm} cm) salva no FitWell! 📏`)
        return true
      },

      logWorkoutSession: async (name: string, templateId?: string, notes?: string) => {
        const completedAt = new Date().toISOString()
        const localEntry: FitWorkoutSession = {
          id: `s-${Date.now()}`,
          name: name.trim(),
          workout_id: templateId || null,
          completed_at: completedAt,
          notes: notes || null,
        }

        set((state) => ({
          sessions: [localEntry, ...state.sessions],
        }))

        const remote = await insertFitWorkoutSession(name, templateId, completedAt, notes)
        if (remote) {
          set((state) => ({
            sessions: state.sessions.map((s) => (s.id === localEntry.id ? remote : s)),
          }))
        }
        toast.success(`Treino "${name}" concluído e sincronizado! 💪🔥`)
        return true
      },

      logBioimpedance: async (data: Partial<FitBioimpedance>) => {
        const logDate = data.log_date || new Date().toISOString().slice(0, 10)
        const localEntry: FitBioimpedance = {
          id: `bio-${Date.now()}`,
          log_date: logDate,
          weight_kg: data.weight_kg ?? null,
          body_fat_pct: data.body_fat_pct ?? null,
          muscle_mass_kg: data.muscle_mass_kg ?? null,
          bone_mass_kg: data.bone_mass_kg ?? null,
          body_water_pct: data.body_water_pct ?? null,
          visceral_fat: data.visceral_fat ?? null,
          bmr_machine: data.bmr_machine ?? null,
          metabolic_age: data.metabolic_age ?? null,
          notes: data.notes ?? null,
          created_at: new Date().toISOString(),
        }

        set((state) => ({
          bioimpedance: [localEntry, ...state.bioimpedance],
        }))

        const remote = await insertFitBioimpedance(data)
        if (remote) {
          set((state) => ({
            bioimpedance: state.bioimpedance.map((b) => (b.id === localEntry.id ? remote : b)),
          }))
        }
        toast.success('Bioimpedância registrada com sucesso!')
        return true
      },

      deleteWeightLocal: (id: string) => {
        set((state) => ({
          weights: state.weights.filter((w) => w.id !== id),
        }))
        toast.info('Registro de peso removido localmente.')
      },

      deleteMeasurementLocal: (id: string) => {
        set((state) => ({
          measurements: state.measurements.filter((m) => m.id !== id),
        }))
        toast.info('Medida removida localmente.')
      },

      getLatestWeight: () => {
        const weights = get().weights
        return weights.length > 0 ? weights[0] : null
      },

      getWeightDelta: () => {
        const weights = get().weights
        if (weights.length < 2) {
          if (weights.length === 1) {
            return { current: weights[0].weight_kg, previous: weights[0].weight_kg, diff: 0 }
          }
          return null
        }
        const current = weights[0].weight_kg
        const previous = weights[1].weight_kg
        const diff = Number((current - previous).toFixed(2))
        return { current, previous, diff }
      },

      getLatestMeasurementsByLabel: () => {
        const measurements = get().measurements
        const map: Record<string, FitMeasurement> = {}
        for (const m of measurements) {
          const key = m.label.toLowerCase()
          if (!map[key]) {
            map[key] = m
          }
        }
        return map
      },
    }),
    {
      name: 'fitwell_local_store',
      partialize: (state) => ({
        weights: state.weights,
        measurements: state.measurements,
        bioimpedance: state.bioimpedance,
        templates: state.templates,
        sessions: state.sessions,
        lastSync: state.lastSync,
        fitUserEmail: state.fitUserEmail,
        isFitAuthenticated: state.isFitAuthenticated,
      }),
    },
  ),
)
