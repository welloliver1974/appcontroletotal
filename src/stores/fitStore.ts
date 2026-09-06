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
  deleteFitWorkoutSession,
  subscribeToFitRealtime,
  getFitwellSession,
  loginFitwell,
  logoutFitwell,
  FITWELL_APP_URL,
} from '@/lib/fitwellClient'
import { toast } from './toastStore'

export interface WeeklyStreakDay {
  dayLabel: string
  dayNumber: number
  dateStr: string
  isToday: boolean
  isPast: boolean
  trained: boolean
  workoutName?: string
}

export interface WeeklyStreak {
  days: WeeklyStreakDay[]
  count: number
  goal: number
  isGoalMet: boolean
}

export interface MeasurementDelta {
  label: string
  current: number
  previous?: number
  diff?: number
  logDate: string
}

export interface WeightStats {
  current: number | null
  min: number | null
  max: number | null
  avg: number | null
  totalEntries: number
}

export interface HealthIndices {
  icq: { value: number; classification: string; status: 'good' | 'warning' | 'danger' } | null
  ice: { value: number; classification: string; status: 'good' | 'warning' | 'danger' } | null
  imc: { value: number; classification: string; status: 'good' | 'warning' | 'danger' } | null
  symmetries: {
    label: string
    left: number
    right: number
    diff: number
    status: 'good' | 'warning'
  }[]
}

interface FitState {
  weights: FitWeight[]
  measurements: FitMeasurement[]
  bioimpedance: FitBioimpedance[]
  templates: FitWorkoutTemplate[]
  sessions: FitWorkoutSession[]
  userHeightCm: number
  measurementGoals: Record<string, number>
  loading: boolean
  isSyncing: boolean
  lastSync: string | null
  appUrl: string
  fitUserEmail: string | null
  isFitAuthenticated: boolean

  // Actions
  initFitAuth: () => Promise<void>
  switchUserProfile: (email: string | null) => void
  setupAutoSync: () => () => void
  setUserHeightCm: (cm: number) => void
  setMeasurementGoal: (label: string, goalCm: number) => void
  login: (email: string, pass: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  fetchData: (silent?: boolean) => Promise<void>
  logWeight: (weightKg: number, date?: string) => Promise<boolean>
  logMeasurement: (label: string, valueCm: number, date?: string) => Promise<boolean>
  logWorkoutSession: (name: string, templateId?: string, notes?: string) => Promise<boolean>
  logBioimpedance: (data: Partial<FitBioimpedance>) => Promise<boolean>
  deleteWeightLocal: (id: string) => void
  deleteMeasurementLocal: (id: string) => void
  deleteWorkoutSession: (id: string) => Promise<void>
  getLatestWeight: () => FitWeight | null
  getWeightDelta: () => { current: number; previous: number; diff: number } | null
  getWeightStats: () => WeightStats
  getWeeklyStreak: () => WeeklyStreak
  getLatestWorkoutSession: () => { session: FitWorkoutSession | null; relativeTime: string }
  getMeasurementDeltas: () => MeasurementDelta[]
  getHealthIndices: () => HealthIndices
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
      userHeightCm: 175,
      measurementGoals: {},
      loading: false,
      isSyncing: false,
      lastSync: null,
      appUrl: FITWELL_APP_URL,
      fitUserEmail: null,
      isFitAuthenticated: false,

      switchUserProfile: (email: string | null) => {
        const currentEmail = email?.toLowerCase().trim() || null
        if (!currentEmail) return

        // Save current state into previous user's profile key
        const prevEmail = get().fitUserEmail || 'welloliver@gmail.com'
        try {
          const currentState = {
            weights: get().weights,
            measurements: get().measurements,
            bioimpedance: get().bioimpedance,
            templates: get().templates,
            sessions: get().sessions,
            userHeightCm: get().userHeightCm,
            measurementGoals: get().measurementGoals,
          }
          localStorage.setItem(`act.fit_profile_${prevEmail}`, JSON.stringify(currentState))
        } catch {}

        // Load target profile
        try {
          const raw = localStorage.getItem(`act.fit_profile_${currentEmail}`)
          if (raw) {
            const parsed = JSON.parse(raw)
            set({
              weights: parsed.weights || [],
              measurements: parsed.measurements || [],
              bioimpedance: parsed.bioimpedance || [],
              templates: parsed.templates?.length ? parsed.templates : DEFAULT_TEMPLATES,
              sessions: parsed.sessions || [],
              userHeightCm: parsed.userHeightCm || (currentEmail.includes('silvinha') ? 165 : 175),
              measurementGoals: parsed.measurementGoals || {},
              fitUserEmail: currentEmail,
            })
            return
          }
        } catch {}

        // If no saved profile for this user:
        if (currentEmail === 'welloliver@gmail.com' || currentEmail.startsWith('welloliver')) {
          set({ fitUserEmail: currentEmail })
        } else {
          // New user (e.g. silvinhamsa@gmail.com) starts with a clean slate!
          set({
            weights: [],
            measurements: [],
            bioimpedance: [],
            templates: DEFAULT_TEMPLATES,
            sessions: [],
            userHeightCm: 165,
            measurementGoals: {},
            fitUserEmail: currentEmail,
            isFitAuthenticated: false,
          })
        }
      },

      initFitAuth: async () => {
        let currentAuthEmail: string | null = null
        try {
          const rawAuth = localStorage.getItem('act.auth.v2')
          if (rawAuth) {
            currentAuthEmail = JSON.parse(rawAuth)?.state?.userEmail || null
          }
        } catch {}

        if (currentAuthEmail) {
          get().switchUserProfile(currentAuthEmail)
        }

        const session = await getFitwellSession()
        if (session?.user && (!currentAuthEmail || session.user.email?.toLowerCase() === currentAuthEmail.toLowerCase())) {
          set({
            fitUserEmail: session.user.email || null,
            isFitAuthenticated: true,
          })
          await get().fetchData(true)
        } else {
          set({ isFitAuthenticated: false })
        }
      },

      setupAutoSync: () => {
        // 1. Initial auth and fetch
        get().initFitAuth()

        // 2. Realtime subscription to FitWell database changes
        const unsubRealtime = subscribeToFitRealtime(() => {
          console.log('[FitStore] ⚡ Atualização em tempo real detectada no FitWell!')
          get().fetchData(true)
        })

        // 3. Tab Focus / Visibility Change sync
        const onFocus = () => {
          get().fetchData(true)
        }
        const onVisibilityChange = () => {
          if (document.visibilityState === 'visible') {
            get().fetchData(true)
          }
        }
        window.addEventListener('focus', onFocus)
        document.addEventListener('visibilitychange', onVisibilityChange)

        // 4. Background interval (every 60s)
        const intervalId = window.setInterval(() => {
          if (document.visibilityState === 'visible') {
            get().fetchData(true)
          }
        }, 60000)

        return () => {
          unsubRealtime()
          window.removeEventListener('focus', onFocus)
          document.removeEventListener('visibilitychange', onVisibilityChange)
          clearInterval(intervalId)
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

      fetchData: async (silent = false) => {
        if (!silent) set({ loading: true })
        set({ isSyncing: true })
        try {
          const isFitAuth = get().isFitAuthenticated
          const [weights, measurements, bioimpedance, templates, sessions] = await Promise.all([
            fetchFitWeights(30),
            fetchFitMeasurements(50),
            fetchFitBioimpedance(10),
            fetchFitWorkoutTemplates(),
            fetchFitWorkoutSessions(20),
          ])

          set((state) => ({
            weights: isFitAuth ? weights : (weights.length > 0 ? weights : state.weights),
            measurements: isFitAuth ? measurements : (measurements.length > 0 ? measurements : state.measurements),
            bioimpedance: isFitAuth ? bioimpedance : (bioimpedance.length > 0 ? bioimpedance : state.bioimpedance),
            templates: templates.length > 0 ? templates : state.templates,
            sessions: isFitAuth ? sessions : (sessions.length > 0 ? sessions : state.sessions),
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

      deleteWorkoutSession: async (id: string) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        }))
        await deleteFitWorkoutSession(id)
        toast.info('Treino removido do histórico!')
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

      getWeightStats: () => {
        const weights = get().weights
        if (!weights || weights.length === 0) {
          return { current: null, min: null, max: null, avg: null, totalEntries: 0 }
        }
        const values = weights.map((w) => w.weight_kg)
        const current = weights[0].weight_kg
        const min = Math.min(...values)
        const max = Math.max(...values)
        const sum = values.reduce((a, b) => a + b, 0)
        const avg = Number((sum / values.length).toFixed(1))
        return { current, min, max, avg, totalEntries: weights.length }
      },

      getWeeklyStreak: () => {
        const sessions = get().sessions
        const now = new Date()
        const dayOfWeek = now.getDay() // 0 = Sun, 1 = Mon...
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const monday = new Date(now)
        monday.setDate(now.getDate() + mondayOffset)
        monday.setHours(0, 0, 0, 0)

        const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
        const days: WeeklyStreakDay[] = []
        let trainedCount = 0

        for (let i = 0; i < 7; i++) {
          const currentDay = new Date(monday)
          currentDay.setDate(monday.getDate() + i)
          const dateStr = currentDay.toISOString().slice(0, 10)
          const isToday = dateStr === now.toISOString().slice(0, 10)
          const isPast = currentDay.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

          const sessionOnDay = sessions.find((s) => s.completed_at.slice(0, 10) === dateStr)
          const trained = !!sessionOnDay
          if (trained) trainedCount++

          days.push({
            dayLabel: dayNames[i],
            dayNumber: currentDay.getDate(),
            dateStr,
            isToday,
            isPast,
            trained,
            workoutName: sessionOnDay?.name,
          })
        }

        const goal = 4
        return {
          days,
          count: trainedCount,
          goal,
          isGoalMet: trainedCount >= goal,
        }
      },

      getLatestWorkoutSession: () => {
        const sessions = get().sessions
        if (!sessions || sessions.length === 0) {
          return { session: null, relativeTime: 'Nenhum treino recente' }
        }
        const sorted = [...sessions].sort(
          (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        )
        const latest = sorted[0]
        const diffMs = Date.now() - new Date(latest.completed_at).getTime()
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)

        let relativeTime = ''
        if (diffDays === 0) {
          if (diffHours === 0) {
            const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)))
            relativeTime = `Hoje (há ${diffMins} min)`
          } else {
            relativeTime = `Hoje (há ${diffHours}h)`
          }
        } else if (diffDays === 1) {
          relativeTime = 'Ontem'
        } else {
          relativeTime = `Há ${diffDays} dias`
        }

        return { session: latest, relativeTime }
      },

      getMeasurementDeltas: () => {
        const measurements = get().measurements
        const groups: Record<string, FitMeasurement[]> = {}
        for (const m of measurements) {
          const key = m.label.trim().toLowerCase()
          if (!groups[key]) groups[key] = []
          groups[key].push(m)
        }

        const deltas: MeasurementDelta[] = []
        for (const [_, list] of Object.entries(groups)) {
          const sorted = [...list].sort((a, b) => b.log_date.localeCompare(a.log_date))
          const current = sorted[0]
          const prev = sorted.length > 1 ? sorted[1] : undefined
          const diff = prev ? Number((current.value_cm - prev.value_cm).toFixed(1)) : undefined

          deltas.push({
            label: current.label,
            current: current.value_cm,
            previous: prev?.value_cm,
            diff,
            logDate: current.log_date,
          })
        }
        return deltas
      },

      getHealthIndices: () => {
        const measurementsMap = get().getLatestMeasurementsByLabel()
        const latestWeight = get().getLatestWeight()
        const heightCm = get().userHeightCm || 175

        // 1. ICQ (Cintura / Quadril)
        let icq: HealthIndices['icq'] = null
        const cintura = measurementsMap['cintura']?.value_cm || measurementsMap['cintura / abdômen']?.value_cm
        const quadril = measurementsMap['quadril']?.value_cm || measurementsMap['quadril / glúteo']?.value_cm
        if (cintura && quadril && quadril > 0) {
          const val = Number((cintura / quadril).toFixed(2))
          let classification = 'Risco Baixo'
          let status: 'good' | 'warning' | 'danger' = 'good'
          if (val >= 1.0) {
            classification = 'Risco Elevado'
            status = 'danger'
          } else if (val >= 0.90) {
            classification = 'Risco Moderado'
            status = 'warning'
          }
          icq = { value: val, classification, status }
        }

        // 2. ICE (Cintura / Estatura)
        let ice: HealthIndices['ice'] = null
        if (cintura && heightCm > 0) {
          const val = Number((cintura / heightCm).toFixed(2))
          let classification = 'Excelente (< 0.50)'
          let status: 'good' | 'warning' | 'danger' = 'good'
          if (val >= 0.60) {
            classification = 'Elevado (>= 0.60)'
            status = 'danger'
          } else if (val >= 0.50) {
            classification = 'Atenção (0.50 - 0.59)'
            status = 'warning'
          }
          ice = { value: val, classification, status }
        }

        // 3. IMC (Peso / Altura^2)
        let imc: HealthIndices['imc'] = null
        if (latestWeight && heightCm > 0) {
          const heightM = heightCm / 100
          const val = Number((latestWeight.weight_kg / (heightM * heightM)).toFixed(1))
          let classification = 'Peso Saudável'
          let status: 'good' | 'warning' | 'danger' = 'good'
          if (val >= 30) {
            classification = 'Obesidade'
            status = 'danger'
          } else if (val >= 25) {
            classification = 'Sobrepeso'
            status = 'warning'
          } else if (val < 18.5) {
            classification = 'Abaixo do peso'
            status = 'warning'
          }
          imc = { value: val, classification, status }
        }

        // 4. Simetria Muscular
        const symmetries: HealthIndices['symmetries'] = []
        const pairs = [
          { label: 'Bíceps / Braço', leftKey: 'braço esquerdo', rightKey: 'braço direito' },
          { label: 'Coxas', leftKey: 'coxa esquerda', rightKey: 'coxa direita' },
          { label: 'Panturrilhas', leftKey: 'panturrilha esquerda', rightKey: 'panturrilha direita' },
        ]

        for (const pair of pairs) {
          const leftVal = measurementsMap[pair.leftKey]?.value_cm
          const rightVal = measurementsMap[pair.rightKey]?.value_cm
          if (leftVal && rightVal) {
            const diff = Number(Math.abs(leftVal - rightVal).toFixed(1))
            symmetries.push({
              label: pair.label,
              left: leftVal,
              right: rightVal,
              diff,
              status: diff <= 1.0 ? 'good' : 'warning',
            })
          }
        }

        return { icq, ice, imc, symmetries }
      },

      setUserHeightCm: (cm: number) => {
        set({ userHeightCm: cm })
        toast.success(`Altura atualizada para ${cm} cm! 📏`)
      },

      setMeasurementGoal: (label: string, goalCm: number) => {
        set((state) => ({
          measurementGoals: {
            ...state.measurementGoals,
            [label.toLowerCase().trim()]: goalCm,
          },
        }))
        toast.success(`Meta de ${label} definida para ${goalCm} cm! 🎯`)
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
        userHeightCm: state.userHeightCm,
        measurementGoals: state.measurementGoals,
        lastSync: state.lastSync,
        fitUserEmail: state.fitUserEmail,
        isFitAuthenticated: state.isFitAuthenticated,
      }),
    },
  ),
)

