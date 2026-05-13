'use client'

import { Webhook } from 'lucide-react'
import { FeatureLock } from '@/components/feature-lock'

export default function WebhooksPage() {
  return (
    <FeatureLock
      persuasiveKey="webhooks"
      icon={<Webhook size={32} strokeWidth={1.4} />}
      title="Webhooks"
      eta="En desarrollo · Próximamente"
      headline="Conecta SofIA con lo que sea."
      subhead="Eventos en tiempo real con firma digital y reintentos automáticos. Tu sistema externo siempre recibe la notificación."
      bullets={[
        'Eventos: cita, pago, mensaje, lead, paciente',
        'Firma digital para verificar que el evento es autentico',
        'Reintentos automaticos si tu servidor no responde',
        'Historial de entregas con reenvio manual',
      ]}
    />
  )
}
