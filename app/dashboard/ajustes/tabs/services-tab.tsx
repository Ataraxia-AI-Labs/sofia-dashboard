'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit3 } from 'lucide-react'
import { Button, Input, Modal } from '@/components/ui'
import { createService, updateService, deleteService, formatCOP } from '@/lib/api'
import { useTranslations } from 'next-intl'
import type { ServiceCatalog } from '@/types'

interface ServicesTabProps {
  orgId: string
  services: ServiceCatalog[]
  isReadOnly: boolean
  onRefresh: () => void
  onMessage: (msg: string) => void
}

export function ServicesTab({ orgId, services, isReadOnly, onRefresh, onMessage }: ServicesTabProps) {
  const [showNew, setShowNew] = useState(false)
  const [newSvc, setNewSvc] = useState({ name: '', description: '', price: 0, duration_minutes: 60, category: 'GENERAL' })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<ServiceCatalog>>({})
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const t = useTranslations('services')
  const tCommon = useTranslations('common')

  const handleCreate = async () => {
    if (!newSvc.name || !newSvc.price) return
    setSaving(true)
    try {
      await createService(orgId, newSvc)
      setShowNew(false)
      setNewSvc({ name: '', description: '', price: 0, duration_minutes: 60, category: 'GENERAL' })
      onRefresh()
      onMessage(t('created'))
    } catch (e) {
      onMessage(tCommon('error') + ': ' + (e instanceof Error ? e.message : tCommon('errorUnknown')))
    }
    setSaving(false)
  }

  const handleUpdate = async (serviceId: string) => {
    setSaving(true)
    try {
      await updateService(serviceId, editData)
      setEditingId(null)
      onRefresh()
      onMessage(t('updated'))
    } catch (e) {
      onMessage(tCommon('error') + ': ' + (e instanceof Error ? e.message : tCommon('errorUnknown')))
    }
    setSaving(false)
  }

  const handleDelete = (serviceId: string) => {
    setDeleteTarget(serviceId)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteService(deleteTarget)
      onRefresh()
      onMessage(t('deactivated'))
    } catch (e) {
      onMessage(tCommon('error') + ': ' + (e instanceof Error ? e.message : tCommon('errorUnknown')))
    }
    setDeleteTarget(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-dim">{t('activeCount', { count: services.length })}</p>
        {!isReadOnly && (
          <Button variant="secondary" size="sm" onClick={() => setShowNew(true)} icon={<Plus size={13} />}>
            {t('newService')}
          </Button>
        )}
      </div>

      {showNew && (
        <div className="glass-card p-5 space-y-3 border-brand-purple/20 animate-fade-up">
          <h4 className="text-sm font-semibold text-text-primary">{t('newServiceTitle')}</h4>
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('name')} value={newSvc.name} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })} placeholder={t('namePlaceholder')} />
            <Input label={t('price')} value={newSvc.price.toString()} onChange={(e) => setNewSvc({ ...newSvc, price: Number(e.target.value) || 0 })} placeholder="150000" type="number" />
            <Input label={t('duration')} value={newSvc.duration_minutes.toString()} onChange={(e) => setNewSvc({ ...newSvc, duration_minutes: Number(e.target.value) || 60 })} type="number" />
            <Input label={t('category')} value={newSvc.category} onChange={(e) => setNewSvc({ ...newSvc, category: e.target.value })} placeholder={t('categoryPlaceholder')} />
          </div>
          <Input label={t('description')} value={newSvc.description} onChange={(e) => setNewSvc({ ...newSvc, description: e.target.value })} placeholder={t('descriptionPlaceholder')} />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}>{tCommon('cancel')}</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving || !newSvc.name} loading={saving}>{t('create')}</Button>
          </div>
        </div>
      )}

      {services.map((svc) => (
        <div key={svc.id} className="glass-card p-4">
          {editingId === svc.id ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label={t('name')} value={editData.name ?? svc.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                <Input label={t('price')} value={(editData.price ?? svc.price).toString()} onChange={(e) => setEditData({ ...editData, price: Number(e.target.value) })} type="number" />
                <Input label={t('duration')} value={(editData.duration_minutes ?? svc.duration_minutes).toString()} onChange={(e) => setEditData({ ...editData, duration_minutes: Number(e.target.value) })} type="number" />
                <Input label={t('category')} value={editData.category ?? svc.category} onChange={(e) => setEditData({ ...editData, category: e.target.value })} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>{tCommon('cancel')}</Button>
                <Button size="sm" onClick={() => handleUpdate(svc.id)} loading={saving}>{tCommon('save')}</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">{svc.name}</span>
                  <span className="text-[10px] bg-surface-3 text-text-dim px-2 py-0.5 rounded-full">{svc.category}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
                  <span className="font-mono font-semibold text-status-success">{formatCOP(svc.price)}</span>
                  <span>{svc.duration_minutes} min</span>
                  {svc.description && <span className="truncate max-w-[200px]">{svc.description}</span>}
                </div>
              </div>
              {!isReadOnly && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setEditingId(svc.id); setEditData({}) }}
                    className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-text-dim hover:text-text-primary transition-colors"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(svc.id)}
                    className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-text-dim hover:text-status-danger transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {services.length === 0 && !showNew && (
        <div className="glass-card p-8 text-center text-text-dim text-sm">
          {tCommon('noResults')}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={tCommon('confirm')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            {t('deactivated')}?
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>{tCommon('cancel')}</Button>
            <Button size="sm" onClick={confirmDelete} icon={<Trash2 size={13} />} className="bg-status-danger/10 text-status-danger border-status-danger/20 hover:bg-status-danger/20">
              {tCommon('deactivate')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

