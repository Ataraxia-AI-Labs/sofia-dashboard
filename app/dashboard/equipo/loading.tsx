export default function EquipoLoading() {
  return (
    <div className="max-w-[800px] space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 bg-surface-3 rounded w-32 animate-pulse" />
          <div className="h-3 bg-surface-3 rounded w-24 mt-2 animate-pulse" />
        </div>
        <div className="h-9 bg-surface-3 rounded-xl w-36 animate-pulse" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-3" />
            <div className="flex-1">
              <div className="h-4 bg-surface-3 rounded w-36 mb-2" />
              <div className="h-3 bg-surface-3 rounded w-48" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
