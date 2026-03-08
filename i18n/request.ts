import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async () => {
  // For now, default to Spanish. Later: read from user preferences or Accept-Language header.
  const locale = 'es'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
