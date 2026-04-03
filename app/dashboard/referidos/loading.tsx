import { Skeleton } from '@/components/ui/skeleton'

export default function ReferidosLoading() {
  return (
    <div className="space-y-3 animate-sentient-breathe">
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-3 w-32" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-3">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
      <div className="glass-card p-5">
        <Skeleton className="h-48" />
      </div>
    </div>
  )
}
