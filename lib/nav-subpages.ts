/**
 * Subpages map per nav item.
 * Used by the sidebar to render a floating mini-panel on hover.
 * Keys MUST match the actual state values inside each page's tab/view hook,
 * and pages read `?tab=` / `?view=` / `?panel=` on mount to sync.
 */

export interface Subpage {
  label: string
  href: string
  description?: string
}

export const NAV_SUBPAGES: Record<string, Subpage[]> = {
  // Conversaciones — S140/S141: voice removed; voice rows now appear inline
  // in the unified chat timeline with their own VOICE_CALL badge, and the
  // aggregate metrics live under /dashboard/inteligencia → tab Voz.
  '/dashboard/conversaciones': [
    { label: 'Chat unificado', href: '/dashboard/conversaciones?tab=conversations', description: 'Todos los canales (incluye llamadas)' },
    { label: 'Bandeja', href: '/dashboard/conversaciones?tab=inbox', description: 'Por atender' },
    { label: 'Canales', href: '/dashboard/conversaciones?tab=channels', description: 'WhatsApp · IG · Web · Voz' },
  ],

  // Pacientes — activeView: 'list' | 'segments' | 'duplicates' | 'ltv' | 'gamification'
  '/dashboard/pacientes': [
    { label: 'Lista completa', href: '/dashboard/pacientes?view=list' },
    { label: 'Segmentos', href: '/dashboard/pacientes?view=segments', description: 'ML-powered' },
    { label: 'Duplicados', href: '/dashboard/pacientes?view=duplicates', description: 'Detección automática' },
    { label: 'LTV', href: '/dashboard/pacientes?view=ltv', description: 'Valor vida del paciente' },
    { label: 'Gamificación', href: '/dashboard/pacientes?view=gamification' },
  ],

  // Oportunidades — activeView: 'list' | 'scoring' | 'predictions' | 'queue' | 'pricing' | 'outreach' | 'competitors'
  '/dashboard/oportunidades': [
    { label: 'Todas', href: '/dashboard/oportunidades?view=list' },
    { label: 'Lead scoring', href: '/dashboard/oportunidades?view=scoring', description: 'IA prioriza leads' },
    { label: 'Predicciones', href: '/dashboard/oportunidades?view=predictions', description: 'Probabilidad de conversión' },
    { label: 'Cola de trabajo', href: '/dashboard/oportunidades?view=queue', description: 'Próximas acciones' },
    { label: 'Pricing sugerido', href: '/dashboard/oportunidades?view=pricing' },
    { label: 'Outreach', href: '/dashboard/oportunidades?view=outreach', description: 'Campañas automáticas' },
    { label: 'Competidores', href: '/dashboard/oportunidades?view=competitors' },
  ],

  // Crecimiento — tab: 'funnel' | 'attribution' | 'ads' | 'seo'
  '/dashboard/crecimiento': [
    { label: 'Funnel', href: '/dashboard/crecimiento?tab=funnel', description: 'Conversión end-to-end' },
    { label: 'Atribución', href: '/dashboard/crecimiento?tab=attribution', description: 'Modelos multi-touch' },
    { label: 'Campañas de Ads', href: '/dashboard/crecimiento?tab=ads' },
    { label: 'Salud SEO', href: '/dashboard/crecimiento?tab=seo' },
  ],

  // Ajustes — activeTab: 'prompt' | 'services' | 'hours' | 'notifications' | 'templates' | 'bots' | 'channels' | 'security' | 'branding' | 'pricing' | 'apikeys' | 'webchat'
  '/dashboard/ajustes': [
    { label: 'System prompt', href: '/dashboard/ajustes?tab=prompt' },
    { label: 'Catálogo', href: '/dashboard/ajustes?tab=services' },
    { label: 'Horarios', href: '/dashboard/ajustes?tab=hours' },
    { label: 'Notificaciones', href: '/dashboard/ajustes?tab=notifications' },
    { label: 'Plantillas WA', href: '/dashboard/ajustes?tab=templates' },
    { label: 'Bots', href: '/dashboard/ajustes?tab=bots' },
    { label: 'Canales', href: '/dashboard/ajustes?tab=channels' },
    { label: 'Web Chat', href: '/dashboard/ajustes?tab=webchat' },
    { label: 'Pricing', href: '/dashboard/ajustes?tab=pricing' },
    { label: 'API Keys', href: '/dashboard/ajustes?tab=apikeys' },
    { label: 'Branding', href: '/dashboard/ajustes?tab=branding' },
    { label: 'Seguridad', href: '/dashboard/ajustes?tab=security' },
  ],
}

export function getSubpages(href: string): Subpage[] | undefined {
  return NAV_SUBPAGES[href]
}
