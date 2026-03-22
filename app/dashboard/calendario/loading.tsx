import { Skeleton } from '@/components/ui/skeleton'

export default function CalendarioLoading() {
  return (
    <div className="max-w-[1400px] space-y-4 animate-sentient-breathe">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-32 mb-1.5" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
      {/* Calendar grid skeleton */}
      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 border-r border-border last:border-r-0" />
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 border-r border-b border-border last:border-r-0 p-2">
              <Skeleton className="h-4 w-6 mb-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
