'use client'

import { useEffect, useState, useCallback } from 'react'
import { listApiKeys, createApiKey, revokeApiKey } from '@/lib/api/api-keys'
import type { ApiKey } from '@/lib/api/api-keys'
import { Key, Plus, Trash2, Copy, Eye, EyeOff } from 'lucide-react'
import { timeAgo } from '@/lib/api/helpers'

interface Props {
  orgId: string
  isReadOnly: boolean
  onMessage: (msg: string) => void
}

export function ApiKeysTab({ orgId, isReadOnly, onMessage }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newScopes, setNewScopes] = useState<string[]>(['read'])
  const [newRawKey, setNewRawKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const k = await listApiKeys(orgId)
    setKeys(k)
    setLoading(false)
  }, [orgId])

  useEffect(() => { load() }, [load])

  const availableScopes = ['read', 'write', 'patients', 'appointments', 'conversations', 'analytics', 'webhooks', 'admin']

  const handleCreate = async () => {
    if (!newName) return
    try {
      const result = await createApiKey(orgId, { name: newName, scopes: newScopes })
      setNewRawKey(result.raw_key)
      setShowCreate(false)
      setNewName('')
      setNewScopes(['read'])
      load()
      onMessage('API Key creada')
    } catch { onMessage('Error al crear API Key') }
  }

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Revocar esta API Key? Esta accion no se puede deshacer.')) return
    try {
      await revokeApiKey(orgId, keyId)
      load()
      onMessage('API Key revocada')
    } catch { onMessage('Error al revocar') }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[11px] font-mono font-bold text-text-primary flex items-center gap-1.5">
            <Key size={14} className="text-brand-purple" /> API Keys
          </h3>
          <p className="text-[9px] font-mono text-text-dim mt-0.5">Genera claves para integraciones externas</p>
        </div>
        {!isReadOnly && (
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-brand-purple/10 border border-brand-purple/20 text-brand-purple text-[10px] font-mono font-semibold">
            <Plus size={12} /> Nueva Key
          </button>
        )}
      </div>

      {/* New raw key display */}
      {newRawKey && (
        <div className="border border-status-success/20 bg-status-success/5 rounded-lg p-3">
          <p className="text-[9px] font-mono text-status-success font-semibold mb-1">Copia tu API Key ahora — no se mostrara de nuevo</p>
          <div className="flex items-center gap-2">
            <code className="text-[10px] font-mono text-text-primary bg-surface-2 px-2 py-1 rounded flex-1 break-all">{newRawKey}</code>
            <button onClick={() => { navigator.clipboard.writeText(newRawKey); onMessage('Copiada') }}
              className="p-1 rounded hover:bg-surface-2 text-text-muted"><Copy size={14} /></button>
          </div>
          <button onClick={() => setNewRawKey(null)} className="text-[9px] font-mono text-text-dim mt-2 hover:text-text-muted">Cerrar</button>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="border border-border rounded-lg p-4 space-y-3 bg-surface-2/50">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la key"
            className="w-full text-[11px] font-mono bg-surface border border-border rounded px-3 py-1.5 text-text-primary" />
          <div>
            <p className="text-[9px] font-mono text-text-dim uppercase tracking-wider mb-1">Scopes</p>
            <div className="flex flex-wrap gap-1">
              {availableScopes.map(s => (
                <button key={s} onClick={() => setNewScopes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                    newScopes.includes(s) ? 'bg-brand-purple/15 border-brand-purple/30 text-brand-purple' : 'border-border text-text-dim'
                  }`}>{s}</button>
              ))}
            </div>
          </div>
          <button onClick={handleCreate} className="px-3 py-1 rounded bg-brand-purple text-white text-[10px] font-mono font-semibold">Crear</button>
        </div>
      )}

      {/* Keys list */}
      {loading ? (
        <p className="text-[10px] font-mono text-text-dim py-8 text-center">...</p>
      ) : keys.length === 0 ? (
        <p className="text-[10px] font-mono text-text-dim py-8 text-center">Sin API Keys</p>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="border border-border rounded-lg p-3 hover:bg-surface-2/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${k.is_active ? 'bg-status-success' : 'bg-text-dim'}`} />
                  <span className="text-[11px] font-mono font-semibold text-text-primary">{k.name}</span>
                  <span className="text-[9px] font-mono text-text-dim">{k.key_prefix}•••</span>
                </div>
                {!isReadOnly && (
                  <button onClick={() => handleRevoke(k.id)}
                    className="p-1 rounded hover:bg-status-danger/10 text-text-dim hover:text-status-danger transition-colors">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="flex flex-wrap gap-1">
                  {k.scopes.map(s => (
                    <span key={s} className="text-[8px] font-mono bg-surface-2 border border-border rounded px-1.5 py-0.5 text-text-dim">{s}</span>
                  ))}
                </div>
                <span className="text-[8px] font-mono text-text-dim ml-auto">
                  {k.last_used_at ? `Ultimo uso: ${timeAgo(k.last_used_at)}` : 'Nunca usada'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
