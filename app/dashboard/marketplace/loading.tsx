import { Skeleton } from '@/components/ui/skeleton'

export default function MarketplaceLoading() {
  return (
    <div className="space-y-3 animate-sentient-breathe">
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-3 w-32" />
      <div className="flex gap-4 border-b border-border pb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
