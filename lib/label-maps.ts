/**
 * Canonical label normalization for intents + opportunity types.
 *
 * Backend emits a mix of legacy English (PRICEINQUIRY, SCHEDULEAPPOINTMENT, WINBACK,
 * REFERRAL_POTENTIAL), new English (SALUDO, SATISFACTION), and partial Spanish (AGENDAR,
 * Reactivacion). This module unifies all variants to a single canonical Spanish key and
 * a user-facing Spanish display label.
 *
 * Use `normalizeIntent()` / `normalizeOpportunity()` before rendering anything user-facing.
 */

// ---------------------------------------------------------------------------
// INTENTS
// ---------------------------------------------------------------------------

/** Collapse legacy / alias intent keys → canonical Spanish key. */
const INTENT_CANONICAL: Record<string, string> = {
  // Duplicates → UNKNOWN
  UNKNOWN: 'UNKNOWN',
  OTRO: 'UNKNOWN',
  OTHER: 'UNKNOWN',
  SYSTEM_ERROR: 'UNKNOWN',

  // Agendar
  AGENDAR: 'AGENDAR',
  SCHEDULEAPPOINTMENT: 'AGENDAR',
  SCHEDULE_APPOINTMENT: 'AGENDAR',
  BOOK: 'AGENDAR',

  // Precio
  CONSULTAR_PRECIO: 'CONSULTAR_PRECIO',
  PRICEINQUIRY: 'CONSULTAR_PRECIO',
  PRICE_INQUIRY: 'CONSULTAR_PRECIO',
  PRICE: 'CONSULTAR_PRECIO',

  // Saludo
  SALUDO: 'SALUDO',
  GREETING: 'SALUDO',
  HELLO: 'SALUDO',

  // Cancelar
  CANCELAR: 'CANCELAR',
  CANCEL: 'CANCELAR',

  // Reagendar
  REAGENDAR: 'REAGENDAR',
  RESCHEDULE: 'REAGENDAR',

  // Queja
  QUEJA: 'QUEJA',
  COMPLAINT: 'QUEJA',

  // Consulta médica
  CONSULTA_MEDICA: 'CONSULTA_MEDICA',
  MEDICAL_INQUIRY: 'CONSULTA_MEDICA',

  // Seguimiento
  SEGUIMIENTO: 'SEGUIMIENTO',
  FOLLOWUP: 'SEGUIMIENTO',
  FOLLOW_UP: 'SEGUIMIENTO',

  // Satisfacción
  SATISFACCION: 'SATISFACCION',
  SATISFACTION: 'SATISFACCION',

  // Referido
  CONSULTAR_REFERIDO: 'CONSULTAR_REFERIDO',
  REFERRALINQUIRY: 'CONSULTAR_REFERIDO',
  REFERRAL_INQUIRY: 'CONSULTAR_REFERIDO',
}

/** Canonical intent key → user-facing Spanish label. */
const INTENT_DISPLAY: Record<string, string> = {
  UNKNOWN: 'Otro',
  AGENDAR: 'Agendar cita',
  CONSULTAR_PRECIO: 'Consultar precio',
  SALUDO: 'Saludo',
  CANCELAR: 'Cancelar cita',
  REAGENDAR: 'Reagendar cita',
  QUEJA: 'Queja',
  CONSULTA_MEDICA: 'Consulta medica',
  SEGUIMIENTO: 'Seguimiento',
  SATISFACCION: 'Satisfaccion',
  CONSULTAR_REFERIDO: 'Consultar referido',
}

/** Return canonical intent key (e.g. 'AGENDAR'). */
export function normalizeIntent(raw: string | undefined | null): string {
  if (!raw) return 'UNKNOWN'
  const up = String(raw).toUpperCase().replace(/[\s-]+/g, '_')
  return INTENT_CANONICAL[up] ?? up
}

/** Return human-readable Spanish label for any intent variant. */
export function intentLabel(raw: string | undefined | null): string {
  const key = normalizeIntent(raw)
  return INTENT_DISPLAY[key] ?? prettify(key)
}

/**
 * Merge a raw { intent: count } map into canonical buckets (summing duplicates).
 * Example: { WINBACK: 3, REACTIVACION: 2 } → { REACTIVACION: 5 }
 */
export function mergeIntentDistribution(raw: Record<string, number> | null | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw || {})) {
    const canon = normalizeIntent(k)
    out[canon] = (out[canon] || 0) + (Number(v) || 0)
  }
  return out
}

// ---------------------------------------------------------------------------
// OPPORTUNITIES
// ---------------------------------------------------------------------------

/** Collapse legacy / alias opportunity type keys → canonical key. */
const OPP_CANONICAL: Record<string, string> = {
  // Reactivación / winback
  REACTIVATION: 'REACTIVATION',
  REACTIVACION: 'REACTIVATION',
  WINBACK: 'REACTIVATION',
  WIN_BACK: 'REACTIVATION',

  // Referido
  REFERRAL: 'REFERRAL',
  REFERRAL_POTENTIAL: 'REFERRAL',
  REFERIDO: 'REFERRAL',

  // Precio / objeción
  PRICE_SENSITIVE: 'PRICE_SENSITIVE',
  PRICE_OBJECTION: 'PRICE_SENSITIVE',
  SENSIBLE_PRECIO: 'PRICE_SENSITIVE',

  // Otros — mantener como vienen
  HOT_LEAD: 'HOT_LEAD',
  LEAD_CALIENTE: 'HOT_LEAD',
  UPSELL: 'UPSELL',
  CROSS_SELL: 'CROSS_SELL',
  VENTA_CRUZADA: 'CROSS_SELL',
  HIGH_VALUE: 'HIGH_VALUE',
  ALTO_VALOR: 'HIGH_VALUE',
  EMERGENCY_MEDICAL: 'HIGH_VALUE',
  MULTI_PROCEDURE: 'MULTI_PROCEDURE',
  MULTIPROCEDIMIENTO: 'MULTI_PROCEDURE',
  CHURN_RISK: 'CHURN_RISK',
  RIESGO_ABANDONO: 'CHURN_RISK',
}

/** Canonical opp key → Spanish label (mirror of i18n opportunities.types). */
const OPP_DISPLAY: Record<string, string> = {
  HOT_LEAD: 'Lead Caliente',
  UPSELL: 'Upsell',
  REACTIVATION: 'Reactivacion',
  REFERRAL: 'Referido',
  CHURN_RISK: 'Riesgo Abandono',
  PRICE_SENSITIVE: 'Sensible a Precio',
  MULTI_PROCEDURE: 'Multi-procedimiento',
  HIGH_VALUE: 'Alto Valor',
  CROSS_SELL: 'Venta Cruzada',
}

export function normalizeOpportunity(raw: string | undefined | null): string {
  if (!raw) return 'UNKNOWN'
  const up = String(raw).toUpperCase().replace(/[\s-]+/g, '_')
  return OPP_CANONICAL[up] ?? up
}

export function opportunityLabel(raw: string | undefined | null): string {
  const key = normalizeOpportunity(raw)
  return OPP_DISPLAY[key] ?? prettify(key)
}

/** Merge a raw { opp_type: count } map into canonical buckets. */
export function mergeOpportunityDistribution(raw: Record<string, number> | null | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw || {})) {
    const canon = normalizeOpportunity(k)
    out[canon] = (out[canon] || 0) + (Number(v) || 0)
  }
  return out
}

// ---------------------------------------------------------------------------
// Fallback prettifier — turns SNAKE_CASE / CamelCase into "Title case"
// ---------------------------------------------------------------------------
function prettify(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}
