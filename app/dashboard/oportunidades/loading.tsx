export default function OportunidadesLoading() {
  return (
    <div className="max-w-[1400px] space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 bg-surface-3 rounded w-36 mb-2" />
          <div className="h-4 bg-surface-3 rounded w-56" />
        </div>
        <div className="w-8 h-8 bg-surface-3 rounded-lg" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="w-9 h-9 rounded-xl bg-surface-3 mb-2.5" />
            <div className="h-7 bg-surface-3 rounded w-20 mb-1" />
            <div className="h-3 bg-surface-3 rounded w-28" />
          </div>
        ))}
      </div>

      {/* Filter: Status */}
      <div className="space-y-2">
        <div className="h-3 bg-surface-3 rounded w-12" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-surface-3 rounded-lg w-20" />
          ))}
        </div>
      </div>

      {/* Filter: Type */}
      <div className="space-y-2">
        <div className="h-3 bg-surface-3 rounded w-10" />
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 bg-surface-3 rounded-lg w-28" />
          ))}
        </div>
      </div>

      {/* Opportunity cards */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 flex-1">
                <div className="w-10 h-10 rounded-xl bg-surface-3 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-surface-3 rounded w-24" />
                    <div className="h-4 bg-surface-3 rounded-full w-16" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-3 bg-surface-3 rounded w-28" />
                    <div className="h-3 bg-surface-3 rounded w-24" />
                  </div>
                  <div className="h-3 bg-surface-3 rounded w-full max-w-sm" />
                  <div className="h-3 bg-surface-3 rounded w-20" />
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="h-3 bg-surface-3 rounded w-16" />
                <div className="h-6 bg-surface-3 rounded w-24" />
                <div className="flex gap-1.5">
                  <div className="h-6 bg-surface-3 rounded-lg w-16" />
                  <div className="h-6 bg-surface-3 rounded-lg w-18" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
