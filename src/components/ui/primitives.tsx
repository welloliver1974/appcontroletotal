import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function IconTile({
  icon: Icon,
  className,
  size = 'md',
}: {
  icon: LucideIcon
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const box = {
    sm: 'h-7 w-7 rounded-lg',
    md: 'h-9 w-9 rounded-xl',
    lg: 'h-11 w-11 rounded-2xl',
    xl: 'h-14 w-14 rounded-2xl',
  }[size]
  const icon = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4.5 w-4.5',
    lg: 'h-5 w-5',
    xl: 'h-7 w-7',
  }[size]
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center border', box, className)}>
      <Icon className={icon} strokeWidth={2} />
    </span>
  )
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <span className={cn('chip', className)}>{children}</span>
}

export function SectionHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h2 className="truncate text-lg font-semibold text-zinc-100">{title}</h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}