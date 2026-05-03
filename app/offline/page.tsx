// S133 PWA-004: offline fallback page rendered by the service worker
// when a navigation request can't reach the network and there's no
// cached match. Static markup only (no API calls) so the SW can serve
// it from cache without any runtime dependency on the network.

export const metadata = {
  title: 'Sin conexión · SofIA',
  description: 'No hay conexión a internet. SofIA sigue funcionando en modo limitado.',
}

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-void flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center">
        <div
          className="mx-auto w-12 h-12 rounded-lg flex items-center justify-center mb-4 border"
          style={{
            background: 'rgba(139, 92, 246, 0.08)',
            borderColor: 'rgba(139, 92, 246, 0.18)',
          }}
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand-purple"
          >
            <path d="M2 8.5a16 16 0 0 1 20 0" />
            <path d="M5 12.5a11 11 0 0 1 14 0" />
            <path d="M8.5 16.5a6 6 0 0 1 7 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        </div>
        <h1 className="text-lg font-display text-text-primary mb-2 tracking-tight">
          Sin conexión
        </h1>
        <p className="text-text-muted text-[13px] font-body leading-relaxed mb-5">
          SofIA sigue trabajando en segundo plano. En cuanto vuelva la red, los
          mensajes de tus pacientes y los reportes se sincronizan automáticamente.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-brand-purple text-white text-[13px] font-body font-semibold hover:bg-brand-purple-dark transition-colors active:scale-[0.97]"
        >
          Reintentar
        </a>
        <p className="text-text-dim text-[11px] font-body mt-4">
          Si el problema persiste, revisa tu conexión a internet o reinicia la app.
        </p>
      </div>
    </main>
  )
}
