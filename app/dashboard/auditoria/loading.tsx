import { Skeleton } from '@/components/ui/skeleton'

export default function AuditoriaLoading() {
  return (
    <div className="space-y-3 animate-sentient-breathe">
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-3 w-32" />
      <div className="glass-card p-5">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}
