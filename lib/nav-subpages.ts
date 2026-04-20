/**
 * Subpages map per nav item.
 * Used by the sidebar to render a floating mini-panel on hover
 * for items that have internal sub-routes.
 *
 * Items NOT in this map just show a simple tooltip chip with the label.
 */

export interface Subpage {
  label: string
  href: string
  description?: string
}

export const NAV_SUBPAGES: Record<string, Subpage[]> = {
  '/dashboard/conversaciones': [
    { label: 'Chat unificado', href: '/dashboard/conversaciones?tab=chat', description: 'Todos los canales en un solo hilo' },
    { label: 'Bandeja', href: '/dashboard/conversaciones?tab=bandeja', description: 'Por atender' },
    { label: 'Canales', href: '/dashboard/conversaciones?tab=canales', description: 'WhatsApp · IG · Web · Voz' },
    { label: 'Voz en vivo', href: '/dashboard/conversaciones?tab=voz', description: 'Llamadas activas' },
  ],
  '/dashboard/pacientes': [
    { label: 'Lista completa', href: '/dashboard/pacientes?view=lista' },
    { label: 'Segmentos', href: '/dashboard/pacientes?view=segmentos', description: 'ML-powered' },
    { label: 'Duplicados', href: '/dashboard/pacientes?view=duplicados', description: 'Detección automática' },
    { label: 'LTV', href: '/dashboard/pacientes?view=ltv', description: 'Valor vida del paciente' },
    { label: 'Gamificación', href: '/dashboard/pacientes?view=gamificacion' },
  ],
  '/dashboard/oportunidades': [
    { label: 'Lead scoring', href: '/dashboard/oportunidades?panel=lead-scoring' },
    { label: 'Conversión', href: '/dashboard/oportunidades?panel=conversion' },
    { label: 'Competidores', href: '/dashboard/oportunidades?panel=competitors' },
    { label: 'Pricing sugerido', href: '/dashboard/oportunidades?panel=pricing' },
    { label: 'Outreach', href: '/dashboard/oportunidades?panel=outreach' },
  ],
  '/dashboard/crecimiento': [
    { label: 'Ads', href: '/dashboard/crecimiento?tab=ads' },
    { label: 'Engagement', href: '/dashboard/crecimiento?tab=engagement' },
    { label: 'Analytics', href: '/dashboard/crecimiento?tab=analytics' },
  ],
  '/dashboard/datalake': [
    { label: 'Raw events', href: '/dashboard/datalake?tab=raw' },
    { label: 'Learning', href: '/dashboard/datalake?tab=learning' },
    { label: 'Models', href: '/dashboard/datalake?tab=models' },
    { label: 'Prompt Optimizer', href: '/dashboard/datalake?tab=optimizer' },
  ],
  '/dashboard/ajustes': [
    { label: 'System prompt', href: '/dashboard/ajustes?tab=prompt' },
    { label: 'Catálogo', href: '/dashboard/ajustes?tab=services' },
    { label: 'Horarios', href: '/dashboard/ajustes?tab=hours' },
    { label: 'Notificaciones', href: '/dashboard/ajustes?tab=notifications' },
    { label: 'Plantillas WA', href: '/dashboard/ajustes?tab=templates' },
    { label: 'Bots', href: '/dashboard/ajustes?tab=bots' },
    { label: 'Canales', href: '/dashboard/ajustes?tab=channels' },
    { label: 'Pricing', href: '/dashboard/ajustes?tab=pricing' },
    { label: 'API Keys', href: '/dashboard/ajustes?tab=api-keys' },
    { label: 'Branding', href: '/dashboard/ajustes?tab=branding' },
    { label: 'Seguridad', href: '/dashboard/ajustes?tab=security' },
  ],
}

export function getSubpages(href: string): Subpage[] | undefined {
  return NAV_SUBPAGES[href]
}
