export default function CampanasLoading() {
  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 bg-surface-3 rounded w-48 animate-pulse mb-2" />
          <div className="h-4 bg-surface-3 rounded w-64 animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-5 bg-surface-3 rounded w-24 mb-3" />
            <div className="h-8 bg-surface-3 rounded w-20 mb-2" />
            <div className="h-3 bg-surface-3 rounded w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-5 bg-surface-3 rounded w-48 mb-3" />
            <div className="h-4 bg-surface-3 rounded w-72 mb-2" />
            <div className="h-3 bg-surface-3 rounded w-56" />
          </div>
        ))}
      </div>
    </div>
  )
}
