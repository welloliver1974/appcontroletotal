import { create } from 'zustand'

interface UiState {
  commandOpen: boolean
  quickAddOpen: boolean
  setCommandOpen: (open: boolean) => void
  setQuickAddOpen: (open: boolean) => void
}

/** Global UI state: command palette (Cmd+K) and quick-add (Cmd+N) modals. */
export const useUiStore = create<UiState>((set) => ({
  commandOpen: false,
  quickAddOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setQuickAddOpen: (quickAddOpen) => set({ quickAddOpen }),
}))