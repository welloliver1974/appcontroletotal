import type { LucideIcon } from 'lucide-react'
import { Skeleton } from './feedback'
import { cn } from '@/lib/utils'

export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  soft,
  loading = false,
  className,
}: {
  icon: LucideIcon
  label: string
  value: string
  hint?: string
  soft?: string // accent chip classes (bg/text/border)
  loading?: boolean
  className?: string
}) {
  return (
    <div className={cn('card card-hover p-3 sm:p-4 min-w-0', className)}>
      <div className="flex items-start justify-between gap-1.5 sm:gap-2">
        {soft ? (
          <span className={cn('inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl border', soft)}>
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
          </span>
        ) : (
          <span className="inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={2} />
          </span>
        )}
        {loading ? (
          <Skeleton className="h-4 w-10 sm:w-12" />
        ) : (
          <span className="chip bg-white/[0.03] text-[9px] sm:text-xs px-1.5 sm:px-2.5 py-0.5">{hint}</span>
        )}
      </div>
      {loading ? (
        <div className="mt-3 sm:mt-4 space-y-2">
          <Skeleton className="h-6 sm:h-7 w-16 sm:w-20" />
          <Skeleton className="h-3 w-20 sm:w-24" />
        </div>
      ) : (
        <div className="mt-3 sm:mt-4 min-w-0">
          <p className="font-display text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-zinc-50">{value}</p>
          <p className="mt-0.5 text-[10.5px] sm:text-xs font-medium text-zinc-500 line-clamp-1" title={label}>{label}</p>
        </div>
      )}
    </div>
  )
}