'use client'

import { ThemeProvider } from 'next-themes'
import { ToastProvider } from '@/components/ui'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="brand" themes={['brand', 'dark', 'light']} disableTransitionOnChange={false}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  )
}
