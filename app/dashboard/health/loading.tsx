export default function HealthLoading() {
  return (
    <div className="space-y-6 max-w-7xl animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-3" />
          <div>
            <div className="h-6 bg-surface-3 rounded w-32 mb-2" />
            <div className="h-4 bg-surface-3 rounded w-52" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 bg-surface-3 rounded-lg w-36" />
          <div className="w-8 h-8 bg-surface-3 rounded-lg" />
        </div>
      </div>

      {/* Overall status card */}
      <div className="glass-card p-5 border-l-4 border-l-surface-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-surface-3 rounded" />
            <div>
              <div className="h-5 bg-surface-3 rounded w-28 mb-2" />
              <div className="h-3 bg-surface-3 rounded w-56" />
            </div>
          </div>
          <div className="text-right">
            <div className="h-3 bg-surface-3 rounded w-24 mb-2" />
            <div className="h-6 bg-surface-3 rounded w-10 ml-auto" />
          </div>
        </div>
      </div>

      {/* Circuit breaker cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-surface-3" />
                <div className="h-4 bg-surface-3 rounded w-20" />
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-surface-3 rounded" />
                <div className="h-3 bg-surface-3 rounded w-16" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="bg-void/50 rounded-lg p-2">
                  <div className="h-4 bg-surface-3 rounded w-8 mx-auto mb-1" />
                  <div className="h-2 bg-surface-3 rounded w-10 mx-auto" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* How it works card */}
      <div className="glass-card p-5">
        <div className="h-4 bg-surface-3 rounded w-56 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg bg-surface-3/20 border border-border text-center">
              <div className="w-5 h-5 bg-surface-3 rounded mx-auto mb-2" />
              <div className="h-3 bg-surface-3 rounded w-16 mx-auto mb-1" />
              <div className="h-2 bg-surface-3 rounded w-36 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
