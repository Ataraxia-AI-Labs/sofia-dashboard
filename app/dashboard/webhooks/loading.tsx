import { Skeleton } from '@/components/ui/skeleton'

export default function WebhooksLoading() {
  return (
    <div className="space-y-3 animate-sentient-breathe">
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-3 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-3">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  )
}
