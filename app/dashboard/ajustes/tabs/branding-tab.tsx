'use client'

import { useState, useRef } from 'react'
import { Save, Upload, Trash2, Globe, CheckCircle, AlertCircle, RotateCcw, Image as ImageIcon, Palette, Link2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { uploadOrgLogo, deleteOrgLogo, validateCustomDomain, updateBrandColors } from '@/lib/api'
import type { Organization } from '@/types'

interface BrandingTabProps {
  orgId: string
  org: Organization
  isReadOnly: boolean
  onMessage: (msg: string) => void
  onRefresh: () => void
}

const DEFAULT_COLORS = {
  primary: '#8B5CF6',
  secondary: '#06D6A0',
  accent: '#F5C842',
}

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export function BrandingTab({ orgId, org, isReadOnly, onMessage, onRefresh }: BrandingTabProps) {
  const config = (org.config_settings || {}) as Record<string, unknown>
  const whiteLabel = (config.white_label || {}) as Record<string, unknown>
  const brandColors = (whiteLabel.brand_colors || {}) as Record<string, string>
  const currentLogoUrl = (whiteLabel.logo_url as string) || ''
  const currentDomain = (whiteLabel.custom_domain as string) || ''

  // Logo state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Colors state
  const [primary, setPrimary] = useState(brandColors.primary || DEFAULT_COLORS.primary)
  const [secondary, setSecondary] = useState(brandColors.secondary || DEFAULT_COLORS.secondary)
  const [accent, setAccent] = useState(brandColors.accent || DEFAULT_COLORS.accent)
  const [savingColors, setSavingColors] = useState(false)

  // Domain state
  const [domain, setDomain] = useState(currentDomain)
  const [validating, setValidating] = useState(false)
  const [domainStatus, setDomainStatus] = useState<'idle' | 'pending' | 'verified'>(
    currentDomain ? 'pending' : 'idle'
  )
  const [dnsInstructions, setDnsInstructions] = useState<string | null>(null)

  // ── Logo handlers ──

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      onMessage('Error: El archivo excede el limite de 2MB')
      return
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      onMessage('Error: Formato no soportado. Usa PNG, JPG, SVG o WebP')
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreviewUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleUpload = async () => {
    if (!selectedFile || isReadOnly) return
    setUploading(true)
    try {
      await uploadOrgLogo(orgId, selectedFile)
      onMessage('Logo subido correctamente')
      setSelectedFile(null)
      setPreviewUrl(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onRefresh()
    } catch (e) {
      onMessage('Error: ' + (e instanceof Error ? e.message : 'No se pudo subir el logo'))
    }
    setUploading(false)
  }

  const handleDeleteLogo = async () => {
    if (isReadOnly) return
    setDeleting(true)
    try {
      await deleteOrgLogo(orgId)
      onMessage('Logo eliminado')
      setPreviewUrl(null)
      setSelectedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      onRefresh()
    } catch (e) {
      onMessage('Error: ' + (e instanceof Error ? e.message : 'No se pudo eliminar el logo'))
    }
    setDeleting(false)
  }

  // ── Colors handlers ──

  const handleSaveColors = async () => {
    if (isReadOnly) return
    setSavingColors(true)
    try {
      await updateBrandColors(orgId, { primary, secondary, accent })
      onMessage('Colores de marca guardados')
      onRefresh()
    } catch (e) {
      onMessage('Error: ' + (e instanceof Error ? e.message : 'No se pudieron guardar los colores'))
    }
    setSavingColors(false)
  }

  const handleResetColors = () => {
    setPrimary(DEFAULT_COLORS.primary)
    setSecondary(DEFAULT_COLORS.secondary)
    setAccent(DEFAULT_COLORS.accent)
  }

  // ── Domain handlers ──

  const handleValidateDomain = async () => {
    if (!domain.trim() || isReadOnly) return
    setValidating(true)
    try {
      const result = await validateCustomDomain(orgId, domain.trim())
      if (result.verified) {
        setDomainStatus('verified')
        setDnsInstructions(null)
        onMessage('Dominio verificado correctamente')
      } else {
        setDomainStatus('pending')
        setDnsInstructions(result.cname_target || result.dns_target || 'cname.vercel-dns.com')
        onMessage('Dominio registrado — configura el DNS')
      }
      onRefresh()
    } catch (e) {
      onMessage('Error: ' + (e instanceof Error ? e.message : 'No se pudo validar el dominio'))
    }
    setValidating(false)
  }

  return (
    <div className="space-y-5">
      {/* ══════════════ Section 1: Logo ══════════════ */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon size={16} className="text-brand-purple" />
          <h3 className="text-sm font-semibold text-text-primary">Logo de la Organizacion</h3>
        </div>
        <p className="text-xs text-text-dim">
          Sube el logo de tu clinica. Se mostrara en el sidebar del dashboard, el chat web y los reportes PDF.
          Formatos: PNG, JPG, SVG, WebP. Maximo 2MB.
        </p>

        {/* Current logo preview */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-surface-3 border border-border flex items-center justify-center overflow-hidden">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
            ) : currentLogoUrl ? (
              <img src={currentLogoUrl} alt={org.name || 'Logo'} className="max-w-full max-h-full object-contain" />
            ) : (
              <ImageIcon size={24} className="text-text-dim" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs text-text-muted">
              {currentLogoUrl ? 'Logo actual configurado' : 'Sin logo personalizado — se usa el logo de SofIA'}
            </p>
            {selectedFile && (
              <p className="text-[11px] text-brand-purple font-medium">
                Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
        </div>

        {/* File input + actions */}
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isReadOnly}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadOnly}
            icon={<Upload size={13} />}
          >
            Seleccionar archivo
          </Button>
          {selectedFile && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpload}
              disabled={uploading || isReadOnly}
              loading={uploading}
              icon={<Upload size={13} />}
            >
              Subir logo
            </Button>
          )}
          {currentLogoUrl && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDeleteLogo}
              disabled={deleting || isReadOnly}
              loading={deleting}
              icon={<Trash2 size={13} />}
            >
              Eliminar logo
            </Button>
          )}
        </div>
      </div>

      {/* ══════════════ Section 2: Brand Colors ══════════════ */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={16} className="text-brand-purple" />
          <h3 className="text-sm font-semibold text-text-primary">Colores de Marca</h3>
        </div>
        <p className="text-xs text-text-dim">
          Define los colores principales de tu marca. Se aplican en el dashboard, el chat web y los reportes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Primary */}
          <ColorPicker
            label="Primario"
            value={primary}
            onChange={setPrimary}
            disabled={isReadOnly}
          />
          {/* Secondary */}
          <ColorPicker
            label="Secundario"
            value={secondary}
            onChange={setSecondary}
            disabled={isReadOnly}
          />
          {/* Accent */}
          <ColorPicker
            label="Acento"
            value={accent}
            onChange={setAccent}
            disabled={isReadOnly}
          />
        </div>

        {/* Live preview strip */}
        <div>
          <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-2">Vista previa</label>
          <div className="flex rounded-xl overflow-hidden h-8 border border-border">
            <div className="flex-1" style={{ backgroundColor: primary }} />
            <div className="flex-1" style={{ backgroundColor: secondary }} />
            <div className="flex-1" style={{ backgroundColor: accent }} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetColors}
            disabled={isReadOnly}
            icon={<RotateCcw size={13} />}
          >
            Restablecer
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveColors}
            disabled={savingColors || isReadOnly}
            loading={savingColors}
            icon={<Save size={13} />}
          >
            Guardar colores
          </Button>
        </div>
      </div>

      {/* ══════════════ Section 3: Custom Domain ══════════════ */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} className="text-brand-purple" />
          <h3 className="text-sm font-semibold text-text-primary">Dominio Personalizado</h3>
        </div>
        <p className="text-xs text-text-dim">
          Conecta un dominio propio para que tus pacientes accedan al chat web y la pagina de reservas desde tu marca.
          Ejemplo: <span className="text-brand-purple font-mono">reservas.tuclinica.com</span>
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="reservas.tuclinica.com"
            className="flex-1 px-4 py-2.5 rounded-xl bg-void border border-border text-text-primary text-sm font-mono outline-none focus:border-brand-purple/40"
            disabled={isReadOnly}
          />
          <Button
            variant="secondary"
            onClick={handleValidateDomain}
            disabled={validating || isReadOnly || !domain.trim()}
            loading={validating}
            icon={<Link2 size={13} />}
          >
            Validar dominio
          </Button>
        </div>

        {/* Status indicator */}
        {domainStatus !== 'idle' && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold ${
            domainStatus === 'verified'
              ? 'bg-status-success/10 border-status-success/20 text-status-success'
              : 'bg-status-warning/10 border-status-warning/20 text-status-warning'
          }`}>
            {domainStatus === 'verified' ? (
              <>
                <CheckCircle size={14} />
                Dominio verificado y activo
              </>
            ) : (
              <>
                <AlertCircle size={14} />
                Pendiente de verificacion DNS
              </>
            )}
          </div>
        )}

        {/* DNS Instructions */}
        {domainStatus === 'pending' && dnsInstructions && (
          <div className="space-y-3 p-4 rounded-xl bg-surface-3/50 border border-border">
            <h4 className="text-xs font-semibold text-text-primary">Instrucciones de configuracion DNS</h4>
            <p className="text-[11px] text-text-muted">
              Agrega el siguiente registro CNAME en el panel de administracion de tu proveedor de dominio:
            </p>
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <span className="text-text-dim font-semibold">Tipo:</span>
              <span className="text-text-primary font-mono">CNAME</span>
              <span className="text-text-dim font-semibold">Nombre:</span>
              <span className="text-text-primary font-mono">{domain.split('.')[0] || 'reservas'}</span>
              <span className="text-text-dim font-semibold">Valor:</span>
              <span className="text-brand-purple font-mono">{dnsInstructions}</span>
              <span className="text-text-dim font-semibold">TTL:</span>
              <span className="text-text-primary font-mono">3600</span>
            </div>
            <p className="text-[10px] text-text-dim">
              Los cambios de DNS pueden tardar hasta 48 horas en propagarse. Una vez configurado, vuelve a validar el dominio para verificar.
            </p>
          </div>
        )}

        {/* General instructions */}
        <div className="text-[11px] text-text-dim space-y-1">
          <p><strong className="text-text-muted">Pasos:</strong></p>
          <ol className="list-decimal list-inside space-y-0.5 ml-1">
            <li>Ingresa tu subdominio (ej: reservas.tuclinica.com)</li>
            <li>Haz clic en &quot;Validar dominio&quot;</li>
            <li>Configura el registro CNAME en tu proveedor de dominio</li>
            <li>Espera la propagacion DNS (hasta 48h)</li>
            <li>Vuelve a validar para confirmar</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

// ── Color Picker sub-component ──

function ColorPicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-semibold text-text-dim uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v) || v === '') {
              onChange(v)
            }
          }}
          onBlur={() => {
            if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
              onChange(DEFAULT_COLORS[label.toLowerCase() as keyof typeof DEFAULT_COLORS] || '#000000')
            }
          }}
          disabled={disabled}
          maxLength={7}
          className="flex-1 px-3 py-2 rounded-lg bg-void border border-border text-text-primary text-xs font-mono outline-none focus:border-brand-purple/40 uppercase"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}
