export default function APIKeysLoading() {
  return (
    <div className="max-w-[1200px] space-y-5 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-32 bg-surface-3 rounded-lg" />
          <div className="h-3.5 w-56 bg-surface-3 rounded" />
        </div>
        <div className="h-9 w-32 bg-surface-3 rounded-xl" />
      </div>
      {/* Filter skeleton */}
      <div className="h-8 w-56 bg-surface-3 rounded-lg" />
      {/* Table skeleton */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="h-4 w-40 bg-surface-3 rounded" />
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-4 flex items-center gap-4">
              <div className="h-4 w-40 bg-surface-3 rounded" />
              <div className="h-4 w-24 bg-surface-3 rounded" />
              <div className="h-4 w-28 bg-surface-3 rounded hidden md:block" />
              <div className="h-4 w-20 bg-surface-3 rounded hidden lg:block" />
              <div className="h-4 w-20 bg-surface-3 rounded hidden lg:block" />
              <div className="h-5 w-16 bg-surface-3 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
