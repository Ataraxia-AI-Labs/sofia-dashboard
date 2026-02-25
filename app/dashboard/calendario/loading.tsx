export default function CalendarioLoading() {
  return (
    <div className="max-w-[1400px] space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 bg-surface-3 rounded w-32 mb-2" />
          <div className="h-4 bg-surface-3 rounded w-40" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 bg-surface-3 rounded-lg w-24" />
          <div className="h-8 bg-surface-3 rounded-lg w-20" />
          <div className="h-8 bg-surface-3 rounded-lg w-20" />
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
              <div className="h-4 bg-surface-3 rounded w-6 mb-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
