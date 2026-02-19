import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SofIA Dashboard — Ataraxia IA Labs',
  description: 'Panel de control inteligente para tu clínica',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
