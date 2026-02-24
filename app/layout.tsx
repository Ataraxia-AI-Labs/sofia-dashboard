import type { Metadata, Viewport } from 'next'
import { Outfit, JetBrains_Mono, Playfair_Display } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SofIA Dashboard — Ataraxia IA Labs',
  description: 'Panel de control inteligente para tu clínica. Gestiona pacientes, citas, oportunidades y configuración de tu asistente IA.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'SofIA Dashboard',
    description: 'Gestión inteligente de clínicas con IA',
    siteName: 'Ataraxia IA Labs',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#8B5CF6',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`dark ${outfit.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable}`}>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
