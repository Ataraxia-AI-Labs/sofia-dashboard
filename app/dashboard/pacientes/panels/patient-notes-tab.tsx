'use client'

import { timeAgo } from '@/lib/api'
import type { StaffNote } from '@/types'

interface PatientNotesTabProps {
  notes: StaffNote[]
  newNote: string
  onNewNoteChange: (value: string) => void
  onAddNote: () => void
  saving: boolean
}

export function PatientNotesTab({ notes, newNote, onNewNoteChange, onAddNote, saving }: PatientNotesTabProps) {
  return (
    <div className="glass-card p-4 space-y-3">
      <h4 className="text-xs font-body font-semibold text-text-muted uppercase tracking-wider">Notas Clinicas</h4>
      <div className="flex gap-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => onNewNoteChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddNote()}
          placeholder="Agregar nota..."
          className="flex-1 px-3 py-1.5 rounded-md bg-void border border-border text-text-primary text-xs font-body outline-none focus:border-brand-purple/40"
        />
        <button
          onClick={onAddNote}
          disabled={saving || !newNote.trim()}
          className="px-3 py-1.5 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-xs font-body font-semibold disabled:opacity-30"
        >
          {saving ? '...' : 'Agregar'}
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
        <p className="text-[13px] font-body text-text-dim">Sin notas aun. Agrega la primera.</p>
      )}
    </div>
  )
}
