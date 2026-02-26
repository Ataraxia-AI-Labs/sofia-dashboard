import clsx from 'clsx'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-status-success/10 text-status-success border-status-success/20',
  warning: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  danger: 'bg-status-danger/10 text-status-danger border-status-danger/20',
  info: 'bg-status-info/10 text-status-info border-status-info/20',
  purple: 'bg-brand-purple/10 text-brand-purple border-brand-purple/20',
  neutral: 'bg-surface-3 text-text-dim border-border',
}

export function Badge({ variant = 'neutral', children, className, dot }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border',
      variantStyles[variant],
      className,
    )}>
      {dot && (
        <span className={clsx(
          'w-1.5 h-1.5 rounded-full',
          variant === 'success' && 'bg-status-success',
          variant === 'warning' && 'bg-status-warning',
          variant === 'danger' && 'bg-status-danger',
          variant === 'info' && 'bg-status-info',
          variant === 'purple' && 'bg-brand-purple',
          variant === 'neutral' && 'bg-text-dim',
        )} />
      )}
      {children}
    </span>
  )
}
