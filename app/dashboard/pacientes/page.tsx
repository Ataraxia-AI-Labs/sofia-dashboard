'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { useToast } from '@/components/ui/toast'
import * as Sentry from '@sentry/nextjs'
import { fetchPatients, fetchPatientDetail, fetchPatientMLFeatures, fetchStaffNotes, fetchPatientTreatments, fetchPatientMedia, createPatient, updatePatient, createStaffNote, createTreatment, exportPatientsCSV, sendWhatsAppMessage, formatNumber, timeAgo } from '@/lib/api'
import type { Patient, PatientDetail, PatientMLFeatures, StaffNote, Treatment, PatientMedia } from '@/types'
import {
  Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  X, RefreshCw, Download, UserPlus
} from 'lucide-react'
import { NewPatientForm } from './panels/new-patient-form'
import { PatientDetailPanel } from './panels/patient-detail-panel'

const CHANNELS: Record<string, { label: string; color: string }> = {
  WHATSAPP: { label: 'WhatsApp', color: 'text-status-success' },
  INSTAGRAM: { label: 'Instagram', color: 'text-brand-purple' },
  MESSENGER: { label: 'Messenger', color: 'text-status-info' },
  WEB: { label: 'Web', color: 'text-status-warning' },
  VOICE_CALL: { label: 'Llamada', color: 'text-brand-cyan' },
  PRESENCIAL: { label: 'Presencial', color: 'text-brand-gold' },
}

const PAGE_SIZE = 20

export default function PacientesPage() {
  const { orgId, branchId } = useOrg()
  const toast = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null)
  const [mlFeatures, setMlFeatures] = useState<PatientMLFeatures | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ full_name: '', phone: '', email: '', city: '', service_interest: '' })
  const [staffNotes, setStaffNotes] = useState<StaffNote[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [editingPatient, setEditingPatient] = useState(false)
  const [editData, setEditData] = useState<Partial<PatientDetail>>({})
  const [patientMedia, setPatientMedia] = useState<PatientMedia[]>([])
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [waMessage, setWaMessage] = useState('')
  const [sendingWa, setSendingWa] = useState(false)
  const [showTreatmentForm, setShowTreatmentForm] = useState(false)
  const [newTreatment, setNewTreatment] = useState({ treatment_name: '', medication: '', dosage: '', frequency_hours: 8, start_date: '', end_date: '', notes: '' })
  const [detailTab, setDetailTab] = useState<'info' | 'ml' | 'notes' | 'media'>('info')

  // Escape key closes panels
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showWhatsApp) { setShowWhatsApp(false); return }
        if (showTreatmentForm) { setShowTreatmentForm(false); return }
        if (editingPatient) { setEditingPatient(false); return }
        if (showNewPatient) { setShowNewPatient(false); return }
        if (selectedPatient) { setSelectedPatient(null); return }
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [showWhatsApp, showTreatmentForm, editingPatient, showNewPatient, selectedPatient])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadPatients = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    try {
      const { patients: data, total: count } = await fetchPatients(orgId, {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        search: searchDebounced || undefined,
        orderBy: sortBy,
        orderDir: sortDir,
        branchId,
      })
      setPatients(data)
      setTotal(count)
    } catch (err) {
      Sentry.captureException(err)
      Sentry.captureException(err)
      toast.error('Error cargando pacientes')
    }
    setLoading(false)
  }, [orgId, page, searchDebounced, sortBy, sortDir, branchId])

  useEffect(() => { loadPatients() }, [loadPatients])
  useEffect(() => { setPage(0) }, [searchDebounced])

  const openDetail = async (patient: Patient) => {
    setSelectedPatient(patient as PatientDetail)
    setDetailLoading(true)
    setMlFeatures(null)
    setStaffNotes([])
    setTreatments([])
    setPatientMedia([])
    setEditingPatient(false)
    setNewNote('')
    setShowWhatsApp(false)
    setShowTreatmentForm(false)
    setDetailTab('info')
    try {
      const [detail, ml, notes, treats, media] = await Promise.allSettled([
        fetchPatientDetail(patient.id),
        fetchPatientMLFeatures(patient.id),
        fetchStaffNotes(patient.id),
        fetchPatientTreatments(patient.id),
        fetchPatientMedia(patient.id),
      ])
      if (detail.status === 'fulfilled') setSelectedPatient(detail.value)
      if (ml.status === 'fulfilled') setMlFeatures(ml.value)
      if (notes.status === 'fulfilled') setStaffNotes(notes.value)
      if (treats.status === 'fulfilled') setTreatments(treats.value)
      if (media.status === 'fulfilled') setPatientMedia(media.value)
    } catch (err) {
      Sentry.captureException(err)
      Sentry.captureException(err)
      toast.error('Error cargando detalle del paciente')
    }
    setDetailLoading(false)
  }

  const handleCreatePatient = async () => {
    if (!orgId || !newPatient.phone) return
    try {
      await createPatient(orgId, newPatient)
      setShowNewPatient(false)
      setNewPatient({ full_name: '', phone: '', email: '', city: '', service_interest: '' })
      loadPatients()
    } catch (err) {
      Sentry.captureException(err)
      Sentry.captureException(err)
      toast.error('Error creando paciente')
    }
  }

  const handleSavePatientEdit = async () => {
    if (!selectedPatient) return
    try {
      await updatePatient(selectedPatient.id, editData)
      setEditingPatient(false)
      openDetail(selectedPatient)
      loadPatients()
    } catch (err) {
      Sentry.captureException(err)
      Sentry.captureException(err)
      toast.error('Error guardando cambios del paciente')
    }
  }

  const handleAddNote = async () => {
    if (!selectedPatient || !newNote.trim()) return
    setSavingNote(true)
    try {
      await createStaffNote(selectedPatient.id, newNote.trim())
      setNewNote('')
      const notes = await fetchStaffNotes(selectedPatient.id)
      setStaffNotes(notes)
    } catch (err) {
      Sentry.captureException(err)
      Sentry.captureException(err)
      toast.error('Error guardando nota')
    }
    setSavingNote(false)
  }

  const handleSendWhatsApp = async () => {
    if (!selectedPatient || !waMessage.trim() || !orgId) return
    setSendingWa(true)
    try {
      await sendWhatsAppMessage(orgId, selectedPatient.phone, waMessage.trim())
      setWaMessage('')
      setShowWhatsApp(false)
    } catch (err) {
      Sentry.captureException(err)
      Sentry.captureException(err)
      toast.error('Error enviando mensaje de WhatsApp')
    }
    setSendingWa(false)
  }

  const handleCreateTreatment = async () => {
    if (!selectedPatient || !orgId || !newTreatment.treatment_name || !newTreatment.medication) return
    try {
      await createTreatment(orgId, { ...newTreatment, patient_id: selectedPatient.id })
      setShowTreatmentForm(false)
      setNewTreatment({ treatment_name: '', medication: '', dosage: '', frequency_hours: 8, start_date: '', end_date: '', notes: '' })
      const treats = await fetchPatientTreatments(selectedPatient.id)
      setTreatments(treats)
    } catch (err) {
      Sentry.captureException(err)
      Sentry.captureException(err)
      toast.error('Error creando tratamiento')
    }
  }

  const handleExport = async () => {
    if (!orgId) return
    try {
      await exportPatientsCSV(orgId)
    } catch (err) {
      Sentry.captureException(err)
      Sentry.captureException(err)
      toast.error('Error exportando CSV')
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ChevronDown size={12} className="text-text-dim" />
    return sortDir === 'desc'
      ? <ChevronDown size={12} className="text-brand-purple" />
      : <ChevronUp size={12} className="text-brand-purple" />
  }

  return (
    <div className="max-w-[1400px] space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Pacientes</h2>
          <p className="text-text-dim text-xs mt-0.5">{formatNumber(total)} registrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-text-muted text-xs font-semibold hover:text-text-primary transition-colors">
            <Download size={13} /> Exportar CSV
          </button>
          <button onClick={() => setShowNewPatient(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold hover:bg-brand-purple/25 transition-colors">
            <UserPlus size={13} /> Nuevo Paciente
          </button>
          <button onClick={loadPatients} aria-label="Actualizar" className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o telefono..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary text-sm placeholder:text-text-dim outline-none focus:border-brand-purple/40 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-primary">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* NEW PATIENT FORM */}
      {showNewPatient && (
        <NewPatientForm
          data={newPatient}
          onChange={setNewPatient}
          onSubmit={handleCreatePatient}
          onCancel={() => setShowNewPatient(false)}
        />
      )}

      {/* TABLE */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  { field: 'full_name', label: 'Paciente' },
                  { field: 'phone', label: 'Telefono' },
                  { field: 'acquisition_channel', label: 'Canal' },
                  { field: 'service_interest', label: 'Interes' },
                  { field: 'city', label: 'Ciudad' },
                  { field: 'created_at', label: 'Registro' },
                ].map((col) => (
                  <th
                    key={col.field}
                    onClick={() => toggleSort(col.field)}
                    className="text-left text-[11px] font-semibold text-text-muted uppercase tracking-wider px-5 py-3.5 cursor-pointer hover:text-text-primary transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.field} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && patients.length === 0 ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-4 bg-surface-3 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-text-dim text-sm">
                    {search ? 'No se encontraron pacientes con ese criterio' : 'Aun no hay pacientes registrados'}
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => openDetail(p)}
                    className="border-b border-border/50 hover:bg-surface-3/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20 border border-brand-purple/15 flex items-center justify-center text-brand-purple text-xs font-bold flex-shrink-0">
                          {p.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-sm font-medium text-text-primary group-hover:text-brand-purple-light transition-colors truncate max-w-[180px]">
                          {p.full_name || 'Sin nombre'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-text-secondary font-mono">{p.phone}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold ${CHANNELS[p.acquisition_channel]?.color || 'text-text-muted'}`}>
                        {CHANNELS[p.acquisition_channel]?.label || p.acquisition_channel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-text-muted truncate max-w-[140px] block">
                        {p.service_interest || '\u2014'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-text-muted">{p.city || '\u2014'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-text-dim">{timeAgo(p.created_at)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <span className="text-xs text-text-dim">
              {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                aria-label="Página anterior"
                className="w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                const pageNum = page < 3 ? i : page - 2 + i
                if (pageNum >= totalPages) return null
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      pageNum === page
                        ? 'bg-brand-purple/15 text-brand-purple border border-brand-purple/25'
                        : 'bg-surface-3 border border-border text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                aria-label="Página siguiente"
                className="w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL PANEL */}
      {selectedPatient && (
        <PatientDetailPanel
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          detailLoading={detailLoading}
          mlFeatures={mlFeatures}
          staffNotes={staffNotes}
          treatments={treatments}
          patientMedia={patientMedia}
          detailTab={detailTab}
          onTabChange={setDetailTab}
          editingPatient={editingPatient}
          onToggleEdit={() => { setEditingPatient(!editingPatient); setEditData({}) }}
          editData={editData}
          onEditChange={setEditData}
          onSaveEdit={handleSavePatientEdit}
          showWhatsApp={showWhatsApp}
          onToggleWhatsApp={() => setShowWhatsApp(!showWhatsApp)}
          waMessage={waMessage}
          onWaMessageChange={setWaMessage}
          onSendWhatsApp={handleSendWhatsApp}
          sendingWa={sendingWa}
          showTreatmentForm={showTreatmentForm}
          onToggleTreatment={() => setShowTreatmentForm(!showTreatmentForm)}
          newTreatment={newTreatment}
          onTreatmentChange={setNewTreatment}
          onCreateTreatment={handleCreateTreatment}
          newNote={newNote}
          onNewNoteChange={setNewNote}
          onAddNote={handleAddNote}
          savingNote={savingNote}
        />
      )}
    </div>
  )
}
