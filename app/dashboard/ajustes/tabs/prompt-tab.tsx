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
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-body font-semibold text-text-primary">{t('title')}</h3>
          <p className="text-[12px] font-body text-text-dim mt-0.5">{t('description')}</p>
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
        className="w-full px-3 py-2.5 rounded-lg bg-void border border-border text-text-primary text-xs font-body leading-relaxed outline-none focus:border-brand-purple/40 resize-y"
        placeholder={t('placeholder')}
      />
      <div className="flex items-start gap-2 px-3 py-2 rounded-md bg-brand-purple/8 border border-brand-purple/15">
        <Shield size={14} className="text-brand-purple mt-0.5 flex-shrink-0" />
        <p className="text-[12px] font-body text-text-muted leading-relaxed">{t('securityNote')}</p>
      </div>
    </div>
  )
}
