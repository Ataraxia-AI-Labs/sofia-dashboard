import { Skeleton } from '@/components/ui/skeleton'

export default function AutomatizacionesLoading() {
  return (
    <div className="space-y-3 animate-sentient-breathe">
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-3 w-32" />
      <div className="flex gap-4 border-b border-border/30 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-3">
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="glass-card p-4">
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  )
}
