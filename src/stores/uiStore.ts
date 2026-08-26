import { create } from 'zustand'

interface UiState {
  commandOpen: boolean
  quickAddOpen: boolean
  manualOpen: boolean
  settingsOpen: boolean
  setCommandOpen: (open: boolean) => void
  setQuickAddOpen: (open: boolean) => void
  setManualOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
}

/** Global UI state: command palette (Cmd+K), quick-add (Cmd+N), settings and user manual modals. */
export const useUiStore = create<UiState>((set) => ({
  commandOpen: false,
  quickAddOpen: false,
  manualOpen: false,
  settingsOpen: false,
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setQuickAddOpen: (quickAddOpen) => set({ quickAddOpen }),
  setManualOpen: (manualOpen) => set({ manualOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}))