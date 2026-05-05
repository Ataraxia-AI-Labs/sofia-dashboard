'use client'

import { Store } from 'lucide-react'
import { FeatureLock } from '@/components/feature-lock'

export default function MarketplacePage() {
  return (
    <FeatureLock
      persuasiveKey="marketplace"
      icon={<Store size={32} strokeWidth={1.4} />}
      title="Marketplace"
      eta="En desarrollo · Próximamente"
      headline="Un click. Integrado."
      subhead="Google Calendar, Stripe, Meta Ads, HubSpot, 50+ apps — conectadas a SofIA sin setup técnico."
      bullets={[
        'Directorio curado de integraciones verificadas',
        'OAuth2 con un click, sin tokens manuales',
        'Plugins certificados por el equipo Ataraxia',
        'Developer portal para publicar tus propios conectores',
      ]}
    />
  )
}
