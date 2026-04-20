'use client'

import { Zap } from 'lucide-react'
import { FeatureLock } from '@/components/feature-lock'

export default function AutomatizacionesPage() {
  return (
    <FeatureLock
      persuasiveKey="automatizaciones"
      icon={<Zap size={32} strokeWidth={1.4} />}
      title="Automatizaciones visuales"
      eta="Q4 2026"
      headline="Lo que hoy haces en 10 pasos, en uno."
      subhead="Flujos drag & drop entre SofIA, tu calendario, facturación e inventario — sin escribir una línea."
      bullets={[
        'Editor visual con nodos y ramas condicionales',
        'Triggers por evento (cita creada, pago recibido, mensaje llega)',
        'Librería de plantillas por caso de uso clínico',
        'Ejecución observable con logs por paso',
      ]}
    />
  )
}
