import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  elevated?: boolean
  padding?: 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({ children, className, elevated, padding = 'md' }: CardProps) {
  return (
    <div className={clsx(
      elevated ? 'glass-card-elevated' : 'glass-card',
      paddingStyles[padding],
      className,
    )}>
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: number; label?: string }
  color?: string
}

export function StatCard({ label, value, icon, trend, color }: StatCardProps) {
  return (
    <Card className="metric-glow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-dim text-[12px] font-body font-medium">{label}</p>
          <p className={clsx('stat-number mt-1', color || 'text-text-primary')}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <p className={clsx(
              'text-xs mt-1 font-medium',
              trend.value >= 0 ? 'text-status-success' : 'text-status-danger',
            )}>
              {trend.value >= 0 ? '+' : ''}{trend.value}%
              {trend.label && <span className="text-text-dim ml-1">{trend.label}</span>}
            </p>
          )}
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-text-dim">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
