export default function PipelineLoading() {
  return (
    <div className="space-y-4 animate-sentient-breathe">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 bg-surface-3 rounded-md w-44 mb-1.5" />
          <div className="h-4 bg-surface-3 rounded-md w-48" />
        </div>
        <div className="w-8 h-8 bg-surface-3 rounded-md" />
      </div>

      {/* Summary stage cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card p-3 border border-border">
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-md bg-surface-3" />
              <div className="h-5 bg-surface-3 rounded-md w-8" />
            </div>
            <div className="h-3 bg-surface-3 rounded-md w-20 mb-1" />
            <div className="h-3 bg-surface-3 rounded-md w-14" />
          </div>
        ))}
      </div>

      {/* Conversion flow bar */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-4 bg-surface-3 rounded-md w-36" />
        </div>
        <div className="flex items-center justify-between gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="h-3 bg-surface-3 rounded-md w-16" />
                  <div className="h-3 bg-surface-3 rounded-md w-6" />
                </div>
                <div className="h-2 bg-surface-3 rounded-full" />
              </div>
              {i < 5 && <div className="w-3 h-3 bg-surface-3 rounded-full mx-2 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card overflow-hidden border border-border">
            {/* Column header */}
            <div className="px-3 py-2.5 bg-surface-3/30 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-surface-3 rounded-md" />
                  <div className="h-3 bg-surface-3 rounded-md w-16" />
                </div>
                <div className="h-5 bg-surface-3 rounded-md w-6" />
              </div>
            </div>
            {/* Patient cards */}
            <div className="p-2 space-y-1.5">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="bg-surface-3/50 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-md bg-surface-3" />
                    <div className="h-3 bg-surface-3 rounded-md w-24" />
                  </div>
                  <div className="ml-8 space-y-1">
                    <div className="h-2 bg-surface-3 rounded-md w-20" />
                    <div className="h-2 bg-surface-3 rounded-md w-24" />
                    <div className="h-2 bg-surface-3 rounded-md w-14" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
