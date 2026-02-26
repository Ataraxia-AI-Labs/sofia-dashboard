export default function DataLakeLoading() {
  return (
    <div className="space-y-6 max-w-7xl animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-3" />
          <div>
            <div className="h-6 bg-surface-3 rounded w-28 mb-2" />
            <div className="h-4 bg-surface-3 rounded w-48" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 bg-surface-3 rounded-lg w-52" />
          <div className="w-8 h-8 bg-surface-3 rounded-lg" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-surface-3" />
              <div className="h-3 bg-surface-3 rounded w-16" />
            </div>
            <div className="h-7 bg-surface-3 rounded w-16 mb-1" />
            <div className="h-3 bg-surface-3 rounded w-24" />
          </div>
        ))}
      </div>

      {/* Fine-tuning readiness card */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-surface-3 rounded w-36" />
          <div className="h-4 bg-surface-3 rounded w-32" />
        </div>
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <div className="h-3 bg-surface-3 rounded w-20" />
            <div className="h-3 bg-surface-3 rounded w-24" />
          </div>
          <div className="h-3 bg-surface-3 rounded-full w-full" />
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-surface-3/30 border border-border text-center">
              <div className="h-6 bg-surface-3 rounded w-12 mx-auto mb-1" />
              <div className="h-3 bg-surface-3 rounded w-20 mx-auto mb-1" />
              <div className="h-2 bg-surface-3 rounded w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart skeleton */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-surface-3 rounded w-48" />
          <div className="h-3 bg-surface-3 rounded w-16" />
        </div>
        <div className="h-48 bg-surface-3 rounded-lg" />
      </div>

      {/* Two-column bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <div className="h-4 bg-surface-3 rounded w-36 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <div className="h-3 bg-surface-3 rounded w-24" />
                  <div className="h-3 bg-surface-3 rounded w-10" />
                </div>
                <div className="h-2 bg-surface-3 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card p-5">
          <div className="h-4 bg-surface-3 rounded w-28 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-3" />
                <div className="flex-1">
                  <div className="h-3 bg-surface-3 rounded w-36 mb-1" />
                  <div className="h-4 bg-surface-3 rounded w-28" />
                </div>
                <div className="w-2 h-2 rounded-full bg-surface-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
