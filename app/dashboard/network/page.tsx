'use client'

import { Brain } from 'lucide-react'
import { FeatureLock } from '@/components/feature-lock'

export default function NetworkPage() {
  return (
    <FeatureLock
      persuasiveKey="network"
      icon={<Brain size={32} strokeWidth={1.4} />}
      title="Red Neuronal Inter-Clínica"
      eta="Beta privada · Lista de espera"
      headline="Cómo te comparas — sin revelar nada."
      subhead="Benchmarks anónimos entre clínicas de estética y dental en LATAM. Ve si tu conversión, ticket promedio y retención están sobre el promedio de tu vertical."
      bullets={[
        'Métricas anónimas por vertical (estética, dental, spa)',
        'Zero data leak — solo agregados cifrados',
        'Alertas cuando un indicador se cae bajo el P25',
        'Playbooks de clínicas top performers (opt-in)',
      ]}
      ctaLabel="Entrar a la beta"
    />
  )
}
