'use client'

import { ThemeProvider } from 'next-themes'
import { ToastProvider } from '@/components/ui'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange={false}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  )
}
