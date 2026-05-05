'use client'

import { Palette } from 'lucide-react'
import { FeatureLock } from '@/components/feature-lock'

export default function ContenidoPage() {
  return (
    <FeatureLock
      persuasiveKey="contenido"
      icon={<Palette size={32} strokeWidth={1.4} />}
      title="Content Studio"
      eta="En desarrollo · Próximamente"
      headline="Contenido diario sin bloqueo creativo."
      subhead="IA que genera posts, carousels y reels en la voz de tu clínica. Tú apruebas. Ella publica."
      bullets={[
        'Posts, carousels, reels y stories calendarizados',
        'Aprende del estilo de tu feed actual',
        'Ajusta tono, tema y frecuencia con un prompt',
        'Publicación automática a Instagram y Meta',
      ]}
    />
  )
}
