import { NavLink } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'

/** Desktop (≥1024px): full sidebar with labels, sync status at the bottom. */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="font-display truncate text-sm font-bold text-zinc-50">Life OS Hub</p>
          <p className="text-[11px] text-zinc-500">Hermes Assistant</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {MODULES.map((m) => {
          const Icon = m.icon
          return (
            <NavLink
              key={m.id}
              to={m.path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? cn(m.glow, 'text-zinc-50')
                    : 'text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-100',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'h-[18px] w-[18px] transition-colors',
                      isActive ? m.text : 'text-zinc-500 group-hover:text-zinc-300',
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{m.label}</span>
                  {isActive && <span className={cn('h-1.5 w-1.5 rounded-full', m.solid)} />}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-zinc-800/80 p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
          <span className="pulse-dot" />
          <div className="min-w-0 leading-tight">
            <p className="text-xs font-semibold text-zinc-200">Hermes Sync Active</p>
            <p className="text-[10px] text-zinc-500">Integrações online</p>
          </div>
        </div>
      </div>
    </aside>
  )
}