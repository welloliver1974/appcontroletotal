import { Search } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

/** Visual trigger for the Neural Omnibox — opens the command palette (⌘K). */
export function Omnibox({ className }: { className?: string }) {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen)
  return (
    <button
      onClick={() => setCommandOpen(true)}
      className={cn(
        'group flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3.5 py-2 text-left text-sm text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-900',
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-zinc-500 transition-colors group-hover:text-violet-400" />
      <span className="min-w-0 flex-1 truncate">
        Busca neural
        <span className="text-zinc-600"> — ex: "o que preciso trocar em casa?"</span>
      </span>
      <kbd className="hidden shrink-0 items-center rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline-flex">
        ⌘K
      </kbd>
    </button>
  )
}