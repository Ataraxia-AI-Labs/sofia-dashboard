export default function TestLogoPage() {
  return (
    <div className="min-h-screen bg-void flex flex-col items-center justify-center gap-10 p-10">
      <div className="text-text-primary font-body text-sm">Logo extraído del Gemini SVG (685KB)</div>
      <img src="/ataraxia-logo-raw.svg" alt="Ataraxia logo raw" className="w-80 h-80 bg-void rounded-2xl" />
      <img src="/ataraxia-logo-raw.svg" alt="Ataraxia logo raw small" className="w-16 h-16" />
    </div>
  )
}
