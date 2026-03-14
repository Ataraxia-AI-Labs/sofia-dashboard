import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

const SUPPORTED_LOCALES = ['es', 'en', 'pt'] as const
type Locale = (typeof SUPPORTED_LOCALES)[number]

function isValidLocale(locale: string): locale is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value ?? ''
  const locale: Locale = isValidLocale(cookieLocale) ? cookieLocale : 'es'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
