import { create } from 'zustand'

interface UiState {
  commandOpen: boolean
  quickAddOpen: boolean
  manualOpen: boolean
  setCommandOpen: (open: boolean) => void
  setQuickAddOpen: (open: boolean) => void
  setManualOpen: (open: boolean) => void
}

/** Global UI state: command palette (Cmd+K), quick-add (Cmd+N), and user manual modals. */
export const useUiStore = create<UiState>((set) => ({
  commandOpen: false,
  quickAddOpen: false,
  manualOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setQuickAddOpen: (quickAddOpen) => set({ quickAddOpen }),
  setManualOpen: (manualOpen) => set({ manualOpen }),
}))