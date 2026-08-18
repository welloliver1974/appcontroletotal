import { useNavigate } from 'react-router-dom'
import { MODULES, type ModuleId } from '@/lib/modules'
import { useUiStore } from '@/stores/uiStore'
import { Modal } from '@/components/ui/Modal'
import { IconTile } from '@/components/ui/primitives'
import { cn } from '@/lib/utils'

const VERBS: Record<ModuleId, string> = {
  dashboard: 'Novo atalho',
  'life-log': 'Nova anotação / fato',
  manutencao: 'Novo registro de ativo',
  despensa: 'Novo item na despensa',
  financas: 'Novo gasto / conta fixa',
  viagens: 'Nova viagem',
  agenda: 'Novo compromisso / email',
}

/** ⌘N — global quick add. Full per-module flows arrive with each module phase. */
export function QuickAddModal() {
  const open = useUiStore((s) => s.quickAddOpen)
  const setOpen = useUiStore((s) => s.setQuickAddOpen)
  const navigate = useNavigate()

  if (!open) return null

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Adição rápida" wide>
      <div className="grid gap-2 sm:grid-cols-2">
        {MODULES.map((m) => {
          const Icon = m.icon
          return (
            <button
              key={m.id}
              onClick={() => {
                setOpen(false)
                navigate(m.path)
              }}
              className={cn(
                'card card-hover group flex items-center gap-3 p-3 text-left',
              )}
            >
              <IconTile icon={Icon} className={cn(m.soft, 'transition-transform group-hover:scale-105')} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-zinc-100">{VERBS[m.id]}</span>
                <span className="block truncate text-xs text-zinc-500">{m.label}</span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Atalho <kbd className="rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">⌘N</kbd>{' '}
        — os fluxos completos (modais de cadastro) chegam junto de cada módulo.
      </p>
    </Modal>
  )
}