'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { useToast } from '@/components/ui/toast'
import * as Sentry from '@sentry/nextjs'
import { fetchPatients, fetchPatientDetail, fetchPatientMLFeatures, fetchStaffNotes, fetchPatientTreatments, updatePatient, exportPatientsCSV, sendWhatsAppMessage, formatNumber, timeAgo } from '@/lib/api'
import type { Patient, PatientDetail, PatientMLFeatures, StaffNote, Treatment } from '@/types'
import { useTranslations } from 'next-intl'
import {
  Search, ChevronDown, ChevronUp, ChevronsUpDown, ChevronLeft, ChevronRight,
  X, RefreshCw, Download, UserPlus, Layers, GitMerge, TrendingUp, Trophy,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
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

// S146: aligned with the global S144 channel palette so every channel
// renders in its own hue (was: WhatsApp+Messenger green, the rest fell
// back to text-text-muted). Also covers a few legacy values that show
// up in older patient rows (MANUAL = staff manually created, CALL =
// pre-Vapi voice rows, WEB_CHAT = early widget capitalization).
const CHANNEL_COLORS: Record<string, string> = {
  WHATSAPP:   'text-status-success',  // mint green
  INSTAGRAM:  'text-brand-purple',    // violet
  MESSENGER:  'text-brand-cyan',      // cyan (S144)
  WEB:        'text-status-info',     // blue (S144)
  WEB_CHAT:   'text-status-info',
  WEBCHAT:    'text-status-info',
  VOICE_CALL: 'text-brand-gold',      // gold (matches Voz badge globally)
  VOICE:      'text-brand-gold',
  CALL:       'text-brand-gold',
  PRESENCIAL: 'text-text-muted',      // walk-in / created at front desk
  MANUAL:     'text-text-muted',      // staff-created via dashboard
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
  const [staffNotes, setStaffNotes] = useState<StaffNote[]>([])
  const [treatments, setTreatments] = useState<Treatment[]>([])
  const [editingPatient, setEditingPatient] = useState(false)
  const [editData, setEditData] = useState<Partial<PatientDetail>>({})
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [waMessage, setWaMessage] = useState('')
  const [sendingWa, setSendingWa] = useState(false)
  const [detailTab, setDetailTab] = useState<'info' | 'ml' | 'notes'>('info')
  const searchParams = useSearchParams()
  const router = useRouter()
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
        if (editingPatient) { setEditingPatient(false); return }
        if (selectedPatient) { setSelectedPatient(null); return }
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [showWhatsApp, editingPatient, selectedPatient])

  // S154: handleCreatePatient + state local muerto removidos —
  // crear paciente migra al SofIA Console via tool create_patient
  // (status: 'live + hot' en tool-registry). Botón abajo dispara
  // navegación con prompt prellenado.
  const launchNewPatient = () => {
    router.push(`/dashboard?ask=${encodeURIComponent('Crea un paciente nuevo: ')}`)
  }

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
    setEditingPatient(false)
    setShowWhatsApp(false)
    setDetailTab('info')
    try {
      const [detail, ml, notes, treats] = await Promise.allSettled([
        fetchPatientDetail(patient.id),
        fetchPatientMLFeatures(patient.id),
        fetchStaffNotes(patient.id),
        fetchPatientTreatments(patient.id),
      ])
      if (detail.status === 'fulfilled') setSelectedPatient(detail.value)
      if (ml.status === 'fulfilled') setMlFeatures(ml.value)
      if (notes.status === 'fulfilled') setStaffNotes(notes.value)
      if (treats.status === 'fulfilled') setTreatments(treats.value)
      // S154: Promise.allSettled NUNCA throws, así que el catch abajo era
      // dead code. Reportamos cada rechazo individual a Sentry para
      // diagnóstico, y mostramos toast sólo si el detalle del paciente
      // no cargó (lo más visible — el panel se abre vacío).
      const rejections = [detail, ml, notes, treats].filter(p => p.status === 'rejected') as PromiseRejectedResult[]
      rejections.forEach(p => Sentry.captureException(p.reason, { tags: { context: 'patient_detail_load' } }))
      if (detail.status === 'rejected') {
        toast.error(t('detailError'))
      }
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('detailError'))
    }
    setDetailLoading(false)
  }

  const handleSavePatientEdit = async () => {
    if (!selectedPatient) return
    try {
      await updatePatient(selectedPatient.id, editData)
      setEditingPatient(false)
      // S154: openDetail + loadPatients eran fire-and-forget — la edición
      // confirmaba pero la tabla y el panel quedaban con datos stale por
      // unos cientos de ms. Encadenamos await para que el operador vea
      // la versión actualizada inmediatamente.
      await openDetail(selectedPatient)
      await loadPatients()
    } catch (err) {
      Sentry.captureException(err)
      toast.error(t('saveError'))
    }
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

  // S146: explicit asc/desc indicators when active, neutral up-down icon
  // when inactive (so users know the column is sortable but isn't sorting
  // right now — chevron-down alone read as "this column is desc-sorted").
  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) {
      return <ChevronsUpDown size={11} className="text-text-dim/60" aria-hidden="true" />
    }
    return sortDir === 'desc'
      ? <ChevronDown size={12} className="text-brand-purple" aria-hidden="true" />
      : <ChevronUp size={12} className="text-brand-purple" aria-hidden="true" />
  }

  // Hide auto-generated session ids in the phone column. Web Chat sessions
  // come in as "web_emergency1775727757" and similar — those are not real
  // phone numbers and reading them in the table makes the column noise.
  const formatPhone = (phone: string | null | undefined): string => {
    if (!phone) return '—'
    if (/^web[_-]/i.test(phone) || /^session[_-]/i.test(phone)) return '—'
    return phone
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
          {/* S147: Exportar CSV solo aplica al listado (filtros + paginación
              corresponden a la vista Lista). En las otras vistas
              (Segmentos / Duplicados / LTV / Gamificación) los datos no
              corresponden 1:1 con el endpoint patients/export, así que
              ocultamos el botón para no confundir al operador. */}
          {canExport && activeView === 'list' && (
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface-2 border border-border text-text-muted text-[12px] font-body font-semibold hover:text-text-primary transition-colors">
              <Download size={13} /> {t('exportCSV')}
            </button>
          )}
          {/* S154: launcher al SofIA Console. La creación pasa por la consola
              (tool create_patient) — SofIA pide los campos faltantes
              conversacionalmente antes de escribir el registro. */}
          {activeView === 'list' && (
            <button
              onClick={launchNewPatient}
              title="Pídele a SofIA crear el paciente — ella valida los campos antes de escribir"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-[12px] font-body font-semibold hover:bg-brand-purple/12 transition-colors"
            >
              <UserPlus size={13} /> {t('newPatient')}
            </button>
          )}
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
                ].map((col) => {
                  const isActive = sortBy === col.field
                  const ariaSort = isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'
                  return (
                    <th
                      key={col.field}
                      scope="col"
                      aria-sort={ariaSort}
                      onClick={() => toggleSort(col.field)}
                      className={`text-left text-[10px] font-mono font-semibold uppercase tracking-[0.16em] px-4 py-3 cursor-pointer hover:text-brand-purple transition-colors select-none ${
                        isActive ? 'text-brand-purple' : 'text-text-muted'
                      }`}
                      title={isActive
                        ? `Ordenado por ${col.label.toLowerCase()} (${sortDir === 'asc' ? 'ascendente' : 'descendente'}). Click para invertir.`
                        : `Click para ordenar por ${col.label.toLowerCase()}.`
                      }
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        <SortIcon field={col.field} />
                      </div>
                    </th>
                  )
                })}
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
                      {(() => {
                        // S146: dim the avatar + label when the patient has no
                        // real name. The grid was full of identical "Por
                        // identificar" rows reading at primary text weight, which
                        // made the entire column visually shouty even though
                        // none of those rows have actionable identity yet.
                        const hasName = !!(p.full_name && p.full_name.trim())
                        const initial = hasName ? p.full_name![0].toUpperCase() : '?'
                        return (
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-md flex items-center justify-center text-[12px] font-body font-bold flex-shrink-0 ${
                              hasName
                                ? 'bg-brand-purple/8 border border-brand-purple/15 text-brand-purple'
                                : 'bg-surface-2/50 border border-border/40 text-text-dim'
                            }`}>
                              {initial}
                            </div>
                            <span className={`text-xs font-body truncate max-w-[180px] transition-colors ${
                              hasName
                                ? 'font-medium text-text-primary group-hover:text-brand-purple-light'
                                : 'text-text-dim italic'
                            }`}>
                              {hasName ? p.full_name : t('noName')}
                            </span>
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-body ${
                        formatPhone(p.phone) === '—' ? 'text-text-dim' : 'text-text-secondary'
                      }`}>
                        {formatPhone(p.phone)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        // S154: normalize channel to UPPER for both color lookup
                        // and i18n key. BD tiene mezcla "WhatsApp" / "whatsapp"
                        // / "WHATSAPP" en acquisition_channel — el operador
                        // veía "whatsapp" en una fila y "WhatsApp" en otra
                        // (inconsistencia tipográfica que sugería que eran
                        // canales distintos). Normalizamos en el render para
                        // no depender de que la BD ya esté limpia.
                        const channelKey = (p.acquisition_channel || '').toUpperCase()
                        const colorClass = CHANNEL_COLORS[channelKey] || 'text-text-muted'
                        const i18nKey = `channels.${channelKey}`
                        const label = t.has(i18nKey) ? t(i18nKey) : channelKey
                        return (
                          <span className={`text-[12px] font-body font-semibold ${colorClass}`}>
                            {label}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        // S146: collapse the noisy "Por identificar" placeholder
                        // (which the backend writes when no real value is
                        // present) into the same em-dash treatment as null.
                        const interest = (p.service_interest || '').trim()
                        const isReal = interest && !/por\s+identificar/i.test(interest)
                        return (
                          <span className={`text-[12px] font-body truncate max-w-[140px] block ${
                            isReal ? 'text-text-muted' : 'text-text-dim'
                          }`}>
                            {isReal ? interest : '\u2014'}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const city = (p.city || '').trim()
                        const isReal = city && !/por\s+identificar/i.test(city)
                        return (
                          <span className={`text-[12px] font-body ${
                            isReal ? 'text-text-muted' : 'text-text-dim'
                          }`}>
                            {isReal ? city : '\u2014'}
                          </span>
                        )
                      })()}
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
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30">
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
          detailTab={detailTab}
          onTabChange={(tab) => {
            // S153: switching tab también cierra cualquier form abierto
            // (Edit / WA). Tratamiento y Nota ya no son forms locales —
            // viven en el SofIA Console — así que el cierre cross-tab
            // solo aplica a los dos forms que sí permanecen aquí.
            setDetailTab(tab)
            setShowWhatsApp(false)
            setEditingPatient(false)
          }}
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
        />
      )}
    </div>
  )
}
