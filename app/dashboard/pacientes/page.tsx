'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchPatients, fetchPatientDetail, fetchPatientMLFeatures, fetchStaffNotes, fetchPatientTreatments, fetchPatientMedia, createPatient, updatePatient, createStaffNote, createTreatment, exportPatientsCSV, sendWhatsAppMessage, formatCOP, formatNumber, formatPercent, timeAgo } from '@/lib/api'
import type { Patient, PatientDetail, PatientMLFeatures, StaffNote, Treatment, PatientMedia } from '@/types'
import {
  Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Phone, Mail, MapPin, Calendar, TrendingUp, Brain, X, MessageSquare,
  DollarSign, Target, Clock, Activity, Heart, AlertTriangle, Star,
  RefreshCw, Download, UserPlus, Edit3, Send, Pill, FileText, Mic, Image as ImageIcon
} from 'lucide-react'

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
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [orgId, page, searchDebounced, sortBy, sortDir, branchId])

  useEffect(() => { loadPatients() }, [loadPatients])

  // Reset page on search change
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
      const [detail, ml, notes, treats, media] = await Promise.all([
        fetchPatientDetail(patient.id),
        fetchPatientMLFeatures(patient.id),
        fetchStaffNotes(patient.id),
        fetchPatientTreatments(patient.id),
        fetchPatientMedia(patient.id),
      ])
      setSelectedPatient(detail)
      setMlFeatures(ml)
      setStaffNotes(notes)
      setTreatments(treats)
      setPatientMedia(media)
    } catch (e) {
      console.error(e)
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
    } catch (e) {
      console.error(e)
    }
  }

  const handleSavePatientEdit = async () => {
    if (!selectedPatient) return
    try {
      await updatePatient(selectedPatient.id, editData)
      setEditingPatient(false)
      openDetail(selectedPatient)
      loadPatients()
    } catch (e) {
      console.error(e)
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
    } catch (e) {
      console.error(e)
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
    } catch (e) {
      console.error(e)
      alert('Error enviando mensaje. Verifica que el backend tenga el endpoint /dashboard/send-message')
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
    } catch (e) {
      console.error(e)
    }
  }

  const handleExport = async () => {
    if (!orgId) return
    try {
      await exportPatientsCSV(orgId)
    } catch (e) {
      console.error(e)
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

      {/* SEARCH + FILTERS */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono..."
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
        <div className="glass-card p-5 space-y-3 border-brand-purple/20 animate-fade-up">
          <h4 className="text-sm font-semibold text-text-primary">Registrar Paciente Presencial</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">Nombre completo *</label>
              <input type="text" value={newPatient.full_name} onChange={(e) => setNewPatient({ ...newPatient, full_name: e.target.value })} placeholder="María García" className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">Teléfono *</label>
              <input type="text" value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} placeholder="573001234567" className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">Email</label>
              <input type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })} placeholder="maria@email.com" className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">Ciudad</label>
              <input type="text" value={newPatient.city} onChange={(e) => setNewPatient({ ...newPatient, city: e.target.value })} placeholder="Bogotá" className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-text-dim uppercase mb-1">Interés de servicio</label>
            <input type="text" value={newPatient.service_interest} onChange={(e) => setNewPatient({ ...newPatient, service_interest: e.target.value })} placeholder="Limpieza dental" className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-sm outline-none focus:border-brand-purple/40" />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowNewPatient(false)} className="px-3 py-1.5 rounded-lg bg-surface-3 text-text-muted text-xs font-semibold">Cancelar</button>
            <button onClick={handleCreatePatient} disabled={!newPatient.phone} className="px-3 py-1.5 rounded-lg bg-brand-purple text-white text-xs font-semibold disabled:opacity-50">Registrar</button>
          </div>
        </div>
      )}

      {/* TABLE */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {[
                  { field: 'full_name', label: 'Paciente' },
                  { field: 'phone', label: 'Teléfono' },
                  { field: 'acquisition_channel', label: 'Canal' },
                  { field: 'service_interest', label: 'Interés' },
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
                    {search ? 'No se encontraron pacientes con ese criterio' : 'Aún no hay pacientes registrados'}
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
                        {p.service_interest || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-text-muted">{p.city || '—'}</span>
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
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
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
                className="w-8 h-8 rounded-lg bg-surface-3 border border-border flex items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== DETAIL PANEL (slide-over) ========== */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedPatient(null)} />
          
          {/* Panel */}
          <div className="relative w-full max-w-lg bg-surface border-l border-border overflow-y-auto animate-slide-in">
            {/* Header */}
            <div className="sticky top-0 bg-surface/90 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple to-brand-cyan flex items-center justify-center text-white font-bold">
                  {selectedPatient.full_name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text-primary">{selectedPatient.full_name || 'Sin nombre'}</h3>
                  <p className="text-xs text-text-muted font-mono">{selectedPatient.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPatient(null)} className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-1.5 px-6 py-2 border-b border-border bg-surface/50">
              <button onClick={() => { setEditingPatient(!editingPatient); setEditData({}) }} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${editingPatient ? 'bg-brand-purple/15 text-brand-purple' : 'bg-surface-3 text-text-muted hover:text-text-primary'}`}>
                <Edit3 size={11} className="inline mr-1" />Editar
              </button>
              <button onClick={() => setShowWhatsApp(!showWhatsApp)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${showWhatsApp ? 'bg-status-success/15 text-status-success' : 'bg-surface-3 text-text-muted hover:text-text-primary'}`}>
                <Send size={11} className="inline mr-1" />WhatsApp
              </button>
              <button onClick={() => setShowTreatmentForm(!showTreatmentForm)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors ${showTreatmentForm ? 'bg-status-info/15 text-status-info' : 'bg-surface-3 text-text-muted hover:text-text-primary'}`}>
                <Pill size={11} className="inline mr-1" />Tratamiento
              </button>
            </div>

            {/* Detail tabs */}
            <div className="flex gap-0 px-6 border-b border-border bg-surface/50">
              {[
                { id: 'info' as const, label: 'Info' },
                { id: 'ml' as const, label: 'ML / IA' },
                { id: 'notes' as const, label: `Notas (${staffNotes.length})` },
                { id: 'media' as const, label: `Media (${patientMedia.length})` },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setDetailTab(tab.id)} className={`px-3 py-2 text-[11px] font-semibold border-b-2 transition-colors ${detailTab === tab.id ? 'border-brand-purple text-brand-purple' : 'border-transparent text-text-dim hover:text-text-muted'}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 bg-surface-2 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {/* WhatsApp Send */}
                  {showWhatsApp && (
                    <div className="glass-card p-4 space-y-2 border-status-success/20">
                      <h4 className="text-xs font-semibold text-status-success">Enviar WhatsApp a {selectedPatient.full_name}</h4>
                      <textarea value={waMessage} onChange={(e) => setWaMessage(e.target.value)} rows={3} placeholder="Escribe un mensaje..." className="w-full px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-xs outline-none focus:border-status-success/40 resize-none" />
                      <div className="flex justify-end">
                        <button onClick={handleSendWhatsApp} disabled={sendingWa || !waMessage.trim()} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-status-success/15 text-status-success text-xs font-semibold disabled:opacity-30">
                          <Send size={11} /> {sendingWa ? 'Enviando...' : 'Enviar'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Treatment Form */}
                  {showTreatmentForm && (
                    <div className="glass-card p-4 space-y-2 border-status-info/20">
                      <h4 className="text-xs font-semibold text-status-info">Nuevo Tratamiento</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-[9px] text-text-dim uppercase mb-0.5">Tratamiento *</label><input type="text" value={newTreatment.treatment_name} onChange={(e) => setNewTreatment({...newTreatment, treatment_name: e.target.value})} placeholder="Post-operatorio" className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none" /></div>
                        <div><label className="block text-[9px] text-text-dim uppercase mb-0.5">Medicamento *</label><input type="text" value={newTreatment.medication} onChange={(e) => setNewTreatment({...newTreatment, medication: e.target.value})} placeholder="Ibuprofeno" className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none" /></div>
                        <div><label className="block text-[9px] text-text-dim uppercase mb-0.5">Dosis</label><input type="text" value={newTreatment.dosage} onChange={(e) => setNewTreatment({...newTreatment, dosage: e.target.value})} placeholder="400mg" className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none" /></div>
                        <div><label className="block text-[9px] text-text-dim uppercase mb-0.5">Cada (horas)</label><input type="number" value={newTreatment.frequency_hours} onChange={(e) => setNewTreatment({...newTreatment, frequency_hours: Number(e.target.value)})} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none" /></div>
                        <div><label className="block text-[9px] text-text-dim uppercase mb-0.5">Inicio</label><input type="date" value={newTreatment.start_date} onChange={(e) => setNewTreatment({...newTreatment, start_date: e.target.value})} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none" /></div>
                        <div><label className="block text-[9px] text-text-dim uppercase mb-0.5">Fin</label><input type="date" value={newTreatment.end_date} onChange={(e) => setNewTreatment({...newTreatment, end_date: e.target.value})} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none" /></div>
                      </div>
                      <input type="text" value={newTreatment.notes} onChange={(e) => setNewTreatment({...newTreatment, notes: e.target.value})} placeholder="Notas adicionales..." className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none" />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setShowTreatmentForm(false)} className="px-2.5 py-1 rounded-lg bg-surface-3 text-text-muted text-[10px]">Cancelar</button>
                        <button onClick={handleCreateTreatment} disabled={!newTreatment.treatment_name || !newTreatment.medication} className="px-2.5 py-1 rounded-lg bg-status-info/15 text-status-info text-[10px] font-semibold disabled:opacity-30">Crear Tratamiento</button>
                      </div>
                    </div>
                  )}

                  {/* Edit Patient */}
                  {editingPatient && (
                    <div className="glass-card p-4 space-y-2 border-brand-purple/20">
                      <h4 className="text-xs font-semibold text-brand-purple">Editar Paciente</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-[9px] text-text-dim uppercase mb-0.5">Nombre</label><input type="text" defaultValue={selectedPatient.full_name} onChange={(e) => setEditData({...editData, full_name: e.target.value})} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none" /></div>
                        <div><label className="block text-[9px] text-text-dim uppercase mb-0.5">Email</label><input type="email" defaultValue={selectedPatient.email || ''} onChange={(e) => setEditData({...editData, email: e.target.value})} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none" /></div>
                        <div><label className="block text-[9px] text-text-dim uppercase mb-0.5">Ciudad</label><input type="text" defaultValue={selectedPatient.city || ''} onChange={(e) => setEditData({...editData, city: e.target.value})} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none" /></div>
                        <div><label className="block text-[9px] text-text-dim uppercase mb-0.5">Interés</label><input type="text" defaultValue={selectedPatient.service_interest || ''} onChange={(e) => setEditData({...editData, service_interest: e.target.value})} className="w-full px-2 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none" /></div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingPatient(false)} className="px-2.5 py-1 rounded-lg bg-surface-3 text-text-muted text-[10px]">Cancelar</button>
                        <button onClick={handleSavePatientEdit} className="px-2.5 py-1 rounded-lg bg-brand-purple text-white text-[10px] font-semibold">Guardar</button>
                      </div>
                    </div>
                  )}

                  {/* TAB: INFO */}
                  {detailTab === 'info' && (
                    <>
                  {/* Contact Info */}
                  <div className="glass-card p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Información</h4>
                    <DetailRow icon={<Phone size={14} />} label="Teléfono" value={selectedPatient.phone} />
                    <DetailRow icon={<Mail size={14} />} label="Email" value={selectedPatient.email || '—'} />
                    <DetailRow icon={<MapPin size={14} />} label="Ciudad" value={selectedPatient.city || 'Por identificar'} />
                    <DetailRow icon={<Star size={14} />} label="Interés" value={selectedPatient.service_interest || 'Por identificar'} />
                    <DetailRow icon={<MessageSquare size={14} />} label="Canal" value={CHANNELS[selectedPatient.acquisition_channel]?.label || selectedPatient.acquisition_channel} />
                    <DetailRow icon={<Calendar size={14} />} label="Registro" value={new Date(selectedPatient.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })} />
                  </div>

                  {/* Psychometrics */}
                  {selectedPatient.psychometrics && (
                    <div className="glass-card p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Psicometría</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <MiniMetric label="Nivel de Confianza" value={formatPercent((selectedPatient.psychometrics.trust_level || 0) * 100)} color="text-status-success" />
                        <MiniMetric label="Riesgo de Churn" value={formatPercent((selectedPatient.psychometrics.churn_risk_score || 0) * 100)} color="text-status-danger" />
                        <MiniMetric label="Sensibilidad a Precio" value={formatPercent((selectedPatient.psychometrics.price_sensitivity || 0) * 100)} color="text-status-warning" />
                        <MiniMetric label="LTV Predicho" value={formatCOP(selectedPatient.psychometrics.lifetime_value_predicted || 0)} color="text-brand-purple" />
                      </div>
                    </div>
                  )}

                  {/* Treatments in Info tab */}
                  {treatments.length > 0 && (
                    <div className="glass-card p-4 space-y-3">
                      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Tratamientos Activos</h4>
                      {treatments.map((t) => (
                        <div key={t.id} className={`bg-void/50 rounded-lg px-3 py-2 ${t.status !== 'ACTIVE' ? 'opacity-50' : ''}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-text-primary">{t.treatment_name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${t.status === 'ACTIVE' ? 'bg-status-success/10 text-status-success' : 'bg-surface-3 text-text-dim'}`}>{t.status}</span>
                          </div>
                          <div className="text-[10px] text-text-muted mt-0.5">💊 {t.medication} — {t.dosage} — cada {t.frequency_hours}h</div>
                          <div className="text-[10px] text-text-dim mt-0.5">📅 {new Date(t.start_date).toLocaleDateString('es-CO')} → {new Date(t.end_date).toLocaleDateString('es-CO')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                    </>
                  )}

                  {/* TAB: ML / IA */}
                  {detailTab === 'ml' && (
                    <>
                  {/* ML Features */}
                  {mlFeatures && (
                    <div className="glass-card p-4 space-y-4">
                      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
                        <Brain size={12} className="text-brand-purple" />
                        ML Features
                      </h4>

                      {/* Engagement */}
                      <div>
                        <p className="text-[10px] text-text-dim uppercase tracking-wider mb-2">Engagement</p>
                        <div className="grid grid-cols-3 gap-2">
                          <MLStat label="Interacciones" value={mlFeatures.total_interactions} />
                          <MLStat label="Mensajes in" value={mlFeatures.total_inbound} />
                          <MLStat label="Mensajes out" value={mlFeatures.total_outbound} />
                          <MLStat label="Hora preferida" value={mlFeatures.preferred_hour != null ? `${mlFeatures.preferred_hour}:00` : '—'} />
                          <MLStat label="Día preferido" value={mlFeatures.preferred_day != null ? (['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][mlFeatures.preferred_day] || '—') : '—'} />
                          <MLStat label="Días sin contacto" value={mlFeatures.days_since_last_contact} />
                        </div>
                      </div>

                      {/* Appointments */}
                      <div>
                        <p className="text-[10px] text-text-dim uppercase tracking-wider mb-2">Citas</p>
                        <div className="grid grid-cols-3 gap-2">
                          <MLStat label="Total" value={mlFeatures.total_appointments} />
                          <MLStat label="Completadas" value={mlFeatures.completed_appointments} color="text-status-success" />
                          <MLStat label="Canceladas" value={mlFeatures.cancelled_appointments} color="text-status-danger" />
                          <MLStat label="No-Show" value={mlFeatures.no_show_appointments} color="text-status-warning" />
                          <MLStat label="Conversión" value={formatPercent((mlFeatures.conversion_rate ?? 0) * 100)} />
                          <MLStat label="Asistencia" value={formatPercent((mlFeatures.show_rate ?? 0) * 100)} />
                        </div>
                      </div>

                      {/* Revenue */}
                      <div>
                        <p className="text-[10px] text-text-dim uppercase tracking-wider mb-2">Revenue</p>
                        <div className="grid grid-cols-3 gap-2">
                          <MLStat label="Total" value={formatCOP(mlFeatures.total_revenue ?? 0)} color="text-status-success" />
                          <MLStat label="Transacciones" value={mlFeatures.total_transactions} />
                          <MLStat label="Ticket avg" value={formatCOP(mlFeatures.avg_transaction_value ?? 0)} />
                          <MLStat label="LTV" value={formatCOP(mlFeatures.lifetime_value ?? 0)} color="text-brand-purple" />
                        </div>
                      </div>

                      {/* Predictions */}
                      <div>
                        <p className="text-[10px] text-text-dim uppercase tracking-wider mb-2">Predicciones IA</p>
                        <div className="grid grid-cols-2 gap-2">
                          <PredictionBar label="Probabilidad Conversión" value={mlFeatures.conversion_probability ?? 0} color="bg-status-success" />
                          <PredictionBar label="Riesgo de Churn" value={mlFeatures.churn_probability ?? 0} color="bg-status-danger" />
                          <PredictionBar label="Riesgo No-Show" value={mlFeatures.no_show_probability ?? 0} color="bg-status-warning" />
                          <PredictionBar label="LTV Predicho" value={(mlFeatures.predicted_ltv ?? 0) > 0 ? Math.min((mlFeatures.predicted_ltv ?? 0) / 5000000, 1) : 0} color="bg-brand-purple" extra={formatCOP(mlFeatures.predicted_ltv ?? 0)} />
                        </div>
                      </div>

                      {/* Sentiment */}
                      <div>
                        <p className="text-[10px] text-text-dim uppercase tracking-wider mb-2">Sentiment</p>
                        <div className="grid grid-cols-3 gap-2">
                          <MLStat label="Promedio" value={mlFeatures.avg_sentiment?.toFixed(2)} color={(mlFeatures.avg_sentiment ?? 0) >= 0 ? 'text-status-success' : 'text-status-danger'} />
                          <MLStat label="Tendencia" value={mlFeatures.sentiment_trend?.toFixed(2)} color={(mlFeatures.sentiment_trend ?? 0) >= 0 ? 'text-status-success' : 'text-status-danger'} />
                          <MLStat label="Quejas" value={mlFeatures.complaint_count} color={(mlFeatures.complaint_count ?? 0) > 0 ? 'text-status-danger' : 'text-text-muted'} />
                        </div>
                      </div>

                      {/* Media usage */}
                      <div className="flex gap-2 flex-wrap">
                        {mlFeatures.has_sent_audio && <span className="badge badge-info">🎤 Audio</span>}
                        {mlFeatures.has_sent_image && <span className="badge badge-purple">📷 Imagen</span>}
                        {mlFeatures.has_sent_document && <span className="badge badge-warning">📄 Documento</span>}
                      </div>
                    </div>
                  )}
                    </>
                  )}

                  {/* TAB: NOTES */}
                  {detailTab === 'notes' && (
                  <div className="glass-card p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Notas Clínicas</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                        placeholder="Agregar nota..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-void border border-border text-text-primary text-xs outline-none focus:border-brand-purple/40"
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={savingNote || !newNote.trim()}
                        className="px-3 py-1.5 rounded-lg bg-brand-purple/15 text-brand-purple text-xs font-semibold disabled:opacity-30"
                      >
                        {savingNote ? '...' : 'Agregar'}
                      </button>
                    </div>
                    {staffNotes.length > 0 ? (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {staffNotes.map((n) => (
                          <div key={n.id} className="bg-void/50 rounded-lg px-3 py-2">
                            <p className="text-xs text-text-primary">{n.note_content}</p>
                            <p className="text-[9px] text-text-dim mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-text-dim">Sin notas aún. Agrega la primera.</p>
                    )}
                  </div>
                  )}

                  {/* TAB: MEDIA */}
                  {detailTab === 'media' && (
                  <div className="glass-card p-4 space-y-3">
                    <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Archivos Multimedia</h4>
                    {patientMedia.length > 0 ? (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {patientMedia.map((m) => (
                          <div key={m.id} className="bg-void/50 rounded-lg px-3 py-2.5 flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
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
                                <span className="text-[10px] font-semibold text-text-primary">{m.content_type}</span>
                                <span className="text-[9px] text-text-dim">{timeAgo(m.created_at)}</span>
                              </div>
                              {m.transcription && (
                                <p className="text-[11px] text-text-muted mt-1 line-clamp-3">🎤 "{m.transcription}"</p>
                              )}
                              {m.content_type === 'IMAGE' && m.raw_content && (
                                <p className="text-[11px] text-text-muted mt-1 line-clamp-2">👁 {m.raw_content.replace('[El paciente envió una FOTO. Análisis visual]: ', '')}</p>
                              )}
                              {m.content_type === 'DOCUMENT' && (
                                <p className="text-[11px] text-text-muted mt-1">📄 {m.raw_content || 'Documento recibido'}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-text-dim">Este paciente no ha enviado audios, fotos ni documentos.</p>
                    )}
                  </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-text-dim">{icon}</span>
      <span className="text-xs text-text-muted w-20 flex-shrink-0">{label}</span>
      <span className="text-sm text-text-primary truncate">{value}</span>
    </div>
  )
}

function MiniMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-3 rounded-lg px-3 py-2">
      <div className="text-[10px] text-text-dim mb-0.5">{label}</div>
      <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
    </div>
  )
}

function MLStat({ label, value, color }: { label: string; value: string | number | null | undefined; color?: string }) {
  return (
    <div className="bg-void/50 rounded-lg px-2.5 py-1.5">
      <div className="text-[9px] text-text-dim">{label}</div>
      <div className={`text-xs font-semibold font-mono ${color || 'text-text-primary'}`}>{value ?? '—'}</div>
    </div>
  )
}

function PredictionBar({ label, value, color, extra }: { label: string; value: number; color: string; extra?: string }) {
  const pct = Math.round((value || 0) * 100)
  return (
    <div className="bg-void/50 rounded-lg px-2.5 py-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[9px] text-text-dim">{label}</span>
        <span className="text-[10px] font-bold font-mono text-text-primary">{extra || `${pct}%`}</span>
      </div>
      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  )
}
