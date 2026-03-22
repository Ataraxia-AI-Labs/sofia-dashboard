export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-purple/10 animate-pulse" />
        <div className="h-3 bg-surface-2 rounded w-28 animate-pulse" />
        <div className="h-2.5 bg-surface-2 rounded w-40 animate-pulse" />
      </div>
    </div>
  )
}
