'use client'

import { Database } from 'lucide-react'
import { FeatureLock } from '@/components/feature-lock'

export default function DataLakePage() {
  return (
    <FeatureLock
      persuasiveKey="datalake"
      icon={<Database size={32} strokeWidth={1.4} />}
      title="Data Lake"
      eta="Q3 2026"
      headline="Tu memoria colectiva."
      subhead="Cada conversación, cita y decisión de tu clínica se vuelve conocimiento entrenable — tuyo, no de un proveedor genérico."
      bullets={[
        'Base vectorial con todo el histórico de tu clínica',
        'Búsqueda semántica instantánea desde SofIA Console',
        'Fine-tuning en la voz exacta de tu marca',
        'Descarga tu data en cualquier formato cuando quieras',
      ]}
    />
  )
}
