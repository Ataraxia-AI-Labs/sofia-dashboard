export default function NetworkLoading() {
  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-surface-3 animate-pulse" />
        <div>
          <div className="h-6 bg-surface-3 rounded w-48 animate-pulse mb-1" />
          <div className="h-4 bg-surface-3 rounded w-64 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-surface-3 mb-2" />
            <div className="h-6 bg-surface-3 rounded w-16 mb-1" />
            <div className="h-4 bg-surface-3 rounded w-24" />
          </div>
        ))}
      </div>
      <div className="glass-card p-6 animate-pulse">
        <div className="h-5 bg-surface-3 rounded w-40 mb-4" />
        <div className="h-20 bg-surface-3 rounded" />
      </div>
    </div>
  )
}
