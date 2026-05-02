export default function DashboardLoading() {
  return (
    <div className="space-y-4 max-w-[1400px] animate-sentient-breathe">
      {/* Top metrics skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="w-10 h-10 rounded-lg bg-surface-3 mb-2" />
            <div className="h-7 bg-surface-3 rounded-lg w-20 mb-1.5" />
            <div className="h-4 bg-surface-3 rounded-lg w-28" />
          </div>
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="glass-card p-5 h-64" />
        <div className="glass-card p-5 h-64" />
      </div>
      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="glass-card p-5 h-56" />
        <div className="glass-card p-5 h-56" />
        <div className="glass-card p-5 h-56" />
      </div>
    </div>
  )
}
