'use client'

import { useEffect, useState, useCallback } from 'react'
import { getPatientMemories, getPatientPersonality, getPatientEmotions, getPatientSummary, getEmotionTrajectory } from '@/lib/api/conv-intel'
import type { PatientMemory, PersonalityProfile, EmotionProfile } from '@/lib/api/conv-intel'
import { Brain, Heart, User, Sparkles, BookOpen } from 'lucide-react'

interface Props {
  orgId: string
  patientId: string
  patientName?: string
}

const EMOTION_COLORS: Record<string, string> = {
  joy: 'text-brand-gold',
  trust: 'text-status-success',
  fear: 'text-brand-purple',
  surprise: 'text-brand-gold',
  sadness: 'text-status-info',
  disgust: 'text-status-danger',
  anger: 'text-status-danger',
  anticipation: 'text-brand-cyan',
}

export function ConvIntelligencePanel({ orgId, patientId, patientName }: Props) {
  const [memories, setMemories] = useState<PatientMemory[]>([])
  const [personality, setPersonality] = useState<PersonalityProfile | null>(null)
  const [emotions, setEmotions] = useState<EmotionProfile | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'summary' | 'emotions' | 'personality' | 'memories'>('summary')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [mem, per, emo, sum] = await Promise.all([
        getPatientMemories(orgId, patientId),
        getPatientPersonality(orgId, patientId),
        getPatientEmotions(orgId, patientId),
        getPatientSummary(orgId, patientId),
      ])
      setMemories(mem)
      setPersonality(per)
      setEmotions(emo)
      setSummary(sum?.summary || null)
    } catch { /* */ }
    setLoading(false)
  }, [orgId, patientId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="p-3 text-[10px] font-mono text-text-dim">...</div>

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-surface-2/50 px-3 py-2 border-b border-border">
        <p className="text-[10px] font-mono font-bold text-brand-purple flex items-center gap-1">
          <Brain size={12} /> Inteligencia Conversacional
        </p>
        {patientName && <p className="text-[9px] font-mono text-text-dim">{patientName}</p>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([
          { id: 'summary' as const, icon: BookOpen, label: 'Resumen' },
          { id: 'emotions' as const, icon: Heart, label: 'Emociones' },
          { id: 'personality' as const, icon: User, label: 'Personalidad' },
          { id: 'memories' as const, icon: Sparkles, label: `Memorias (${memories.length})` },
        ]).map(t => (
          <button key={t.id} onClick={() => setActiveSection(t.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[9px] font-mono border-b-2 transition-colors ${
              activeSection === t.id ? 'text-brand-purple border-brand-purple font-semibold' : 'text-text-dim border-transparent hover:text-text-muted'
            }`}><t.icon size={10} /> {t.label}</button>
        ))}
      </div>

      <div className="p-3 max-h-[300px] overflow-y-auto">
        {/* Summary */}
        {activeSection === 'summary' && (
          summary ? (
            <p className="text-[10px] font-mono text-text-secondary leading-relaxed">{summary}</p>
          ) : (
            <p className="text-[10px] font-mono text-text-dim">Sin resumen disponible</p>
          )
        )}

        {/* Emotions — Plutchik 8 */}
        {activeSection === 'emotions' && (
          emotions ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-mono text-text-dim">Dominante:</span>
                <span className={`text-[10px] font-mono font-bold ${EMOTION_COLORS[emotions.dominant_emotion] || 'text-text-primary'}`}>
                  {emotions.dominant_emotion}
                </span>
                <span className="text-[9px] font-mono text-text-dim">Estabilidad: {(emotions.emotional_stability * 100).toFixed(0)}%</span>
              </div>
              {Object.entries(emotions).filter(([k]) => k in EMOTION_COLORS).map(([emotion, score]) => (
                <div key={emotion} className="flex items-center gap-2">
                  <span className={`text-[9px] font-mono w-20 ${EMOTION_COLORS[emotion]}`}>{emotion}</span>
                  <div className="flex-1 h-1.5 bg-surface-2 rounded-full">
                    <div className="h-full bg-brand-purple/50 rounded-full transition-all" style={{ width: `${(score as number) * 100}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-text-dim w-8 text-right">{((score as number) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          ) : <p className="text-[10px] font-mono text-text-dim">Sin datos emocionales</p>
        )}

        {/* Personality — SofIA 6D */}
        {activeSection === 'personality' && (
          personality ? (
            <div className="space-y-2">
              {personality.communication_language && (
                <p className="text-[9px] font-mono text-text-dim mb-2">
                  Idioma: <span className="text-text-secondary font-semibold">{personality.communication_language.toUpperCase()}</span>
                  {personality.inferred_age_range && personality.inferred_age_range !== 'unknown' && (
                    <> | Rango: <span className="text-text-secondary font-semibold">{personality.inferred_age_range}</span></>
                  )}
                  {personality.total_calibration_interactions > 0 && (
                    <> | Calibrado: <span className="text-text-secondary font-semibold">{personality.total_calibration_interactions} msgs</span></>
                  )}
                </p>
              )}
              {([
                { key: 'formality_score', label: 'Formalidad' },
                { key: 'humor_tolerance', label: 'Humor' },
                { key: 'detail_preference', label: 'Detalle' },
                { key: 'emotional_support_need', label: 'Soporte Emocional' },
                { key: 'pace_preference', label: 'Ritmo' },
                { key: 'emoji_preference', label: 'Emojis' },
              ] as const).map(dim => (
                <div key={dim.key} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-text-muted w-28">{dim.label}</span>
                  <div className="flex-1 h-1.5 bg-surface-2 rounded-full">
                    <div className="h-full bg-brand-purple/60 rounded-full transition-all" style={{ width: `${((personality as unknown as Record<string, number>)[dim.key] || 0) * 100}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-text-dim w-8 text-right">{(((personality as unknown as Record<string, number>)[dim.key] || 0) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          ) : <p className="text-[10px] font-mono text-text-dim">Sin perfil de personalidad</p>
        )}

        {/* Memories */}
        {activeSection === 'memories' && (
          memories.length === 0 ? (
            <p className="text-[10px] font-mono text-text-dim">Sin memorias almacenadas</p>
          ) : (
            <div className="space-y-2">
              {memories.map(m => (
                <div key={m.id} className="border border-border/50 rounded p-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[8px] font-mono bg-surface-2 px-1.5 py-0.5 rounded text-text-dim uppercase">{m.category}</span>
                    <span className="text-[8px] font-mono text-text-dim">{m.source}</span>
                  </div>
                  <p className="text-[10px] font-mono text-text-secondary">{m.content}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
