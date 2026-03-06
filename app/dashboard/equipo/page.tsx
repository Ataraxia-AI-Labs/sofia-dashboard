'use client'

import { useEffect, useState, useCallback } from 'react'
import { useOrg } from '@/lib/org-context'
import { fetchTeamMembers, inviteTeamMember, updateMemberRole, deactivateMember } from '@/lib/api'
import type { TeamMember } from '@/lib/api/team'
import { Button, Badge, Modal, Input, Select } from '@/components/ui'
import { useToast } from '@/components/ui/toast'
import { Users, UserPlus, Shield, Crown, Mail, MoreVertical, RefreshCw, Trash2 } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: 'OWNER', label: 'Propietario' },
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'STAFF', label: 'Personal' },
]

const ROLE_BADGE: Record<string, { variant: 'purple' | 'info' | 'neutral'; icon: typeof Crown }> = {
  OWNER: { variant: 'purple', icon: Crown },
  ADMIN: { variant: 'info', icon: Shield },
  STAFF: { variant: 'neutral', icon: Users },
}

export default function EquipoPage() {
  const { orgId, role } = useOrg()
  const toast = useToast()
  const canManage = role === 'OWNER' || role === 'ADMIN'
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('STAFF')
  const [inviting, setInviting] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null)

  const loadMembers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchTeamMembers(orgId)
      setMembers(data)
    } catch {
      toast.error('Error cargando equipo')
    }
    setLoading(false)
  }, [orgId, toast])

  useEffect(() => { loadMembers() }, [loadMembers])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    const result = await inviteTeamMember(orgId, inviteEmail.trim(), inviteRole)
    if (result.success) {
      toast.success('Invitacion enviada')
      setShowInvite(false)
      setInviteEmail('')
      setInviteRole('STAFF')
      loadMembers()
    } else {
      toast.error(result.message || 'Error enviando invitacion')
    }
    setInviting(false)
  }

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await updateMemberRole(orgId, memberId, newRole)
      toast.success('Rol actualizado')
      loadMembers()
    } catch {
      toast.error('Error actualizando rol')
    }
    setMenuOpen(null)
  }

  const handleDeactivate = async (memberId: string, name: string) => {
    setDeactivateTarget({ id: memberId, name })
    setMenuOpen(null)
  }

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    try {
      await deactivateMember(orgId, deactivateTarget.id)
      toast.success('Miembro desactivado')
      loadMembers()
    } catch {
      toast.error('Error desactivando miembro')
    }
    setDeactivateTarget(null)
  }

  const activeMembers = members.filter(m => m.is_active)
  const inactiveMembers = members.filter(m => !m.is_active)

  return (
    <div className="max-w-[800px] space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Equipo</h2>
          <p className="text-text-dim text-xs mt-0.5">{activeMembers.length} miembros activos</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadMembers} aria-label="Actualizar" className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={14} />
          </button>
          {canManage && (
            <Button size="sm" onClick={() => setShowInvite(true)} icon={<UserPlus size={14} />}>
              Invitar miembro
            </Button>
          )}
        </div>
      </div>

      {/* RBAC info */}
      <div className="px-4 py-3 rounded-xl bg-status-info/10 border border-status-info/20 text-xs text-status-info leading-relaxed">
        <strong>Roles:</strong> Propietario (acceso total) &gt; Administrador (puede editar config) &gt; Personal (solo lectura en ajustes)
      </div>

      {/* Members list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-3" />
                <div className="flex-1">
                  <div className="h-4 bg-surface-3 rounded w-32 mb-2" />
                  <div className="h-3 bg-surface-3 rounded w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {activeMembers.map(member => {
            const roleConfig = ROLE_BADGE[member.role] || ROLE_BADGE.STAFF
            const RoleIcon = roleConfig.icon
            return (
              <div key={member.id} className="glass-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-purple/20 to-brand-cyan/20 border border-brand-purple/20 flex items-center justify-center text-brand-purple font-semibold text-sm">
                      {(member.full_name || member.email || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">
                          {member.full_name || member.email || member.user_id.slice(0, 8)}
                        </span>
                        <Badge variant={roleConfig.variant} dot>
                          <RoleIcon size={10} />
                          {ROLE_OPTIONS.find(r => r.value === member.role)?.label || member.role}
                        </Badge>
                      </div>
                      {member.email && (
                        <p className="text-xs text-text-dim flex items-center gap-1 mt-0.5">
                          <Mail size={10} />
                          {member.email}
                        </p>
                      )}
                    </div>
                  </div>

                  {canManage && member.role !== 'OWNER' && (
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === member.id ? null : member.id)}
                        className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {menuOpen === member.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(null)} />
                          <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-surface border border-border rounded-xl shadow-lg py-1 animate-fade-in">
                            {ROLE_OPTIONS.filter(r => r.value !== 'OWNER' && r.value !== member.role).map(r => (
                              <button
                                key={r.value}
                                onClick={() => handleRoleChange(member.id, r.value)}
                                className="w-full text-left px-3 py-2 text-xs text-text-muted hover:bg-surface-2 transition-colors"
                              >
                                Cambiar a {r.label}
                              </button>
                            ))}
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={() => handleDeactivate(member.id, member.full_name || member.email || 'este miembro')}
                              className="w-full text-left px-3 py-2 text-xs text-status-danger hover:bg-status-danger/5 transition-colors flex items-center gap-2"
                            >
                              <Trash2 size={12} />
                              Desactivar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {activeMembers.length === 0 && (
            <div className="glass-card p-8 text-center text-text-dim text-sm">
              No hay miembros en el equipo.
            </div>
          )}

          {inactiveMembers.length > 0 && (
            <div className="mt-6">
              <p className="text-xs text-text-dim font-semibold uppercase tracking-wider mb-2">Miembros inactivos</p>
              {inactiveMembers.map(member => (
                <div key={member.id} className="glass-card p-4 opacity-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-3 border border-border flex items-center justify-center text-text-dim font-semibold text-sm">
                      {(member.full_name || member.email || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm text-text-muted">{member.full_name || member.email || member.user_id.slice(0, 8)}</span>
                      <p className="text-xs text-text-dim">Desactivado</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Invitar miembro" description="Envia una invitacion por email para unirse a tu organizacion.">
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="nombre@clinica.com"
            autoFocus
          />
          <Select
            label="Rol"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            options={ROLE_OPTIONS.filter(r => r.value !== 'OWNER')}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancelar</Button>
            <Button onClick={handleInvite} loading={inviting} disabled={!inviteEmail.trim()} icon={<Mail size={14} />}>
              Enviar invitacion
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} title="Confirmar desactivacion" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Desactivar a <strong className="text-text-primary">{deactivateTarget?.name}</strong>? Ya no tendra acceso al dashboard.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setDeactivateTarget(null)}>Cancelar</Button>
            <Button onClick={confirmDeactivate} icon={<Trash2 size={14} />} className="bg-status-danger/10 text-status-danger border-status-danger/20 hover:bg-status-danger/20">
              Desactivar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
