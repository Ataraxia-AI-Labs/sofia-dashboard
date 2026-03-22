export default function EquipoLoading() {
  return (
    <div className="max-w-[800px] space-y-4 animate-sentient-breathe">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 bg-surface-3 rounded-md w-32" />
          <div className="h-3 bg-surface-3 rounded-md w-24 mt-1.5" />
        </div>
        <div className="h-9 bg-surface-3 rounded-lg w-36" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-3" />
            <div className="flex-1">
              <div className="h-4 bg-surface-3 rounded-md w-36 mb-1.5" />
              <div className="h-3 bg-surface-3 rounded-md w-48" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
