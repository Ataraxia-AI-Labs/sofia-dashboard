export default function AuditLogsLoading() {
  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-6 w-32 bg-surface-3 rounded animate-pulse" />
          <div className="h-3 w-64 bg-surface-3 rounded animate-pulse" />
        </div>
        <div className="w-8 h-8 bg-surface-3 rounded-lg animate-pulse" />
      </div>
      <div className="glass-card p-4 h-20 animate-pulse" />
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border h-10 bg-surface-3/30 animate-pulse" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-border/50 flex gap-4">
            {[1, 2, 3, 4, 5, 6].map(j => (
              <div key={j} className="h-3 bg-surface-3 rounded animate-pulse flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
