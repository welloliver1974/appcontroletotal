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
    <div className={cn('card card-hover p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        {soft ? (
          <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border', soft)}>
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        ) : (
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-zinc-400">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        )}
        {loading ? (
          <Skeleton className="h-4 w-12" />
        ) : (
          <span className="chip bg-white/[0.03]">{hint}</span>
        )}
      </div>
      {loading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-2xl font-bold tracking-tight text-zinc-50">{value}</p>
          <p className="mt-0.5 text-xs font-medium text-zinc-500">{label}</p>
        </div>
      )}
    </div>
  )
}