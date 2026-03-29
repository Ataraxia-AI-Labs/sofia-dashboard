import type { Metadata, Viewport } from 'next'
import { Outfit, JetBrains_Mono, Playfair_Display } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Providers } from '@/components/providers'
import { ErrorBoundary } from '@/components/error-boundary'
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
  title: 'SofIA — Nucleus | Ataraxia IA Labs',
  description: 'SofIA opera tu clinica 24/7. WhatsApp, voz, citas, cobros, oportunidades — todo autonomo. Tu clinica nunca duerme.',
  keywords: 'IA clinicas, chatbot dental, WhatsApp dental, asistente IA clinica, automatizacion clinicas, SofIA, Ataraxia, Nucleus',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SofIA',
  },
  manifest: '/manifest.json',
  openGraph: {
    title: 'SofIA — Tu clinica nunca duerme.',
    description: 'SofIA opera tu clinica 24/7. WhatsApp, voz, citas, cobros, oportunidades — todo autonomo.',
    siteName: 'SofIA / Ataraxia IA Labs',
    type: 'website',
    url: 'https://ataraxiaialabs.ai',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SofIA — Tu clinica nunca duerme.',
    description: 'IA autonoma para tu clinica. 24/7, sin humanos.',
  },
  other: {
    'facebook-domain-verification': 'l321wmcuefen0vbdkhj2fbflsdwqff',
  },
}

export const viewport: Viewport = {
  themeColor: '#8B5CF6',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className={`${outfit.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable}`} suppressHydrationWarning>
      <body className="min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
            <Analytics />
            <SpeedInsights />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
