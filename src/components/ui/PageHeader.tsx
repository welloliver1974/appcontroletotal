import type { ReactNode } from 'react'
import type { ModuleDef } from '@/lib/modules'
import { cn } from '@/lib/utils'
import { IconTile } from './primitives'

export function PageHeader({
  module,
  children,
  className,
}: {
  module: ModuleDef
  children?: ReactNode
  className?: string
}) {
  const Icon = module.icon
  return (
    <div className={cn('flex items-center justify-between gap-3 w-full', className)}>
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
        <IconTile icon={Icon} size="md" className={cn(module.soft, 'h-9 w-9 sm:h-12 sm:w-12')} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <h1 className="text-base sm:text-xl font-bold tracking-tight text-zinc-50 truncate">{module.label}</h1>
            <span className="chip text-[10px] sm:text-xs py-0 sm:py-0.5 px-2">{module.tag}</span>
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-zinc-500 line-clamp-1 sm:line-clamp-none">{module.description}</p>
        </div>
      </div>
      {children && <div className="flex shrink-0 gap-1.5 sm:gap-2">{children}</div>}
    </div>
  )
}