'use client'

import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { setLocale } from '@/app/actions/set-locale'
import { Globe } from 'lucide-react'

const LOCALES = ['es', 'en', 'pt'] as const

export function LanguageSelector() {
  const t = useTranslations('language')
  const currentLocale = useLocale()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleChange = (locale: string) => {
    startTransition(async () => {
      await setLocale(locale)
      router.refresh()
    })
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Globe size={16} className="text-brand-purple" />
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{t('title')}</h3>
          <p className="text-xs text-text-dim mt-0.5">{t('description')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            onClick={() => handleChange(locale)}
            disabled={isPending}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors text-left ${
              currentLocale === locale
                ? 'bg-brand-purple/10 border-brand-purple/40 text-text-primary'
                : 'bg-surface-2 border-border text-text-muted hover:border-brand-purple/20 hover:text-text-primary'
            }`}
          >
            <span className="text-base">{locale === 'es' ? '🇪🇸' : locale === 'en' ? '🇬🇧' : '🇧🇷'}</span>
            <span className="text-sm font-medium">{t(`languages.${locale}`)}</span>
            {currentLocale === locale && (
              <span className="ml-auto w-2 h-2 rounded-full bg-brand-purple" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
