export default function PacientesLoading() {
  return (
    <div className="max-w-[1400px] space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 bg-surface-3 rounded w-32 mb-2" />
          <div className="h-4 bg-surface-3 rounded w-48" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 bg-surface-3 rounded-lg w-64" />
          <div className="h-9 bg-surface-3 rounded-lg w-24" />
        </div>
      </div>
      {/* Table skeleton */}
      <div className="glass-card overflow-hidden">
        <div className="h-12 bg-surface-3/50 border-b border-border" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border/50 flex items-center px-5 gap-4">
            <div className="h-4 bg-surface-3 rounded w-40" />
            <div className="h-4 bg-surface-3 rounded w-28" />
            <div className="h-4 bg-surface-3 rounded w-20" />
            <div className="h-4 bg-surface-3 rounded w-24 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
