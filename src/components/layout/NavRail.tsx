import { NavLink } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'

/** Tablet (768–1024px): compact icon rail on the left. */
export function NavRail() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col items-center border-r border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl md:flex lg:hidden">
      <div className="flex h-16 items-center justify-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-2">
        {MODULES.map((m) => {
          const Icon = m.icon
          return (
            <NavLink
              key={m.id}
              to={m.path}
              title={m.label}
              className={({ isActive }) =>
                cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
                  isActive
                    ? cn(m.glow, m.text)
                    : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200',
                )
              }
            >
              <Icon className="h-5 w-5" />
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}