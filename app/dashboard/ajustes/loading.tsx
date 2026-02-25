export default function AjustesLoading() {
  return (
    <div className="max-w-[1000px] space-y-4 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-card p-6">
          <div className="h-5 bg-surface-3 rounded w-40 mb-4" />
          <div className="h-32 bg-surface-3 rounded" />
        </div>
      ))}
    </div>
  )
}
