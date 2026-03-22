'use client'

import { useEffect, useState, useCallback } from 'react'
import * as Sentry from '@sentry/nextjs'
import {
  listAPIKeys, createAPIKey, revokeAPIKey, fetchAllOrganizations,
  type APIKeyRow, type AdminOrgRow,
} from '@/lib/admin-api'
import { timeAgo } from '@/lib/api'
import { Modal } from '@/components/ui/modal'
import {
  KeyRound, Plus, RefreshCw, Copy, Check, Trash2,
  ShieldCheck, Clock, Building2, Filter,
} from 'lucide-react'

// ─── Scope options ───────────────────────────────────────────────────────────
const SCOPES = [
  { value: 'read', label: 'Read', desc: 'Leer datos de la API' },
  { value: 'write', label: 'Write', desc: 'Crear y modificar recursos' },
  { value: 'admin', label: 'Admin', desc: 'Acceso administrativo completo' },
]

const EXPIRY_OPTIONS = [
  { label: 'Sin vencimiento', days: undefined },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
  { label: '1 ano', days: 365 },
]

const STATUS_STYLES: Record<string, string> = {
  active: 'text-status-success bg-status-success/10 border-status-success/20',
  revoked: 'text-status-danger bg-status-danger/10 border-status-danger/20',
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminAPIKeysPage() {
  const [keys, setKeys] = useState<APIKeyRow[]>([])
  const [orgs, setOrgs] = useState<AdminOrgRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<string>('')

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createScopes, setCreateScopes] = useState<string[]>(['read'])
  const [createExpiry, setCreateExpiry] = useState<number | undefined>(undefined)
  const [createOrgId, setCreateOrgId] = useState<string>('')
  const [createError, setCreateError] = useState('')

  // Reveal modal — shown once after creation
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Revoke confirmation
  const [revokeTarget, setRevokeTarget] = useState<APIKeyRow | null>(null)
  const [revoking, setRevoking] = useState(false)

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [keysData, orgsData] = await Promise.all([
        listAPIKeys(selectedOrg || undefined),
        fetchAllOrganizations(),
      ])
      setKeys(keysData)
      setOrgs(orgsData)
    } catch (err) {
      Sentry.captureException(err)
    } finally {
      setLoading(false)
    }
  }, [selectedOrg])

  useEffect(() => { loadData() }, [loadData])

  // ── Create key ─────────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!createName.trim()) { setCreateError('El nombre es requerido'); return }
    if (createScopes.length === 0) { setCreateError('Selecciona al menos un scope'); return }
    setCreating(true)
    setCreateError('')
    try {
      const res = await createAPIKey({
        name: createName.trim(),
        scopes: createScopes,
        expires_in_days: createExpiry,
        organization_id: createOrgId || undefined,
      })
      setShowCreate(false)
      setNewKeyValue(res.key)
      setCreateName('')
      setCreateScopes(['read'])
      setCreateExpiry(undefined)
      setCreateOrgId('')
      await loadData()
    } catch (err) {
      Sentry.captureException(err)
      setCreateError(err instanceof Error ? err.message : 'Error al crear la clave')
    } finally {
      setCreating(false)
    }
  }, [createName, createScopes, createExpiry, createOrgId, loadData])

  // ── Revoke key ─────────────────────────────────────────────────────────────
  const handleRevoke = useCallback(async () => {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      await revokeAPIKey(revokeTarget.id)
      setRevokeTarget(null)
      await loadData()
    } catch (err) {
      Sentry.captureException(err)
    } finally {
      setRevoking(false)
    }
  }, [revokeTarget, loadData])

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!newKeyValue) return
    try {
      await navigator.clipboard.writeText(newKeyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement('textarea')
      el.value = newKeyValue
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [newKeyValue])

  const toggleScope = (scope: string) => {
    setCreateScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1200px] space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wide text-text-primary">API Keys</h2>
          <p className="text-text-dim text-[9px] font-mono mt-0.5">Gestion de claves de acceso a la API del sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="w-8 h-8 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            title="Recargar"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-purple text-white text-xs font-mono font-semibold hover:bg-brand-purple/90 transition-colors"
          >
            <Plus size={15} />
            Crear Clave
          </button>
        </div>
      </div>

      {/* ORG FILTER */}
      <div className="flex items-center gap-2">
        <Filter size={13} className="text-text-dim" />
        <select
          value={selectedOrg}
          onChange={e => setSelectedOrg(e.target.value)}
          className="text-xs font-mono bg-surface-2 border border-border rounded-md px-3 py-1.5 text-text-muted focus:outline-none focus:border-brand-purple/50 transition-colors"
        >
          <option value="">Todas las organizaciones</option>
          {orgs.map(o => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        {selectedOrg && (
          <button
            onClick={() => setSelectedOrg('')}
            className="text-[10px] font-mono text-text-dim hover:text-text-muted transition-colors"
          >
            Limpiar filtro
          </button>
        )}
      </div>

      {/* KEYS TABLE */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2.5">
          <KeyRound size={14} className="text-brand-purple" />
          <h3 className="text-[10px] font-mono font-semibold text-text-muted uppercase tracking-wider">Claves Existentes</h3>
          <span className="ml-auto text-[9px] font-mono text-text-dim">{keys.length} claves</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider">Scopes</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider hidden md:table-cell">Organizacion</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider hidden lg:table-cell">Creada</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider hidden lg:table-cell">Ultimo uso</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider">Estado</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-mono font-semibold text-text-dim uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-text-dim text-xs font-mono">
                    <RefreshCw size={16} className="animate-spin mx-auto mb-2" />
                    Cargando...
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-text-dim text-xs font-mono">
                    <KeyRound size={24} className="mx-auto mb-2 opacity-30" />
                    No hay claves API. Crea una nueva.
                  </td>
                </tr>
              ) : (
                keys.map(key => (
                  <tr key={key.id} className="border-b border-border/50 hover:bg-surface-3/50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <KeyRound size={13} className="text-text-dim flex-shrink-0" />
                        <div>
                          <div className="text-xs font-mono font-semibold text-text-primary">{key.name}</div>
                          <div className="text-[9px] font-mono text-text-dim">····{key.key_hint}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {key.scopes.map(scope => (
                          <span
                            key={scope}
                            className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple border border-brand-purple/20"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden md:table-cell">
                      <div className="flex items-center gap-1.5 text-xs font-mono text-text-muted">
                        <Building2 size={11} className="text-text-dim" />
                        {key.organization_name || <span className="text-text-dim italic">Global</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-text-muted hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <Clock size={11} className="text-text-dim" />
                        {timeAgo(key.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-text-muted hidden lg:table-cell">
                      {key.last_used_at ? timeAgo(key.last_used_at) : <span className="text-text-dim italic">Nunca</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[key.status] || 'text-text-dim bg-surface-3 border-border'}`}>
                        {key.status === 'active' ? 'Activa' : 'Revocada'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {key.status === 'active' && (
                        <button
                          onClick={() => setRevokeTarget(key)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-mono font-semibold text-status-danger/70 hover:text-status-danger bg-status-danger/5 hover:bg-status-danger/10 border border-status-danger/10 hover:border-status-danger/20 transition-colors"
                        >
                          <Trash2 size={11} />
                          Revocar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE KEY MODAL */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setCreateError('') }}
        title="Crear API Key"
        description="La clave generada se mostrara una sola vez. Guardala de inmediato."
        size="md"
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[10px] font-mono font-semibold text-text-muted mb-1.5">
              Nombre <span className="text-status-danger">*</span>
            </label>
            <input
              type="text"
              value={createName}
              onChange={e => setCreateName(e.target.value)}
              placeholder="ej. Backend CI, Integracion Zapier"
              className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono placeholder:text-text-dim focus:outline-none focus:border-brand-purple/50 transition-colors"
              maxLength={100}
            />
          </div>

          {/* Scopes */}
          <div>
            <label className="block text-[10px] font-mono font-semibold text-text-muted mb-2">
              Permisos (Scopes) <span className="text-status-danger">*</span>
            </label>
            <div className="space-y-2">
              {SCOPES.map(scope => (
                <label
                  key={scope.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    createScopes.includes(scope.value)
                      ? 'bg-brand-purple/10 border-brand-purple/30'
                      : 'bg-surface-2 border-border hover:border-brand-purple/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={createScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className="w-4 h-4 rounded accent-brand-purple"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono font-semibold text-text-primary">{scope.label}</div>
                    <div className="text-[10px] font-mono text-text-dim">{scope.desc}</div>
                  </div>
                  {createScopes.includes(scope.value) && (
                    <ShieldCheck size={14} className="text-brand-purple flex-shrink-0" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-[10px] font-mono font-semibold text-text-muted mb-1.5">Vencimiento</label>
            <select
              value={createExpiry ?? ''}
              onChange={e => setCreateExpiry(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono focus:outline-none focus:border-brand-purple/50 transition-colors"
            >
              {EXPIRY_OPTIONS.map(opt => (
                <option key={opt.label} value={opt.days ?? ''}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Organization */}
          <div>
            <label className="block text-[10px] font-mono font-semibold text-text-muted mb-1.5">
              Organizacion <span className="text-text-dim font-normal">(opcional)</span>
            </label>
            <select
              value={createOrgId}
              onChange={e => setCreateOrgId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-text-primary text-xs font-mono focus:outline-none focus:border-brand-purple/50 transition-colors"
            >
              <option value="">Global (sin org especifica)</option>
              {orgs.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>

          {createError && (
            <p className="text-xs font-mono text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-md px-3 py-2">
              {createError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => { setShowCreate(false); setCreateError('') }}
              className="px-4 py-2 rounded-lg bg-surface-2 border border-border text-text-muted text-xs font-mono font-semibold hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-purple text-white text-xs font-mono font-semibold hover:bg-brand-purple/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
              {creating ? 'Creando...' : 'Crear Clave'}
            </button>
          </div>
        </div>
      </Modal>

      {/* REVEAL KEY MODAL — shown once */}
      <Modal
        open={!!newKeyValue}
        onClose={() => { setNewKeyValue(null); setCopied(false) }}
        title="Clave creada!"
        description="Copia esta clave ahora. No podras verla de nuevo."
        size="md"
        showClose={false}
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-status-warning/5 border border-status-warning/20">
            <ShieldCheck size={14} className="text-status-warning flex-shrink-0" />
            <p className="text-xs font-mono text-status-warning">
              Esta clave <strong>no se volvera a mostrar</strong>. Guardala en un lugar seguro.
            </p>
          </div>
          <div className="relative group">
            <div className="w-full px-4 py-3 pr-12 rounded-lg bg-surface-3 border border-border font-mono text-xs text-text-primary break-all select-all">
              {newKeyValue}
            </div>
            <button
              onClick={handleCopy}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-brand-purple hover:border-brand-purple/30 transition-all"
              title="Copiar"
            >
              {copied ? <Check size={14} className="text-status-success" /> : <Copy size={14} />}
            </button>
          </div>
          {copied && (
            <p className="text-[10px] font-mono text-status-success text-center">
              Copiado al portapapeles!
            </p>
          )}
          <div className="flex justify-end pt-1">
            <button
              onClick={() => { setNewKeyValue(null); setCopied(false) }}
              className="px-5 py-2 rounded-lg bg-brand-purple text-white text-xs font-mono font-semibold hover:bg-brand-purple/90 transition-colors"
            >
              Entendido, ya la copie
            </button>
          </div>
        </div>
      </Modal>

      {/* REVOKE CONFIRMATION MODAL */}
      <Modal
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revocar clave API"
        description="Esta accion es irreversible."
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-xs font-mono text-text-muted">
            Estas seguro de que quieres revocar la clave{' '}
            <span className="font-semibold text-text-primary">{revokeTarget?.name}</span>?
            Cualquier servicio que la use dejara de funcionar inmediatamente.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRevokeTarget(null)}
              className="px-4 py-2 rounded-lg bg-surface-2 border border-border text-text-muted text-xs font-mono font-semibold hover:text-text-primary transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-status-danger text-white text-xs font-mono font-semibold hover:bg-status-danger/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {revoking ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
              {revoking ? 'Revocando...' : 'Revocar clave'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
