import { createClient } from '@supabase/supabase-js'

export interface FitWeight {
  id: string
  user_id?: string
  log_date: string
  weight_kg: number
  created_at?: string
}

export interface FitMeasurement {
  id: string
  user_id?: string
  log_date: string
  label: string
  value_cm: number
  created_at?: string
}

export interface FitBioimpedance {
  id: string
  user_id?: string
  log_date: string
  weight_kg: number | null
  body_fat_pct: number | null
  muscle_mass_kg: number | null
  bone_mass_kg: number | null
  body_water_pct: number | null
  visceral_fat: number | null
  bmr_machine: number | null
  metabolic_age: number | null
  notes: string | null
  created_at?: string
}

export interface FitWorkoutTemplate {
  id: string
  user_id?: string
  name: string
  created_at?: string
}

export interface FitWorkoutSession {
  id: string
  user_id?: string
  workout_id?: string | null
  name: string
  completed_at: string
  notes?: string | null
  created_at?: string
}

const FITWELL_URL =
  import.meta.env.VITE_FITWELL_SUPABASE_URL || 'https://haavrgglnfbchiygspqw.supabase.co'
const FITWELL_KEY =
  import.meta.env.VITE_FITWELL_SUPABASE_KEY ||
  'sb_publishable_Ad2aSiOJKf_53pnMCLhc6A_JkX1vvJ2'
export const FITWELL_APP_URL =
  import.meta.env.VITE_FITWELL_APP_URL || 'https://fitwellhub.vercel.app'

export const fitwellSupabase =
  FITWELL_URL && FITWELL_KEY
    ? createClient(FITWELL_URL, FITWELL_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storageKey: 'fitwell_auth_session',
        },
      })
    : null

export const isFitwellConnected = !!fitwellSupabase

/** Helper to get anonymous or authenticated user ID fallback */
function getFitUserId(): string {
  const sessionUser = fitwellSupabase?.auth?.getSession?.()
  // @ts-ignore
  if (sessionUser?.data?.session?.user?.id) return sessionUser.data.session.user.id
  return '00000000-0000-0000-0000-000000000000'
}

/** Fetch recent weights */
export async function fetchFitWeights(limit = 30): Promise<FitWeight[]> {
  if (!fitwellSupabase) return []
  try {
    const { data, error } = await fitwellSupabase
      .from('body_weights')
      .select('*')
      .order('log_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('[FitWell] Erro ao buscar pesos:', error.message)
      return []
    }
    return (data || []) as FitWeight[]
  } catch (err) {
    console.warn('[FitWell] Falha de conexão com pesos:', err)
    return []
  }
}

/** Log weight entry */
export async function insertFitWeight(
  weightKg: number,
  logDate?: string,
): Promise<FitWeight | null> {
  if (!fitwellSupabase) return null
  try {
    const date = logDate || new Date().toISOString().slice(0, 10)
    const { data, error } = await fitwellSupabase
      .from('body_weights')
      .insert({
        user_id: getFitUserId(),
        weight_kg: Number(weightKg),
        log_date: date,
      })
      .select()
      .single()

    if (error) {
      console.warn('[FitWell] Erro ao inserir peso:', error.message)
      return null
    }
    return data as FitWeight
  } catch (err) {
    console.warn('[FitWell] Falha ao gravar peso:', err)
    return null
  }
}

/** Fetch recent body measurements */
export async function fetchFitMeasurements(limit = 50): Promise<FitMeasurement[]> {
  if (!fitwellSupabase) return []
  try {
    const { data, error } = await fitwellSupabase
      .from('body_measurements')
      .select('*')
      .order('log_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('[FitWell] Erro ao buscar medidas:', error.message)
      return []
    }
    return (data || []) as FitMeasurement[]
  } catch (err) {
    console.warn('[FitWell] Falha de conexão com medidas:', err)
    return []
  }
}

/** Log measurement */
export async function insertFitMeasurement(
  label: string,
  valueCm: number,
  logDate?: string,
): Promise<FitMeasurement | null> {
  if (!fitwellSupabase) return null
  try {
    const date = logDate || new Date().toISOString().slice(0, 10)
    const { data, error } = await fitwellSupabase
      .from('body_measurements')
      .insert({
        user_id: getFitUserId(),
        label: label.trim(),
        value_cm: Number(valueCm),
        log_date: date,
      })
      .select()
      .single()

    if (error) {
      console.warn('[FitWell] Erro ao inserir medida:', error.message)
      return null
    }
    return data as FitMeasurement
  } catch (err) {
    console.warn('[FitWell] Falha ao gravar medida:', err)
    return null
  }
}

/** Fetch bioimpedance */
export async function fetchFitBioimpedance(limit = 10): Promise<FitBioimpedance[]> {
  if (!fitwellSupabase) return []
  try {
    const { data, error } = await fitwellSupabase
      .from('bioimpedance_logs')
      .select('*')
      .order('log_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('[FitWell] Erro ao buscar bioimpedância:', error.message)
      return []
    }
    return (data || []) as FitBioimpedance[]
  } catch (err) {
    console.warn('[FitWell] Falha de conexão com bioimpedância:', err)
    return []
  }
}

/** Fetch workout templates */
export async function fetchFitWorkoutTemplates(): Promise<FitWorkoutTemplate[]> {
  if (!fitwellSupabase) return []
  try {
    const { data, error } = await fitwellSupabase
      .from('workout_templates')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.warn('[FitWell] Erro ao buscar templates de treino:', error.message)
      return []
    }
    return (data || []) as FitWorkoutTemplate[]
  } catch (err) {
    console.warn('[FitWell] Falha ao buscar templates:', err)
    return []
  }
}

/** Fetch recent workout sessions */
export async function fetchFitWorkoutSessions(limit = 20): Promise<FitWorkoutSession[]> {
  if (!fitwellSupabase) return []
  try {
    const { data, error } = await fitwellSupabase
      .from('workout_sessions')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.warn('[FitWell] Erro ao buscar sessões de treino:', error.message)
      return []
    }
    return (data || []) as FitWorkoutSession[]
  } catch (err) {
    console.warn('[FitWell] Falha ao buscar sessões:', err)
    return []
  }
}

/** Log workout session */
export async function insertFitWorkoutSession(
  name: string,
  workoutId?: string | null,
  completedAt?: string,
  notes?: string | null,
): Promise<FitWorkoutSession | null> {
  if (!fitwellSupabase) return null
  try {
    const time = completedAt || new Date().toISOString()
    const { data, error } = await fitwellSupabase
      .from('workout_sessions')
      .insert({
        user_id: getFitUserId(),
        name: name.trim(),
        workout_id: workoutId || null,
        completed_at: time,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.warn('[FitWell] Erro ao inserir sessão de treino:', error.message)
      return null
    }
    return data as FitWorkoutSession
  } catch (err) {
    console.warn('[FitWell] Falha ao gravar treino:', err)
    return null
  }
}

/** Log bioimpedance */
export async function insertFitBioimpedance(
  data: Partial<FitBioimpedance>,
): Promise<FitBioimpedance | null> {
  if (!fitwellSupabase) return null
  try {
    const { data: result, error } = await fitwellSupabase
      .from('bioimpedance_logs')
      .insert({
        user_id: getFitUserId(),
        log_date: data.log_date || new Date().toISOString().slice(0, 10),
        weight_kg: data.weight_kg ?? null,
        body_fat_pct: data.body_fat_pct ?? null,
        muscle_mass_kg: data.muscle_mass_kg ?? null,
        bone_mass_kg: data.bone_mass_kg ?? null,
        body_water_pct: data.body_water_pct ?? null,
        visceral_fat: data.visceral_fat ?? null,
        bmr_machine: data.bmr_machine ?? null,
        metabolic_age: data.metabolic_age ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single()

    if (error) {
      console.warn('[FitWell] Erro ao inserir bioimpedância:', error.message)
      return null
    }
    return result as FitBioimpedance
  } catch (err) {
    console.warn('[FitWell] Falha ao gravar bioimpedância:', err)
    return null
  }
}

