export default function PortalLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 animate-pulse" />
        <div className="h-4 bg-blue-100 rounded w-32 animate-pulse" />
        <div className="h-3 bg-blue-50 rounded w-48 animate-pulse" />
      </div>
    </div>
  )
}
