'use server'

import { cookies } from 'next/headers'

const SUPPORTED_LOCALES = ['es', 'en', 'pt'] as const
type Locale = (typeof SUPPORTED_LOCALES)[number]

function isValidLocale(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}

export async function setLocale(locale: string): Promise<void> {
  if (!isValidLocale(locale)) return
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })
}
