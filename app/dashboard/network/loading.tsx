export default function NetworkLoading() {
  return (
    <div className="max-w-[1400px] space-y-4 animate-sentient-breathe">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-3" />
        <div>
          <div className="h-6 bg-surface-3 rounded-lg w-48 mb-1" />
          <div className="h-4 bg-surface-3 rounded-lg w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card p-4">
            <div className="w-8 h-8 rounded-lg bg-surface-3 mb-1.5" />
            <div className="h-6 bg-surface-3 rounded-lg w-16 mb-1" />
            <div className="h-4 bg-surface-3 rounded-lg w-24" />
          </div>
        ))}
      </div>
      <div className="glass-card p-5">
        <div className="h-5 bg-surface-3 rounded-lg w-40 mb-3" />
        <div className="h-20 bg-surface-3 rounded-lg" />
      </div>
    </div>
  )
}
