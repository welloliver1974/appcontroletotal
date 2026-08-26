import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MODULES } from '@/lib/modules'
import { cn } from '@/lib/utils'

/** Mobile (<768px): barra de navegação deslizável horizontalmente (scroll suave) com ícones maiores e toque confortável. */
export function BottomNav() {
  const location = useLocation()
  const navContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll suave para manter o item ativo sempre visível e confortável na tela
  useEffect(() => {
    if (!navContainerRef.current) return
    const activeEl = navContainerRef.current.querySelector<HTMLElement>('[data-active="true"]')
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      })
    }
  }, [location.pathname])

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 md:hidden w-full max-w-full overflow-hidden shadow-2xl shadow-black/60 backdrop-blur-2xl bg-zinc-950/90"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        ref={navContainerRef}
        className="flex items-center gap-1 overflow-x-auto no-scrollbar px-2 py-1.5 w-full scroll-smooth"
      >
        {MODULES.map((m) => {
          const Icon = m.icon
          const label = m.navLabel ?? m.label
          const isActive = location.pathname.startsWith(m.path)

          return (
            <NavLink
              key={m.id}
              to={m.path}
              data-active={isActive ? 'true' : 'false'}
              className={({ isActive: linkActive }) =>
                cn(
                  'relative flex flex-col items-center justify-center gap-1 rounded-2xl py-1.5 px-3 transition-all shrink-0 min-w-[62px]',
                  linkActive
                    ? cn(m.glow, 'text-zinc-50 font-semibold')
                    : 'text-zinc-400 hover:text-zinc-200 active:scale-95',
                )
              }
            >
              {({ isActive: linkActive }) => (
                <>
                  <span
                    className={cn(
                      'h-1 w-4 rounded-full transition-all duration-300',
                      linkActive ? cn(m.solid, 'opacity-100 scale-100') : 'bg-transparent opacity-0 scale-50',
                    )}
                  />
                  <div
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-xl transition-all',
                      linkActive ? cn(m.soft, 'scale-105 shadow-sm') : 'bg-transparent',
                    )}
                  >
                    <Icon className={cn('h-5 w-5 transition-colors', linkActive ? m.text : 'text-zinc-400')} />
                  </div>
                  <span className="text-[10px] sm:text-[11px] leading-tight truncate tracking-tight">
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}