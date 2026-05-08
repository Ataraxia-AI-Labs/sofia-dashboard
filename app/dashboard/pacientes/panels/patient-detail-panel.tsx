'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Edit3, Send, Pill, NotebookPen } from 'lucide-react'
import { useOrg } from '@/lib/org-context'
import { PortalLinkGenerator } from '@/components/portal-link-generator'
import type { PatientDetail, PatientMLFeatures, StaffNote, Treatment } from '@/types'
import { PatientInfoTab } from './patient-info-tab'
import { PatientMLTab } from './patient-ml-tab'
import { PatientNotesTab } from './patient-notes-tab'
import { WhatsAppForm, EditPatientForm } from './patient-action-forms'

interface PatientDetailPanelProps {
  patient: PatientDetail
  onClose: () => void
  // Loading
  detailLoading: boolean
  // Data
  mlFeatures: PatientMLFeatures | null
  staffNotes: StaffNote[]
  treatments: Treatment[]
  // Tabs (S153: Media tab removed; Tratamiento + Nota now flow through SofIA console)
  detailTab: 'info' | 'ml' | 'notes'
  onTabChange: (tab: 'info' | 'ml' | 'notes') => void
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
}

export function PatientDetailPanel(props: PatientDetailPanelProps) {
  const { patient, onClose, detailLoading, detailTab, onTabChange } = props
  const { orgId } = useOrg()
  const router = useRouter()

  // Lock body scroll while panel is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // S153: Tratamiento + Nota migraron al SofIA Console. La intención del
  // operador se valida conversacionalmente (SofIA pide los campos
  // obligatorios faltantes) antes de escribir el tratamiento o la nota.
  // Pre-formamos el prompt con el nombre del paciente para que el cursor
  // quede listo en lo que el operador necesite agregar.
  const launchTreatment = () => {
    const ref = patient.full_name || patient.phone || 'el paciente'
    const prompt = `Crea un tratamiento para ${ref}: `
    router.push(`/dashboard?ask=${encodeURIComponent(prompt)}`)
  }
  const launchNote = () => {
    const ref = patient.full_name || patient.phone || 'el paciente'
    const prompt = `Anota lo siguiente para ${ref}: `
    router.push(`/dashboard?ask=${encodeURIComponent(prompt)}`)
  }

  const tabs = [
    { id: 'info' as const, label: 'Info' },
    { id: 'ml' as const, label: 'ML / IA' },
    { id: 'notes' as const, label: `Notas (${props.staffNotes.length})` },
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
              {(() => {
                // S148: hide auto-generated session ids (web_xxx, session_xxx)
                // — they were rendering as if they were the phone number,
                // which the operator can't dial. Show a friendly hint
                // instead so the visual stays informative.
                const phone = (patient.phone || '').trim()
                const isSessionId = /^web[_-]/i.test(phone) || /^session[_-]/i.test(phone)
                if (!phone) {
                  return <p className="text-xs text-text-dim italic font-body">Sin teléfono</p>
                }
                if (isSessionId) {
                  return <p className="text-xs text-text-dim italic font-body" title={phone}>Web Chat · sin teléfono</p>
                }
                return <p className="text-xs text-text-muted font-body">{phone}</p>
              })()}
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
          <button
            onClick={launchTreatment}
            title="Pídele a SofIA crear el tratamiento — ella valida los campos antes de escribir"
            className="px-2.5 py-1 rounded-md text-[12px] font-body font-semibold bg-surface-3 text-text-muted hover:bg-status-info/8 hover:border-status-info/15 hover:text-status-info border border-transparent transition-colors"
          >
            <Pill size={11} className="inline mr-1" />Tratamiento
          </button>
          <button
            onClick={launchNote}
            title="Pídele a SofIA agregar una nota — ella confirma el contenido antes de guardarla"
            className="px-2.5 py-1 rounded-md text-[12px] font-body font-semibold bg-surface-3 text-text-muted hover:bg-brand-purple/8 hover:border-brand-purple/15 hover:text-brand-purple border border-transparent transition-colors"
          >
            <NotebookPen size={11} className="inline mr-1" />Nota
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
                <PatientNotesTab notes={props.staffNotes} onLaunchNote={launchNote} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
