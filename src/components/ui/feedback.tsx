import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-zinc-500">
          {icon}
        </span>
      )}
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description && <p className="max-w-xs text-xs text-zinc-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

export function ProgressBar({
  value,
  tone = 'emerald',
  className,
}: {
  value: number // 0..100
  tone?: 'emerald' | 'orange' | 'violet' | 'cyan'
  className?: string
}) {
  const tones = {
    emerald: 'bg-emerald-500',
    orange: 'bg-orange-500',
    violet: 'bg-violet-500',
    cyan: 'bg-cyan-500',
  }
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-zinc-800', className)}>
      <div
        className={cn('h-full rounded-full transition-all', tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}