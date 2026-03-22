export default function CampanasLoading() {
  return (
    <div className="max-w-[1400px] space-y-4 animate-sentient-breathe">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 bg-surface-3 rounded-md w-48 mb-1.5" />
          <div className="h-4 bg-surface-3 rounded-md w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card p-4">
            <div className="h-5 bg-surface-3 rounded-md w-24 mb-2" />
            <div className="h-8 bg-surface-3 rounded-md w-20 mb-1.5" />
            <div className="h-3 bg-surface-3 rounded-md w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card p-4">
            <div className="h-5 bg-surface-3 rounded-md w-48 mb-2" />
            <div className="h-4 bg-surface-3 rounded-md w-72 mb-1.5" />
            <div className="h-3 bg-surface-3 rounded-md w-56" />
          </div>
        ))}
      </div>
    </div>
  )
}
