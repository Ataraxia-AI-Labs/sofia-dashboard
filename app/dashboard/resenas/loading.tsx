import { Skeleton } from '@/components/ui/skeleton'

export default function ResenasLoading() {
  return (
    <div className="space-y-3 animate-sentient-breathe">
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-3 w-32" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-3">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <Skeleton className="h-4 w-40 mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
