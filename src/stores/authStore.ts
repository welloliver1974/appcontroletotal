import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/** Demo verification code — in production this comes from the Hermes Agent (WhatsApp/Telegram). */
export const HERMES_CODE = '2468'

interface AuthState {
  isTrusted: boolean
  /** Returns true when the submitted code matches Hermes'. */
  verify: (code: string) => boolean
  trustThisDevice: () => void
  untrustThisDevice: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isTrusted: false,
      verify: (code) => code.trim() === HERMES_CODE,
      trustThisDevice: () => set({ isTrusted: true }),
      untrustThisDevice: () => set({ isTrusted: false }),
    }),
    { name: 'act.auth', storage: createJSONStorage(() => localStorage) },
  ),
)