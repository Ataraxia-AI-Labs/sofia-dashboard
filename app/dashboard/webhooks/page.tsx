'use client'

import { Webhook } from 'lucide-react'
import { FeatureLock } from '@/components/feature-lock'

export default function WebhooksPage() {
  return (
    <FeatureLock
      persuasiveKey="webhooks"
      icon={<Webhook size={32} strokeWidth={1.4} />}
      title="Webhooks"
      eta="Octubre 2026"
      headline="Conecta SofIA con lo que sea."
      subhead="Webhooks en tiempo real, firmados con HMAC, reintentos exponenciales. Eventos confiables para tu stack."
      bullets={[
        'Eventos: cita, pago, mensaje, lead, paciente',
        'Firma HMAC-SHA256 para validar origen',
        'Reintentos con backoff y dead-letter queue',
        'Dashboard de entregas con replay manual',
      ]}
    />
  )
}
