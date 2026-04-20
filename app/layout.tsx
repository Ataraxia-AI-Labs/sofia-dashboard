import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Providers } from '@/components/providers'
import { ErrorBoundary } from '@/components/error-boundary'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

// Geist Sans + Geist Mono — single type family, dev-tool aesthetic

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
    title: 'SofIA — Tu clínica nunca duerme.',
    description: 'SofIA opera tu clínica 24/7. WhatsApp, voz, citas, cobros, oportunidades — todo autónomo.',
    siteName: 'SofIA / Ataraxia IA Labs',
    type: 'website',
    url: 'https://ataraxiaialabs.ai',
    images: [{ url: 'https://ataraxiaialabs.ai/og-image.png', width: 1200, height: 630, alt: 'SofIA — Ataraxia IA Labs' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SofIA — Tu clínica nunca duerme.',
    description: 'IA autónoma para tu clínica. 24/7, sin humanos.',
    images: ['https://ataraxiaialabs.ai/og-image.png'],
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
    <html lang={locale} className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
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
