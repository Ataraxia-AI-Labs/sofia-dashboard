import type { Metadata, Viewport } from 'next'
import { Outfit, JetBrains_Mono, Playfair_Display } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
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
  title: 'SofIA by Ataraxia IA Labs — Tu clinica opera sola',
  description: 'SofIA atiende pacientes 24/7 por WhatsApp, agenda citas, cobra anticipos y detecta oportunidades — automaticamente. Prueba gratis 7 dias.',
  keywords: 'IA clinicas, chatbot dental, WhatsApp dental, asistente IA clinica, automatizacion clinicas, SofIA, Ataraxia',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'SofIA — Tu clinica opera sola. Siempre.',
    description: 'Asistente IA que atiende pacientes 24/7 por WhatsApp. Agenda citas, cobra anticipos y detecta oportunidades automaticamente.',
    siteName: 'SofIA by Ataraxia IA Labs',
    type: 'website',
    url: 'https://ataraxiaialabs.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SofIA — Tu clinica opera sola. Siempre.',
    description: 'IA autonoma para tu clinica. 24/7, sin humanos. Prueba gratis 7 dias.',
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
        <Providers>
          {children}
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  )
}
