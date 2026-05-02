export default function PagosLoading() {
  return (
    <div className="space-y-4 max-w-7xl animate-sentient-breathe">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 bg-surface-3 rounded-lg w-40 mb-1.5" />
          <div className="h-4 bg-surface-3 rounded-lg w-28" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 bg-surface-3 rounded-lg w-40" />
          <div className="w-8 h-8 bg-surface-3 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-lg bg-surface-3" />
              <div className="h-3 bg-surface-3 rounded-lg w-20" />
            </div>
            <div className="h-7 bg-surface-3 rounded-lg w-28 mb-1" />
            <div className="h-3 bg-surface-3 rounded-lg w-16" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="glass-card overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-border/30">
          <div className="h-8 bg-surface-3 rounded-lg w-40" />
        </div>
        {/* Table header */}
        <div className="h-10 bg-surface-3/50 border-b border-border/30" />
        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border/30 flex items-center px-4 gap-3">
            <div className="h-4 bg-surface-3 rounded-lg w-32" />
            <div className="h-4 bg-surface-3 rounded-lg w-24" />
            <div className="h-4 bg-surface-3 rounded-lg w-20 ml-auto" />
            <div className="h-5 bg-surface-3 rounded-lg w-16" />
            <div className="h-4 bg-surface-3 rounded-lg w-16" />
            <div className="h-4 bg-surface-3 rounded-lg w-20" />
            <div className="h-4 bg-surface-3 rounded-lg w-6" />
          </div>
        ))}
      </div>
    </div>
  )
}
