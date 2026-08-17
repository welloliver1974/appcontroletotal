import { Check, Palette } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { THEMES, useThemeStore, type ThemeId } from '@/stores/themeStore'
import { cn } from '@/lib/utils'
import { toast } from '@/stores/toastStore'

export function SettingsTheme() {
  const { theme, setTheme } = useThemeStore()

  const handleSelect = (id: ThemeId, name: string) => {
    setTheme(id)
    toast.success(`Tema alterado para ${name} ✨`, { duration: 3000 })
  }

  return (
    <Card className="space-y-6 p-5">
      <div className="flex items-center gap-3">
        <Palette className="h-5 w-5 text-indigo-400" />
        <div>
          <h3 className="font-medium text-zinc-100">Personalização de Tema</h3>
          <p className="text-xs text-zinc-500">Escolha a atmosfera visual do Life OS Hub</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {THEMES.map((t) => {
          const isSelected = theme === t.id
          return (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id, t.name)}
              className={cn(
                'flex flex-col items-start p-4 rounded-xl border text-left transition-all',
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                  : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900',
              )}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn('h-3.5 w-3.5 rounded-full ring-2 ring-white/10', t.accentColor)} />
                  <span className="font-medium text-sm text-zinc-100">{t.name}</span>
                </div>
                {isSelected && <Check className="h-4 w-4 text-indigo-400" />}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">{t.description}</p>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
