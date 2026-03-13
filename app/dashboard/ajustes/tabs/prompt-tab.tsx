'use client'

import { Save, Shield } from 'lucide-react'
import { Button } from '@/components/ui'
import { useTranslations } from 'next-intl'

interface PromptTabProps {
  systemPrompt: string
  onChangePrompt: (value: string) => void
  onSave: () => void
  saving: boolean
  isReadOnly: boolean
  orgId: string
}

export function PromptTab({ systemPrompt, onChangePrompt, onSave, saving, isReadOnly }: PromptTabProps) {
  const t = useTranslations('prompt')
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">{t('title')}</h3>
          <p className="text-xs text-text-dim mt-0.5">{t('description')}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={onSave}
          disabled={saving || isReadOnly}
          loading={saving}
          icon={<Save size={13} />}
        >
          {t('save')}
        </Button>
      </div>
      <textarea
        value={systemPrompt}
        onChange={(e) => onChangePrompt(e.target.value)}
        rows={16}
        className="w-full px-4 py-3 rounded-xl bg-void border border-border text-text-primary text-sm font-mono leading-relaxed outline-none focus:border-brand-purple/40 resize-y"
        placeholder={t('placeholder')}
      />
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-brand-purple/5 border border-brand-purple/10">
        <Shield size={14} className="text-brand-purple mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-text-muted leading-relaxed">{t('securityNote')}</p>
      </div>
    </div>
  )
}

