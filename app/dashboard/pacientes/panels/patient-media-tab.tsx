'use client'

import { Mic, FileText, Image as ImageIcon } from 'lucide-react'
import { timeAgo } from '@/lib/api'
import type { PatientMedia } from '@/types'

interface PatientMediaTabProps {
  media: PatientMedia[]
}

export function PatientMediaTab({ media }: PatientMediaTabProps) {
  return (
    <div className="glass-card p-4 space-y-3">
      <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider">Archivos Multimedia</h4>
      {media.length > 0 ? (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {media.map((m) => (
            <div key={m.id} className="bg-void/50 rounded-md px-3 py-2.5 flex items-start gap-3">
              <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                m.content_type === 'AUDIO' ? 'bg-status-info/10 text-status-info' :
                m.content_type === 'IMAGE' ? 'bg-brand-purple/10 text-brand-purple' :
                'bg-status-warning/10 text-status-warning'
              }`}>
                {m.content_type === 'AUDIO' ? <Mic size={14} /> :
                 m.content_type === 'IMAGE' ? <ImageIcon size={14} /> :
                 <FileText size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-body font-semibold text-text-primary">{m.content_type}</span>
                  <span className="text-[11px] font-body text-text-dim">{timeAgo(m.created_at)}</span>
                </div>
                {m.transcription && (
                  <p className="text-[11px] text-text-muted mt-1 line-clamp-3">&quot;{m.transcription}&quot;</p>
                )}
                {m.content_type === 'IMAGE' && m.raw_content && (
                  <p className="text-[11px] text-text-muted mt-1 line-clamp-2">{m.raw_content.replace('[El paciente envio una FOTO. Analisis visual]: ', '')}</p>
                )}
                {m.content_type === 'DOCUMENT' && (
                  <p className="text-[11px] text-text-muted mt-1">{m.raw_content || 'Documento recibido'}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] font-body text-text-dim">Este paciente no ha enviado audios, fotos ni documentos.</p>
      )}
    </div>
  )
}
