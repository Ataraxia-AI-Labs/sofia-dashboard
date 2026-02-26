export default function PagosLoading() {
  return (
    <div className="space-y-6 max-w-7xl animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 bg-surface-3 rounded w-40 mb-2" />
          <div className="h-4 bg-surface-3 rounded w-28" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 bg-surface-3 rounded-lg w-40" />
          <div className="w-8 h-8 bg-surface-3 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-surface-3" />
              <div className="h-3 bg-surface-3 rounded w-20" />
            </div>
            <div className="h-7 bg-surface-3 rounded w-28 mb-1" />
            <div className="h-3 bg-surface-3 rounded w-16" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="glass-card overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-border">
          <div className="h-8 bg-surface-3 rounded-lg w-40" />
        </div>
        {/* Table header */}
        <div className="h-10 bg-surface-3/50 border-b border-border" />
        {/* Table rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border/50 flex items-center px-5 gap-4">
            <div className="h-4 bg-surface-3 rounded w-32" />
            <div className="h-4 bg-surface-3 rounded w-24" />
            <div className="h-4 bg-surface-3 rounded w-20 ml-auto" />
            <div className="h-5 bg-surface-3 rounded-full w-16" />
            <div className="h-4 bg-surface-3 rounded w-16" />
            <div className="h-4 bg-surface-3 rounded w-20" />
            <div className="h-4 bg-surface-3 rounded w-6" />
          </div>
        ))}
      </div>
    </div>
  )
}
