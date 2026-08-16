import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number // auto-dismiss ms; Infinity = persist until closed
}

interface ToastState {
  toasts: Toast[]
  add: (toast: Omit<Toast, 'id'>) => string // returns id
  remove: (id: string) => void
}

/** Zustand store — NÃO persistido (notificações são efêmeras). */
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  add: (toast) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    if (toast.duration !== Infinity) {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), toast.duration ?? 5000)
    }
    return id
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Helper global — use anywhere: toast.success('Feito!'), toast.error('Falhou'). */
export const toast = {
  success: (msg: string, opts?: { duration?: number }) => useToastStore.getState().add({ type: 'success', message: msg, duration: opts?.duration }),
  error: (msg: string, opts?: { duration?: number }) => useToastStore.getState().add({ type: 'error', message: msg, duration: opts?.duration }),
  info: (msg: string, opts?: { duration?: number }) => useToastStore.getState().add({ type: 'info', message: msg, duration: opts?.duration }),
  warning: (msg: string, opts?: { duration?: number }) => useToastStore.getState().add({ type: 'warning', message: msg, duration: opts?.duration }),
}