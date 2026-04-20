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
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Globe size={14} className="text-brand-purple" />
        <div>
          <h3 className="text-[13px] font-body font-semibold text-text-primary">{t('title')}</h3>
          <p className="text-[11px] font-body text-text-dim mt-0.5">{t('description')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {LOCALES.map((locale) => (
          <button
            key={locale}
            onClick={() => handleChange(locale)}
            disabled={isPending}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors text-left ${
              currentLocale === locale
                ? 'bg-brand-purple/8 border-brand-purple/20 text-text-primary'
                : 'bg-surface-2 border-border text-text-muted hover:border-brand-purple/15 hover:text-text-primary'
            }`}
          >
            <span className="text-sm">{locale === 'es' ? 'ES' : locale === 'en' ? 'EN' : 'PT'}</span>
            <span className="text-[12px] font-body">{t(`languages.${locale}`)}</span>
            {currentLocale === locale && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-purple" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
