export default function ConversacionesLoading() {
  return (
    <div className="max-w-[1400px] space-y-4 animate-sentient-breathe">
      <div className="flex items-center justify-between">
        <div className="h-6 bg-surface-3 rounded-md w-40" />
        <div className="flex gap-2">
          <div className="h-8 bg-surface-3 rounded-md w-32" />
          <div className="h-8 bg-surface-3 rounded-md w-24" />
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="glass-card p-4 flex gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-3 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 bg-surface-3 rounded-md w-48" />
            <div className="h-3 bg-surface-3 rounded-md w-full max-w-md" />
            <div className="h-3 bg-surface-3 rounded-md w-24" />
          </div>
        </div>
      ))}
    </div>
  )
}
