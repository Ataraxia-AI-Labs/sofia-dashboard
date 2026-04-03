import { Skeleton } from '@/components/ui/skeleton'

export default function ReportesLoading() {
  return (
    <div className="space-y-3 animate-sentient-breathe">
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-3 w-32" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-40" />
          </div>
        ))}
      </div>
    </div>
  )
}
