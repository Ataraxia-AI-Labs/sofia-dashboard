'use client'

import { useEffect } from 'react'
import { X, Edit3, Send, Pill } from 'lucide-react'
import { useOrg } from '@/lib/org-context'
import { PortalLinkGenerator } from '@/components/portal-link-generator'
import type { PatientDetail, PatientMLFeatures, StaffNote, Treatment, PatientMedia } from '@/types'
import { PatientInfoTab } from './patient-info-tab'
import { PatientMLTab } from './patient-ml-tab'
import { PatientNotesTab } from './patient-notes-tab'
import { PatientMediaTab } from './patient-media-tab'
import { WhatsAppForm, TreatmentForm, EditPatientForm } from './patient-action-forms'

interface PatientDetailPanelProps {
  patient: PatientDetail
  onClose: () => void
  // Loading
  detailLoading: boolean
  // Data
  mlFeatures: PatientMLFeatures | null
  staffNotes: StaffNote[]
  treatments: Treatment[]
  patientMedia: PatientMedia[]
  // Tabs
  detailTab: 'info' | 'ml' | 'notes' | 'media'
  onTabChange: (tab: 'info' | 'ml' | 'notes' | 'media') => void
  // Edit
  editingPatient: boolean
  onToggleEdit: () => void
  editData: Partial<PatientDetail>
  onEditChange: (data: Partial<PatientDetail>) => void
  onSaveEdit: () => void
  // WhatsApp
  showWhatsApp: boolean
  onToggleWhatsApp: () => void
  waMessage: string
  onWaMessageChange: (v: string) => void
  onSendWhatsApp: () => void
  sendingWa: boolean
  // Treatment
  showTreatmentForm: boolean
  onToggleTreatment: () => void
  newTreatment: { treatment_name: string; medication: string; dosage: string; frequency_hours: number; start_date: string; end_date: string; notes: string }
  onTreatmentChange: (data: PatientDetailPanelProps['newTreatment']) => void
  onCreateTreatment: () => void
  // Notes
  newNote: string
  onNewNoteChange: (v: string) => void
  onAddNote: () => void
  savingNote: boolean
}

export function PatientDetailPanel(props: PatientDetailPanelProps) {
  const { patient, onClose, detailLoading, detailTab, onTabChange } = props
  const { orgId } = useOrg()

  // Lock body scroll while panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const tabs = [
    { id: 'info' as const, label: 'Info' },
    { id: 'ml' as const, label: 'ML / IA' },
    { id: 'notes' as const, label: `Notas (${props.staffNotes.length})` },
    { id: 'media' as const, label: `Media (${props.patientMedia.length})` },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-surface border-l border-border overflow-y-auto animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-border/30 px-5 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple font-body font-bold">
              {patient.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h3 className="text-base font-mono font-semibold text-text-primary">{patient.full_name || 'Sin nombre'}</h3>
              <p className="text-xs text-text-muted font-body">{patient.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5 px-5 py-2 border-b border-border/30 bg-surface/50">
          <button onClick={props.onToggleEdit} className={`px-2.5 py-1 rounded-md text-[12px] font-body font-semibold transition-colors ${props.editingPatient ? 'bg-brand-purple/8 border border-brand-purple/15 text-brand-purple' : 'bg-surface-3 text-text-muted hover:text-text-primary'}`}>
            <Edit3 size={11} className="inline mr-1" />Editar
          </button>
          <button onClick={props.onToggleWhatsApp} className={`px-2.5 py-1 rounded-md text-[12px] font-body font-semibold transition-colors ${props.showWhatsApp ? 'bg-status-success/8 border border-status-success/15 text-status-success' : 'bg-surface-3 text-text-muted hover:text-text-primary'}`}>
            <Send size={11} className="inline mr-1" />WhatsApp
          </button>
          <button onClick={props.onToggleTreatment} className={`px-2.5 py-1 rounded-md text-[12px] font-body font-semibold transition-colors ${props.showTreatmentForm ? 'bg-status-info/8 border border-status-info/15 text-status-info' : 'bg-surface-3 text-text-muted hover:text-text-primary'}`}>
            <Pill size={11} className="inline mr-1" />Tratamiento
          </button>
          <PortalLinkGenerator orgId={orgId} patientId={patient.id} patientName={patient.full_name} compact />
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 px-5 border-b border-border/30 bg-surface/50">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => onTabChange(tab.id)} className={`px-3 py-2 text-[13px] font-body font-semibold border-b-2 transition-colors ${detailTab === tab.id ? 'border-brand-purple text-brand-purple' : 'border-transparent text-text-dim hover:text-text-muted'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-5">
          {detailLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-surface-2 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Action forms */}
              {props.showWhatsApp && (
                <WhatsAppForm
                  patient={patient}
                  message={props.waMessage}
                  onMessageChange={props.onWaMessageChange}
                  onSend={props.onSendWhatsApp}
                  sending={props.sendingWa}
                />
              )}
              {props.showTreatmentForm && (
                <TreatmentForm
                  data={props.newTreatment}
                  onChange={props.onTreatmentChange}
                  onSubmit={props.onCreateTreatment}
                  onCancel={props.onToggleTreatment}
                />
              )}
              {props.editingPatient && (
                <EditPatientForm
                  patient={patient}
                  editData={props.editData}
                  onEditChange={props.onEditChange}
                  onSave={props.onSaveEdit}
                  onCancel={props.onToggleEdit}
                />
              )}

              {/* Tab content */}
              {detailTab === 'info' && (
                <PatientInfoTab patient={patient} treatments={props.treatments} />
              )}
              {detailTab === 'ml' && (
                <PatientMLTab mlFeatures={props.mlFeatures} />
              )}
              {detailTab === 'notes' && (
                <PatientNotesTab
                  notes={props.staffNotes}
                  newNote={props.newNote}
                  onNewNoteChange={props.onNewNoteChange}
                  onAddNote={props.onAddNote}
                  saving={props.savingNote}
                />
              )}
              {detailTab === 'media' && (
                <PatientMediaTab media={props.patientMedia} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
