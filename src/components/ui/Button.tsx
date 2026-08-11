import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'ghost' | 'soft' | 'danger'
type Size = 'sm' | 'md' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 active:scale-[0.98]',
  ghost: 'btn-ghost',
  soft: 'bg-white/5 text-zinc-200 hover:bg-white/10 active:scale-[0.98]',
  danger: 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 active:scale-[0.98]',
}

const sizes: Record<Size, string> = {
  sm: 'rounded-lg px-2.5 py-1.5 text-xs',
  md: 'rounded-xl px-3.5 py-2 text-sm',
  icon: 'rounded-xl p-2',
}

export function Button({
  variant = 'ghost',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}