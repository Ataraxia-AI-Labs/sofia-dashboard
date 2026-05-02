import { Skeleton } from '@/components/ui/skeleton'

export default function FacturacionLoading() {
  return (
    <div className="max-w-3xl space-y-4 animate-sentient-breathe">
      {/* Header */}
      <div>
        <Skeleton className="h-6 w-40 mb-1.5" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Subscription status card */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-5 w-32" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1.5">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Usage card */}
      <div className="glass-card p-5 space-y-3">
        <Skeleton className="h-5 w-32 mb-1.5" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="flex justify-between mb-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Invoices table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border/30">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="h-10 bg-surface-3/50 border-b border-border/30" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border/30 flex items-center px-4 gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20 ml-auto" />
            <Skeleton className="h-5 w-16 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
