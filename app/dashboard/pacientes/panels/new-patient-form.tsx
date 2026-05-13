'use client'

interface NewPatientData {
  full_name: string
  phone: string
  email: string
  national_id: string
  date_of_birth: string
  city: string
  service_interest: string
}

interface NewPatientFormProps {
  data: NewPatientData
  onChange: (data: NewPatientData) => void
  onSubmit: () => void
  onCancel: () => void
}

export function NewPatientForm({ data, onChange, onSubmit, onCancel }: NewPatientFormProps) {
  return (
    <div className="glass-card p-4 space-y-3 border-brand-purple/20 animate-fade-up">
      <h4 className="text-sm font-mono font-semibold text-text-primary">Registrar Paciente Presencial</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="np-name" className="block text-[12px] font-body font-semibold text-text-dim uppercase mb-1">Nombre completo *</label>
          <input id="np-name" type="text" value={data.full_name} onChange={(e) => onChange({ ...data, full_name: e.target.value })} placeholder="Maria Garcia" className="w-full px-3 py-2 rounded-md bg-void border border-border text-text-primary text-sm font-body outline-none focus:border-brand-purple/40" />
        </div>
        <div>
          <label htmlFor="np-phone" className="block text-[12px] font-body font-semibold text-text-dim uppercase mb-1">Teléfono *</label>
          <input id="np-phone" type="text" value={data.phone} onChange={(e) => onChange({ ...data, phone: e.target.value })} placeholder="573001234567" className="w-full px-3 py-2 rounded-md bg-void border border-border text-text-primary text-sm font-body outline-none focus:border-brand-purple/40" />
        </div>
        <div>
          <label htmlFor="np-email" className="block text-[12px] font-body font-semibold text-text-dim uppercase mb-1">Email</label>
          <input id="np-email" type="email" value={data.email} onChange={(e) => onChange({ ...data, email: e.target.value })} placeholder="maria@email.com" className="w-full px-3 py-2 rounded-md bg-void border border-border text-text-primary text-sm font-body outline-none focus:border-brand-purple/40" />
        </div>
        <div>
          <label htmlFor="np-cedula" className="block text-[12px] font-body font-semibold text-text-dim uppercase mb-1">Cedula</label>
          <input id="np-cedula" type="text" value={data.national_id} onChange={(e) => onChange({ ...data, national_id: e.target.value })} placeholder="1020304050" className="w-full px-3 py-2 rounded-md bg-void border border-border text-text-primary text-sm font-body outline-none focus:border-brand-purple/40" />
        </div>
        <div>
          <label htmlFor="np-dob" className="block text-[12px] font-body font-semibold text-text-dim uppercase mb-1">Fecha nacimiento</label>
          <input id="np-dob" type="date" value={data.date_of_birth} onChange={(e) => onChange({ ...data, date_of_birth: e.target.value })} className="w-full px-3 py-2 rounded-md bg-void border border-border text-text-primary text-sm font-body outline-none focus:border-brand-purple/40" />
        </div>
        <div>
          <label htmlFor="np-city" className="block text-[12px] font-body font-semibold text-text-dim uppercase mb-1">Ciudad</label>
          <input id="np-city" type="text" value={data.city} onChange={(e) => onChange({ ...data, city: e.target.value })} placeholder="Bogota" className="w-full px-3 py-2 rounded-md bg-void border border-border text-text-primary text-sm font-body outline-none focus:border-brand-purple/40" />
        </div>
      </div>
      <div>
        <label htmlFor="np-service" className="block text-[12px] font-body font-semibold text-text-dim uppercase mb-1">Interes de servicio</label>
        <input id="np-service" type="text" value={data.service_interest} onChange={(e) => onChange({ ...data, service_interest: e.target.value })} placeholder="Limpieza dental" className="w-full px-3 py-2 rounded-md bg-void border border-border text-text-primary text-sm font-body outline-none focus:border-brand-purple/40" />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-md bg-surface-3 text-text-muted text-xs font-body font-semibold">Cancelar</button>
        <button onClick={onSubmit} disabled={!data.phone} className="px-3 py-1.5 rounded-md bg-brand-purple/8 border border-brand-purple/15 text-brand-purple text-xs font-body font-semibold disabled:opacity-50">Registrar</button>
      </div>
    </div>
  )
}
