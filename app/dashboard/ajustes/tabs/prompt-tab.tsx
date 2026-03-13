'use client'

import { useState } from 'react'
import { Save, Shield, Sparkles, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { generateSystemPrompt } from '@/lib/api'

interface PromptTabProps {
  systemPrompt: string
  onChangePrompt: (value: string) => void
  onSave: () => void
  saving: boolean
  isReadOnly: boolean
  orgId: string
}

export function PromptTab({ systemPrompt, onChangePrompt, onSave, saving, isReadOnly, orgId }: PromptTabProps) {
  const [generating, setGenerating] = useState(false)
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null)
  const [genInfo, setGenInfo] = useState<{ services: number; name: string } | null>(null)

  const handleGenerate = async () => {
    if (generating) return
    setGenerating(true)
    setGenInfo(null)
    try {
      // Save current prompt so user can revert
      setPreviousPrompt(systemPrompt)
      const result = await generateSystemPrompt(orgId)
      onChangePrompt(result.generated_prompt)
      setGenInfo({
        services: result.clinic_data.services_count,
        name: result.clinic_data.name,
      })
    } catch {
      setPreviousPrompt(null)
    }
    setGenerating(false)
  }

  const handleRevert = () => {
    if (previousPrompt != null) {
      onChangePrompt(previousPrompt)
      setPreviousPrompt(null)
      setGenInfo(null)
    }
  }

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">System Prompt de SofIA</h3>
          <p className="text-xs text-text-dim mt-0.5">
            Define la personalidad, tono, y reglas especificas de SofIA para esta clinica.
            Las instrucciones de seguridad (anti-diagnostico, anti-receta) son automaticas.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {previousPrompt != null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRevert}
              icon={<RotateCcw size={13} />}
            >
              Revertir
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={generating || isReadOnly}
            loading={generating}
            icon={<Sparkles size={13} />}
          >
            {generating ? 'Generando...' : 'Auto-generar'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onSave}
            disabled={saving || isReadOnly}
            loading={saving}
            icon={<Save size={13} />}
          >
            Guardar
          </Button>
        </div>
      </div>

      {/* Generation info banner */}
      {genInfo && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-cyan/5 border border-brand-cyan/15 animate-fade-in">
          <Sparkles size={12} className="text-brand-cyan flex-shrink-0" />
          <p className="text-[11px] text-text-muted">
            Prompt generado con IA usando datos de <span className="font-semibold text-text-primary">{genInfo.name}</span>
            {genInfo.services > 0 && <> ({genInfo.services} servicios)</>}.
            Revisa y ajusta antes de guardar.
          </p>
        </div>
      )}

      <textarea
        value={systemPrompt}
        onChange={(e) => onChangePrompt(e.target.value)}
        rows={16}
        className="w-full px-4 py-3 rounded-xl bg-void border border-border text-text-primary text-sm font-mono leading-relaxed outline-none focus:border-brand-purple/40 resize-y"
        placeholder="Eres Sofia, asistente virtual de la Clinica XYZ..."
      />
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-brand-purple/5 border border-brand-purple/10">
        <Shield size={14} className="text-brand-purple mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-text-muted leading-relaxed">
          Las reglas de seguridad (anti-diagnostico, anti-receta, anti-prompt-injection, protocolo de crisis,
          escalamiento a humano) estan hardcodeadas en el cerebro de SofIA y NO se pueden desactivar desde aqui.
        </p>
      </div>
    </div>
  )
}
