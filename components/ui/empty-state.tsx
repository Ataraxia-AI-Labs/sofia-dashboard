import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="glass-card p-8 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-lg bg-surface-3 border border-border flex items-center justify-center mx-auto mb-3">
          <Icon size={20} className="text-text-dim" />
        </div>
      )}
      <p className="text-text-muted text-sm font-body font-medium">{title}</p>
      {description && <p className="text-text-dim text-[12px] font-body mt-1.5 leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
