import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { supabase } from '@/lib/db'
import { useFitStore } from './fitStore'
import type { Session, User } from '@supabase/supabase-js'

export const HERMES_CODE = '2468'

interface AuthState {
  user: User | null
  session: Session | null
  isTrusted: boolean
  loading: boolean
  userEmail: string | null
  
  // Actions
  initAuth: () => Promise<void>
  signInWithEmail: (email: string, pass: string) => Promise<{ ok: boolean; error?: string }>
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ ok: boolean; error?: string }>
  signOut: () => Promise<void>
  sendMagicLink: (email: string) => Promise<{ ok: boolean; error?: string }>
  verifyEmergencyCode: (code: string) => boolean
  trustThisDevice: (email?: string) => void
  untrustThisDevice: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isTrusted: false,
      loading: true,
      userEmail: null,

      initAuth: async () => {
        if (!supabase) {
          set({ loading: false })
          return
        }

        try {
          const { data } = await supabase.auth.getSession()
          if (data.session) {
            const email = data.session.user.email || null
            set({
              session: data.session,
              user: data.session.user,
              userEmail: email,
              isTrusted: true,
              loading: false,
            })
            useFitStore.getState().switchUserProfile(email)
          } else {
            set({ loading: false })
          }

          supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
              const email = session.user.email || null
              set({
                session,
                user: session.user,
                userEmail: email,
                isTrusted: true,
                loading: false,
              })
              useFitStore.getState().switchUserProfile(email)
            } else {
              // Only reset if user explicitly logged out
              set({
                session: null,
                user: null,
                loading: false,
              })
            }
          })
        } catch (err) {
          console.error('Auth initialization error:', err)
          set({ loading: false })
        }
      },

      signInWithEmail: async (email: string, pass: string) => {
        const cleanEmail = email.trim()
        if (!supabase) {
          // Local fallback
          set({ isTrusted: true, userEmail: cleanEmail })
          useFitStore.getState().switchUserProfile(cleanEmail)
          return { ok: true }
        }

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: pass,
          })

          if (error) {
            return { ok: false, error: error.message }
          }

          if (data.session) {
            const userEmail = data.session.user.email || cleanEmail
            set({
              session: data.session,
              user: data.session.user,
              userEmail,
              isTrusted: true,
            })
            useFitStore.getState().switchUserProfile(userEmail)
            return { ok: true }
          }

          return { ok: false, error: 'Não foi possível autenticar.' }
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'Erro ao entrar.' }
        }
      },

      signUpWithEmail: async (email: string, pass: string, name?: string) => {
        const cleanEmail = email.trim()
        if (!supabase) {
          set({ isTrusted: true, userEmail: cleanEmail })
          useFitStore.getState().switchUserProfile(cleanEmail)
          return { ok: true }
        }

        try {
          const { data, error } = await supabase.auth.signUp({
            email: cleanEmail,
            password: pass,
            options: {
              data: {
                full_name: name?.trim() || '',
              },
            },
          })

          if (error) {
            return { ok: false, error: error.message }
          }

          if (data.session) {
            const userEmail = data.session.user.email || cleanEmail
            set({
              session: data.session,
              user: data.session.user,
              userEmail,
              isTrusted: true,
            })
            useFitStore.getState().switchUserProfile(userEmail)
          }

          return { ok: true }
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'Erro ao cadastrar.' }
        }
      },

      sendMagicLink: async (email: string) => {
        if (!supabase) {
          return { ok: false, error: 'Supabase não configurado.' }
        }

        try {
          const { error } = await supabase.auth.signInWithOtp({
            email: email.trim(),
            options: {
              emailRedirectTo: window.location.origin,
            },
          })

          if (error) return { ok: false, error: error.message }
          return { ok: true }
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : 'Erro ao enviar link.' }
        }
      },

      signOut: async () => {
        if (supabase) {
          try {
            await supabase.auth.signOut()
          } catch {}
        }
        useFitStore.getState().switchUserProfile(null)
        set({
          user: null,
          session: null,
          isTrusted: false,
          userEmail: null,
        })
      },

      verifyEmergencyCode: (code: string) => code.trim() === HERMES_CODE,

      trustThisDevice: (email?: string) => {
        const targetEmail = email || get().userEmail || 'welloliver@gmail.com'
        set({
          isTrusted: true,
          userEmail: targetEmail,
        })
        useFitStore.getState().switchUserProfile(targetEmail)
      },

      untrustThisDevice: () => {
        useFitStore.getState().switchUserProfile(null)
        set({
          isTrusted: false,
          user: null,
          session: null,
          userEmail: null,
        })
      },
    }),
    {
      name: 'act.auth.v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isTrusted: state.isTrusted,
        userEmail: state.userEmail,
      }),
    },
  ),
)