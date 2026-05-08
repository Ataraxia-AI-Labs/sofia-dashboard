'use client'

import { NotebookPen } from 'lucide-react'
import { timeAgo } from '@/lib/api'
import type { StaffNote } from '@/types'

interface PatientNotesTabProps {
  notes: StaffNote[]
  onLaunchNote: () => void
}

export function PatientNotesTab({ notes, onLaunchNote }: PatientNotesTabProps) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider">Notas Clínicas</h4>
        <button
          onClick={onLaunchNote}
          title="Pídele a SofIA agregar la nota — ella valida el contenido antes de guardarla"
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-[11px] font-body font-semibold hover:bg-brand-purple/12 transition-colors"
        >
          <NotebookPen size={11} /> Agregar nota
        </button>
      </div>
      {notes.length > 0 ? (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {notes.map((n) => (
            <div key={n.id} className="bg-void/50 rounded-md px-3 py-2">
              <p className="text-xs font-body text-text-primary">{n.note_content}</p>
              <p className="text-[11px] font-body text-text-dim mt-1">{timeAgo(n.created_at)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[12px] font-body text-text-dim italic">
          Sin notas todavía. Pídele a SofIA &mdash; ella confirma el contenido antes de escribir.
        </p>
      )}
    </div>
  )
}
