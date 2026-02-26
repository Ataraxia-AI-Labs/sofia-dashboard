import type { Metadata, Viewport } from 'next'
import { Outfit, JetBrains_Mono, Playfair_Display } from 'next/font/google'
import { Providers } from '@/components/providers'
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
  title: 'SofIA by Ataraxia IA Labs — Asistente IA para Clinicas',
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
    title: 'SofIA — Tu clinica llena, sin levantar el telefono',
    description: 'Asistente IA que atiende pacientes 24/7 por WhatsApp. Agenda citas, cobra anticipos y detecta oportunidades automaticamente.',
    siteName: 'SofIA by Ataraxia IA Labs',
    type: 'website',
    url: 'https://ataraxiaialabs.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SofIA — Asistente IA para clinicas',
    description: 'Tu clinica llena. Sin levantar el telefono. Prueba gratis 7 dias.',
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
        </Providers>
      </body>
    </html>
  )
}
