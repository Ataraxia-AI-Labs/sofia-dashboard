'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { useToast } from '@/components/ui/toast'
import * as Sentry from '@sentry/nextjs'
import { fetchPatients, fetchPatientDetail, fetchPatientMLFeatures, fetchStaffNotes, fetchPatientTreatments, fetchPatientMedia, createPatient, updatePatient, createStaffNote, createTreatment, exportPatientsCSV, sendWhatsAppMessage, formatNumber, timeAgo } from '@/lib/api'
import type { Patient, PatientDetail, PatientMLFeatures, StaffNote, Treatment, PatientMedia } from '@/types'
import { useTranslations } from 'next-intl'
import {
  Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  X, RefreshCw, Download, UserPlus, Layers, GitMerge, TrendingUp, Trophy,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { NewPatientForm } from './panels/new-patient-form'
import { PatientDetailPanel } from './panels/patient-detail-panel'

const SegmentationPanel = dynamic(() => import('./segmentation-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const DuplicatesPanel = dynamic(() => import('./duplicates-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const LTVPanel = dynamic(() => import('./ltv-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const GamificationPanel = dynamic(() => import('./gamification-panel'), {
  ssr: false,
  loading: () => <div className="glass-card p-5 animate-pulse"><div className="h-48 bg-surface-3 rounded-lg" /></div>,
})

const CHANNEL_COLORS: Record<string, string> = {
  WHATSAPP: 'text-status-success',
  INSTAGRAM: 'text-brand-purple',
  MESSENGER: 'text-status-info',
  WEB: 'text-status-warning',
  VOICE_CALL: 'text-brand-cyan',
  PRESENCIAL: 'text-brand-gold',
  CALL: 'text-brand-cyan',
}

const PAGE_SIZE = 20

export default function PacientesPage() {
  const { orgId, branchId, role } = useOrg()
  const canExport = role === 'OWNER' || role === 'ADMIN'
  const toast = useToast()
  const t = useTranslations('patients')
  const tCommon = useTranslations('common')
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
  const [newPatient, setNewPatient] = useState({ full_name: '', phone: '', email: '', national_id: '', date_of_birth: '', city: '', service_interest: '' })
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
  const searchParams = useSearchParams()
  const initialView = ((): 'list' | 'segments' | 'duplicates' | 'ltv' | 'gamification' => {
    // Accept ?tab= for cross-page consistency and keep ?view= as legacy alias.
    const v = searchParams.get('tab') ?? searchParams.get('view')
    if (v === 'segments' || v === 'duplicates' || v === 'ltv' || v === 'gamification' || v === 'list') return v
    return 'list'
  })()
  const [activeView, setActiveView] = useState<'list' | 'segments' | 'duplicates' | 'ltv' | 'gamification'>(initialView)

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
      toast.error(t('loadError'))
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
      toast.error(t('detailError'))
    }
    setDetailLoading(false)
  }

  const handleCreatePatient = async () => {
    if (!orgId || !newPatient.phone) return
    try {
      await createPatient(orgId, newPatient)
      setShowNewPatient(false)
      setNewPatient({ full_name: '', phone: '', email: '', national_id: '', date_of_birth: '', city: '', service_interest: '' })
      loadPatients()
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('createError'))
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
      toast.error(t('saveError'))
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
      toast.error(t('noteError'))
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
      toast.error(t('whatsappError'))
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
      toast.error(t('treatmentError'))
    }
  }

  const handleExport = async () => {
    if (!orgId) return
    if (!canExport) {
      toast.error(t('exportForbidden'))
      return
    }
    try {
      await exportPatientsCSV(orgId)
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('exportError'))
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
    <div className="max-w-[1200px] space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">{t('title')}</h2>
          <p className="text-text-dim text-[11px] font-body mt-0.5">{t('registered', { count: formatNumber(total) })}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-2 rounded-lg border border-border p-0.5">
            <button
              onClick={() => setActiveView('list')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-body font-semibold transition-colors ${
                activeView === 'list' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              {t('views.list')}
            </button>
            <button
              onClick={() => setActiveView('segments')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-body font-semibold transition-colors flex items-center gap-1 ${
                activeView === 'segments' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <Layers size={11} />
              {t('views.segments')}
            </button>
            <button
              onClick={() => setActiveView('duplicates')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-body font-semibold transition-colors flex items-center gap-1 ${
                activeView === 'duplicates' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <GitMerge size={11} />
              {t('views.duplicates')}
            </button>
            <button
              onClick={() => setActiveView('ltv')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-body font-semibold transition-colors flex items-center gap-1 ${
                activeView === 'ltv' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <TrendingUp size={11} />
              {t('views.ltv')}
            </button>
            <button
              onClick={() => setActiveView('gamification')}
              className={`px-3 py-1.5 rounded-md text-[12px] font-body font-semibold transition-colors flex items-center gap-1 ${
                activeView === 'gamification' ? 'bg-brand-purple/15 text-brand-purple' : 'text-text-muted'
              }`}
            >
              <Trophy size={11} />
              {t('views.gamification')}
            </button>
          </div>
          {canExport && (
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-2 border border-border text-text-muted text-[12px] font-body font-semibold hover:text-text-primary transition-colors">
              <Download size={13} /> {t('exportCSV')}
            </button>
          )}
          <button onClick={() => setShowNewPatient(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-purple/15 text-brand-purple text-[12px] font-body font-semibold hover:bg-brand-purple/25 transition-colors">
            <UserPlus size={13} /> {t('newPatient')}
          </button>
          <button onClick={loadPatients} aria-label={tCommon('refresh')} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* SEGMENTS VIEW */}
      {activeView === 'segments' && (
        <SegmentationPanel orgId={orgId} />
      )}

      {/* DUPLICATES VIEW */}
      {activeView === 'duplicates' && (
        <DuplicatesPanel orgId={orgId} />
      )}

      {/* LTV VIEW */}
      {activeView === 'ltv' && (
        <LTVPanel orgId={orgId} />
      )}

      {/* GAMIFICATION VIEW */}
      {activeView === 'gamification' && (
        <GamificationPanel orgId={orgId} />
      )}

      {/* LIST VIEW — Search, table, detail below only when in list mode */}
      {activeView !== 'list' ? null : (
      <>
      {/* SEARCH */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 rounded-md bg-surface-2 border border-border text-text-primary text-[12px] font-body placeholder:text-text-dim outline-none focus:border-brand-purple/40 transition-colors"
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

      {/* TABLE — sentient-surface envelope + gradient dividers */}
      <div className="sentient-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0">
            <thead className="sentient-thead">
              <tr>
                {[
                  { field: 'full_name', label: t('patient') },
                  { field: 'phone', label: t('phone') },
                  { field: 'acquisition_channel', label: t('channel') },
                  { field: 'service_interest', label: t('interest') },
                  { field: 'city', label: t('city') },
                  { field: 'created_at', label: t('registration') },
                ].map((col) => (
                  <th
                    key={col.field}
                    onClick={() => toggleSort(col.field)}
                    className="text-left text-[10px] font-mono font-semibold text-text-muted uppercase tracking-[0.16em] px-4 py-3 cursor-pointer hover:text-brand-purple transition-colors select-none"
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
                  <tr key={i} className="sentient-row">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-3/50 rounded animate-pulse w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-text-dim text-[12px] font-body">
                    {search ? t('noResultsSearch') : t('noPatients')}
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => openDetail(p)}
                    className="sentient-row cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-brand-purple/8 border border-brand-purple/15 flex items-center justify-center text-brand-purple text-[12px] font-body font-bold flex-shrink-0">
                          {p.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-xs font-body font-medium text-text-primary group-hover:text-brand-purple-light transition-colors truncate max-w-[180px]">
                          {p.full_name || t('noName')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-text-secondary font-body">{p.phone}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[12px] font-body font-semibold ${CHANNEL_COLORS[p.acquisition_channel] || 'text-text-muted'}`}>
                        {t.has(`channels.${p.acquisition_channel}`) ? t(`channels.${p.acquisition_channel}`) : p.acquisition_channel}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-body text-text-muted truncate max-w-[140px] block">
                        {p.service_interest || '\u2014'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-body text-text-muted">{p.city || '\u2014'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-[11px] font-body text-text-dim">{timeAgo(p.created_at)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
            <span className="text-[11px] font-body text-text-dim">
              {page * PAGE_SIZE + 1}&ndash;{Math.min((page + 1) * PAGE_SIZE, total)} {t('ofTotal')} {total}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                aria-label="Página anterior"
                className="w-7 h-7 rounded-md bg-surface-3 border border-border flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                    className={`w-7 h-7 rounded-md text-[12px] font-body font-semibold transition-colors ${
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
                className="w-7 h-7 rounded-md bg-surface-3 border border-border flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      </>
      )}

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
