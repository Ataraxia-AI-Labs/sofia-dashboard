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
      {/* Header: title+description on the left, Guardar button breathing
          on the right via gap-6 + items-start (so the button hugs the
          title row instead of vertically centering against a 2-line
          description, which made it visually crash into the text). */}
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="text-xs font-body font-semibold text-text-primary">{t('title')}</h3>
          <p className="text-[12px] font-body text-text-muted leading-relaxed max-w-[60ch]">{t('description')}</p>
        </div>
        <div className="flex-shrink-0 pt-0.5">
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
