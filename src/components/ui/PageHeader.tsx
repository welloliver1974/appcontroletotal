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
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="flex min-w-0 items-center gap-3.5">
        <IconTile icon={Icon} size="lg" className={module.soft} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-50">{module.label}</h1>
            <span className="chip">{module.tag}</span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-500">{module.description}</p>
        </div>
      </div>
      {children && <div className="flex shrink-0 gap-2">{children}</div>}
    </div>
  )
}