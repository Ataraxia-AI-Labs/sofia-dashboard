import type { Organization } from '@/types'

// ============================================================
// PLAN FEATURE GATING
// Maps dashboard routes to required plan features.
// Mirrors backend config.py PLAN_FEATURES exactly.
// ============================================================

export type PlanTier = Organization['plan']

/** Backend features each plan includes */
const PLAN_FEATURES: Record<PlanTier, Set<string>> = {
  TRIAL: new Set([
    'whatsapp', 'agendamiento', 'dashboard_basico',
    'links_pago', 'followup_bots',
    'context_optimizer', 'patient_memory_basic',
    'conversation_summaries',
  ]),
  STARTER: new Set([
    'whatsapp', 'agendamiento', 'dashboard_basico',
    'links_pago', 'followup_bots', 'pipeline_crm',
    'context_optimizer', 'patient_memory_basic',
    'conversation_summaries',
    'growth_referrals', 'growth_reputation',
  ]),
  PRO: new Set([
    'whatsapp', 'agendamiento', 'dashboard_basico',
    'voice_ai', 'links_pago', 'followup_bots', 'pipeline_crm',
    'webhooks', 'public_api_read', 'sdk_access',
    'context_optimizer', 'patient_memory_basic', 'patient_memory', 'personality_engine',
    'intent_v2', 'emotional_intelligence_basic', 'conversation_summaries',
    'growth_referrals', 'growth_reputation', 'growth_social_proof', 'growth_content',
    'own_models',
  ]),
  BUSINESS: new Set([
    'whatsapp', 'agendamiento', 'dashboard_basico',
    'voice_ai', 'outbound_calls', 'links_pago', 'followup_bots',
    'revenue_engine', 'data_lake_export', 'pipeline_crm', 'multi_sede',
    'webhooks', 'public_api_read', 'public_api', 'plugins',
    'marketplace_install', 'sdk_access',
    'context_optimizer', 'patient_memory_basic', 'patient_memory', 'personality_engine',
    'intent_v2', 'emotional_intelligence_basic', 'emotional_intelligence', 'conversation_summaries',
    'proactive_intelligence', 'staff_coaching_basic',
    'growth_referrals', 'growth_reputation', 'growth_social_proof', 'growth_content',
    'growth_ads', 'growth_seo', 'growth_landings', 'growth_attribution', 'growth_command_center',
    'own_models', 'model_factory',
  ]),
  ENTERPRISE: new Set([
    'whatsapp', 'agendamiento', 'dashboard_basico',
    'voice_ai', 'outbound_calls', 'links_pago', 'followup_bots',
    'revenue_engine', 'data_lake_export', 'pipeline_crm',
    'ab_testing', 'multi_sede', 'fine_tuning', 'api_access',
    'webhooks', 'public_api_read', 'public_api', 'public_api_bulk',
    'oauth2', 'plugins', 'marketplace_install', 'marketplace_publish',
    'sdk_access', 'sandbox',
    'context_optimizer', 'patient_memory_basic', 'patient_memory', 'personality_engine',
    'intent_v2', 'emotional_intelligence_basic', 'emotional_intelligence', 'conversation_summaries',
    'proactive_intelligence', 'staff_coaching_basic', 'staff_coaching',
    'growth_referrals', 'growth_reputation', 'growth_social_proof', 'growth_content',
    'growth_ads', 'growth_seo', 'growth_landings', 'growth_attribution', 'growth_command_center',
    'growth_network',
    'own_models', 'model_factory', 'data_marketplace', 'model_registry_admin',
  ]),
}

/**
 * Which backend feature is required to access each dashboard route.
 * Routes not listed here are always accessible (no plan gating).
 */
const ROUTE_REQUIRED_FEATURE: Record<string, string> = {
  // Always accessible (dashboard_basico):
  // /dashboard, /dashboard/conversaciones, /dashboard/pacientes, /dashboard/calendario
  // /dashboard/planes, /dashboard/facturacion, /dashboard/ajustes

  // Sales — require pipeline_crm (STARTER+)
  '/dashboard/pipeline': 'pipeline_crm',
  '/dashboard/oportunidades': 'pipeline_crm',
  '/dashboard/campanas': 'pipeline_crm',
  '/dashboard/pagos': 'links_pago',

  // Sales — referrals
  '/dashboard/referidos': 'growth_referrals',

  // Growth — tiered
  '/dashboard/crecimiento': 'growth_command_center',
  '/dashboard/contenido': 'growth_content',
  '/dashboard/resenas': 'growth_reputation',

  // Admin — tiered by feature
  '/dashboard/reportes': 'dashboard_basico',
  '/dashboard/datalake': 'data_lake_export',
  '/dashboard/auditoria': 'dashboard_basico',
  '/dashboard/automatizaciones': 'webhooks',

  // Platform
  '/dashboard/marketplace': 'marketplace_install',
  '/dashboard/webhooks': 'webhooks',
  '/dashboard/network': 'growth_network',
  '/dashboard/health': 'dashboard_basico',
}

/** Minimum plan needed to unlock a route */
const ROUTE_MIN_PLAN: Record<string, PlanTier> = {
  '/dashboard/datalake': 'BUSINESS',
  '/dashboard/network': 'ENTERPRISE',
  '/dashboard/crecimiento': 'BUSINESS',
  '/dashboard/contenido': 'PRO',
  '/dashboard/automatizaciones': 'PRO',
  '/dashboard/webhooks': 'PRO',
  '/dashboard/marketplace': 'BUSINESS',
}

/** Check if a plan has a specific feature */
export function planHasFeature(plan: PlanTier, feature: string): boolean {
  return PLAN_FEATURES[plan]?.has(feature) ?? false
}

/** Check if a plan can access a dashboard route */
export function canAccessByPlan(plan: PlanTier, pathname: string): boolean {
  // Find the matching route (longest prefix match)
  let bestMatch: string | null = null
  for (const route of Object.keys(ROUTE_REQUIRED_FEATURE)) {
    const isMatch = pathname === route || pathname.startsWith(route + '/')
    if (isMatch && (bestMatch === null || route.length > bestMatch.length)) {
      bestMatch = route
    }
  }

  if (!bestMatch) return true // No feature gate on this route

  const requiredFeature = ROUTE_REQUIRED_FEATURE[bestMatch]
  return planHasFeature(plan, requiredFeature)
}

/** Get the minimum plan required for a route (for upgrade CTA) */
export function getMinPlanForRoute(pathname: string): PlanTier | null {
  for (const route of Object.keys(ROUTE_MIN_PLAN)) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return ROUTE_MIN_PLAN[route]
    }
  }
  return null
}

/** Plan display names */
export const PLAN_DISPLAY_NAMES: Record<PlanTier, string> = {
  TRIAL: 'Trial',
  STARTER: 'Starter',
  PRO: 'Pro',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
}

/** Plan hierarchy for "upgrade to X" messaging */
const PLAN_ORDER: PlanTier[] = ['TRIAL', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE']

/** Get the next plan up from the current one */
export function getNextPlan(current: PlanTier): PlanTier | null {
  const idx = PLAN_ORDER.indexOf(current)
  if (idx === -1 || idx >= PLAN_ORDER.length - 1) return null
  return PLAN_ORDER[idx + 1]
}
