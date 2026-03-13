import { Skeleton } from '@/components/ui/skeleton'

export default function AjustesLoading() {
  return (
    <div className="max-w-[1000px] space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-card p-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <Skeleton className="h-32" />
        </div>
      ))}
    </div>
  )
}
