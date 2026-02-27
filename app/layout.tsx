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
  title: 'SofIA by Ataraxia IA Labs — IA para Clinicas de Estetica y Odontologia',
  description: 'SofIA es la IA especializada en clinicas de estetica y odontologia. Atiende pacientes 24/7 por WhatsApp, agenda citas, cobra anticipos y detecta oportunidades.',
  keywords: 'IA clinicas estetica, IA odontologia, chatbot dental, WhatsApp clinica estetica, asistente IA clinica, automatizacion clinicas, SofIA, Ataraxia',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/favicon.svg',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'SofIA — IA para Clinicas de Estetica y Odontologia',
    description: 'La IA especializada en clinicas de estetica y odontologia. Atiende pacientes 24/7 por WhatsApp, agenda citas y cobra anticipos.',
    siteName: 'SofIA by Ataraxia IA Labs',
    type: 'website',
    url: 'https://ataraxiaialabs.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SofIA — IA para Clinicas de Estetica y Odontologia',
    description: 'La IA especializada en estetica y odontologia. Prueba gratis 7 dias.',
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
