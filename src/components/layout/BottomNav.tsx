import { NavLink } from 'react-router-dom'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'

/** Mobile (<768px): glass bottom navigation bar with the 8 routes. */
export function BottomNav() {
  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 md:hidden w-full max-w-full overflow-hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-8 w-full">
        {MODULES.map((m) => {
          const Icon = m.icon
          const label = m.navLabel ?? m.label
          return (
            <NavLink
              key={m.id}
              to={m.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-1.5 text-[8px] sm:text-[9px] font-medium leading-none transition-colors min-w-0 px-0.5',
                  isActive ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-300',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('h-0.5 w-3.5 sm:w-4 rounded-full transition-colors mb-0.5', isActive ? m.solid : 'bg-transparent')} />
                  <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0', isActive ? m.text : '')} />
                  <span className="w-full text-center truncate">{label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}