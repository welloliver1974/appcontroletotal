import { cn } from '@/lib/utils'

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props} />
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 border-b border-zinc-800/70 px-4 py-3.5', className)}>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-zinc-100">{title}</h3>
        {subtitle && <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}