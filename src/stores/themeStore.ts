import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type ThemeId = 'midnight' | 'emerald' | 'obsidian' | 'rose'

export interface ThemeOption {
  id: ThemeId
  name: string
  description: string
  accentColor: string
  badgeColor: string
}

export const THEMES: ThemeOption[] = [
  {
    id: 'midnight',
    name: 'Midnight Indigo',
    description: 'Índigo profundo & roxo galáctico (padrão)',
    accentColor: 'bg-indigo-500',
    badgeColor: 'border-indigo-500/30 text-indigo-300 bg-indigo-500/10',
  },
  {
    id: 'emerald',
    name: 'Emerald Cyberpunk',
    description: 'Verde esmeralda & acentos neon de alta performance',
    accentColor: 'bg-emerald-500',
    badgeColor: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
  },
  {
    id: 'obsidian',
    name: 'Obsidian Minimal',
    description: 'Monocromático, carbono profundo & vidro fosco',
    accentColor: 'bg-zinc-100',
    badgeColor: 'border-zinc-500/30 text-zinc-200 bg-zinc-800/40',
  },
  {
    id: 'rose',
    name: 'Rose Gold',
    description: 'Tons de quartzo rosa, âmbar & estética acolhedora',
    accentColor: 'bg-rose-500',
    badgeColor: 'border-rose-500/30 text-rose-300 bg-rose-500/10',
  },
]

interface ThemeState {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
}

function applyThemeToDom(theme: ThemeId) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'midnight',
      setTheme: (theme) => {
        applyThemeToDom(theme)
        set({ theme })
      },
    }),
    {
      name: 'act.theme',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyThemeToDom(state.theme)
        }
      },
    },
  ),
)
