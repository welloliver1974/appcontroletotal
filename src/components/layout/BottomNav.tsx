import { NavLink } from 'react-router-dom'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'

/** Mobile (<768px): glass bottom navigation bar with the 7 routes. */
export function BottomNav() {
  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-7">
        {MODULES.map((m) => {
          const Icon = m.icon
          const label = m.navLabel ?? m.label
          return (
            <NavLink
              key={m.id}
              to={m.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2 text-[9px] font-medium leading-none transition-colors',
                  isActive ? 'text-zinc-50' : 'text-zinc-500 hover:text-zinc-300',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cn('h-0.5 w-6 rounded-full transition-colors', isActive ? m.solid : 'bg-transparent')} />
                  <Icon className={cn('h-[18px] w-[18px]', isActive ? m.text : '')} />
                  <span className="max-w-[52px] truncate">{label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}