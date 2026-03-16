// ============================================================
// AUTH TYPES (Sesion 18 — JWT auth on all endpoints)
// ============================================================

export interface AuthUser {
  user_id: string
  email: string
  org_id: string
  role: 'OWNER' | 'ADMIN' | 'STAFF'
}

// ============================================================
// AI TOOLS (13 tools — Sesion 17+)
// ============================================================

export type AITool =
  | 'consultar_disponibilidad'
  | 'agendar_cita'
  | 'cancelar_cita'
  | 'buscar_historial'
  | 'consultar_precio'
  | 'listar_servicios'
  | 'enviar_link_pago'
  | 'reagendar_cita'
  | 'confirmar_asistencia'
  | 'consultar_preparacion'
  | 'calificar_atencion'
  | 'enviar_referido'
  | 'transferir_llamada'

// ============================================================
// CONVERSATION STATE (from ai_brain)
// ============================================================

export type ConversationStage =
  | 'INITIAL'
  | 'DISCOVERY'
  | 'SCHEDULING'
  | 'FOLLOW_UP'
  | 'POST_SERVICE'
  | 'REACTIVATION'
  | 'NEGOTIATION'

export interface ConversationState {
  intent_actual: string
  servicio_mencionado: string
  fecha_mencionada: string
  hora_mencionada: string
  conversation_stage: ConversationStage
}

// ============================================================
// ANALYTICS TYPES
// ============================================================

export interface FullAnalytics {
  periodo: { desde: string; hasta: string; dias: number }
  conversiones: ConversionMetrics
  revenue: RevenueMetrics
  performance_ia: PerformanceMetrics
  oportunidades: OpportunityMetrics
  sub_bots: SubBotMetrics
}

export interface ConversionMetrics {
  total_mensajes_inbound: number
  pacientes_unicos: number
  pacientes_nuevos: number
  total_citas: number
  citas_confirmadas: number
  citas_completadas: number
  citas_canceladas: number
  citas_no_show: number
  tasa_conversion_pct: number
  tasa_asistencia_pct: number
  tasa_cancelacion_pct: number
  tasa_no_show_pct: number
  funnel: {
    mensajes: number
    pacientes: number
    citas: number
    completadas: number
  }
}

export interface RevenueMetrics {
  revenue_total: number
  revenue_pendiente: number
  revenue_pipeline: number
  total_transacciones: number
  ticket_promedio: number
  revenue_diario_promedio: number
  proyeccion_mensual: number
  moneda: string
}

export interface PerformanceMetrics {
  total_interacciones: number
  total_tokens: number
  total_costo_usd: number
  costo_promedio_por_interaccion_usd: number
  tokens_promedio_por_interaccion: number
  response_time_promedio_ms: number
  herramientas_usadas: Record<string, number>
  distribucion_intents: Record<string, number>
  proyeccion_costo_mensual_usd: number
}

export interface OpportunityMetrics {
  total: number
  por_tipo: Record<string, number>
  por_status: Record<string, number>
  valor_total_estimado: number
  valor_convertido: number
  tasa_conversion_oportunidades_pct: number
}

export interface SubBotMetrics {
  reminder_bot: { mensajes_enviados: number; descripcion: string }
  hunter_bot: { followups_enviados: number; conversiones_post_followup: number; descripcion: string }
  nurse_bot: { recordatorios_enviados: number; descripcion: string }
  total_mensajes_automaticos: number
}

// ============================================================
// ENTITY TYPES
// ============================================================

export interface Patient {
  id: string
  organization_id?: string
  full_name: string
  phone: string
  email?: string
  acquisition_channel: string
  service_interest?: string
  city?: string
  created_at: string
  updated_at?: string
}

/** Full patient detail (select *) includes extra DB columns */
export interface PatientDetail extends Patient {
  psychometrics?: Record<string, number>
  config_settings?: Record<string, unknown>
}

export interface PatientMLFeatures {
  patient_id: string
  organization_id?: string
  engagement_score?: number
  total_interactions: number
  total_inbound?: number
  total_outbound?: number
  total_appointments?: number
  completed_appointments?: number
  cancelled_appointments?: number
  no_show_count?: number
  no_show_appointments?: number
  total_revenue?: number
  avg_response_time_minutes?: number
  preferred_channel?: 'WHATSAPP' | 'VOICE_CALL' | 'INSTAGRAM' | 'MESSENGER'
  preferred_hour?: number
  preferred_day?: number
  preferred_time?: string
  avg_sentiment?: number
  sentiment_avg?: number
  sentiment_trend?: number
  complaint_count?: number
  days_since_last_contact?: number
  days_since_last_interaction?: number
  last_interaction_days_ago?: number
  churn_risk?: number
  churn_probability?: number
  conversion_probability?: number
  conversion_rate?: number
  no_show_probability?: number
  lifetime_value?: number
  predicted_ltv?: number
  referral_count?: number
  show_rate?: number
  total_transactions?: number
  avg_transaction_value?: number
  total_spent?: number
  avg_ticket?: number
  risk_level?: string
  last_intent?: string
  top_interests?: string[]
  has_sent_audio?: boolean
  has_sent_image?: boolean
  has_sent_document?: boolean
}

// ============================================================
// APPOINTMENT TYPES (Sesion 18 — added SCHEDULED)
// ============================================================

export type AppointmentStatus =
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'REQUESTED'
  | 'RESCHEDULED'
  | 'SCHEDULED'

export interface Appointment {
  id: string
  patient_id: string
  start_time: string
  end_time: string
  service_name: string
  status: AppointmentStatus
  created_at: string
  staff_id?: string | null
  series_id?: string | null
  previous_start_time?: string | null
  previous_end_time?: string | null
  patients?: { full_name: string; phone: string }
}

export interface StaffMember {
  id: string
  user_id: string
  display_name: string
  role: 'OWNER' | 'ADMIN' | 'STAFF'
}

export interface AppointmentSeries {
  id: string
  organization_id: string
  patient_id: string
  staff_id?: string | null
  service_name: string
  recurrence_rule: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'
  recurrence_interval: number
  day_of_week?: number | null
  preferred_time: string
  total_occurrences: number
  generated_count: number
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  starts_at: string
  ends_at?: string | null
  notes: string
  created_at: string
  patients?: { full_name: string; phone: string }
}

// ============================================================
// OPPORTUNITY TYPES (Sesion 18 — explicit union)
// ============================================================

export type OpportunityType =
  | 'HOT_LEAD'
  | 'UPSELL'
  | 'REFERRAL'
  | 'REACTIVATION'
  | 'MULTI_PROCEDURE'
  | 'PRICE_SENSITIVE'
  | 'HIGH_VALUE'
  | 'CHURN_RISK'

export interface Opportunity {
  id: string
  opportunity_type: string
  status: 'DETECTED' | 'ACTED_ON' | 'CONVERTED' | 'EXPIRED' | 'DISMISSED'
  estimated_value: number
  notes: string
  created_at: string
  patient_id?: string
  patients?: { full_name: string; phone: string }
}

export interface Organization {
  id: string
  name: string
  plan: 'TRIAL' | 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE'
  status: string
  system_prompt?: string
  whatsapp_phone_id?: string
  config_settings?: Record<string, unknown>
  created_at?: string
  trial_ends_at?: string
  plan_started_at?: string
  billing_cycle?: 'MONTHLY' | 'ANNUAL'
}

// ============================================================
// BRANCHES (Multi-Sede)
// ============================================================

export interface Branch {
  id: string
  organization_id: string
  name: string
  address?: string
  phone?: string
  city?: string
  is_active: boolean
}

// ============================================================
// WHATSAPP TEMPLATES (B7)
// ============================================================

export type WATemplateCategory = 'APPOINTMENT_REMINDER' | 'FOLLOW_UP' | 'TREATMENT_REMINDER' | 'PAYMENT_LINK' | 'WELCOME' | 'CUSTOM'

export interface WhatsAppTemplate {
  id: string
  name: string
  category: WATemplateCategory
  language: string
  description?: string
  is_active: boolean
}

// ============================================================
// BOT EXECUTION TYPES (Sesion 18 — explicit bot types)
// ============================================================

export type BotType = 'REMINDER' | 'HUNTER' | 'NURSE' | 'VOICE_CONFIRM' | 'VIP_FOLLOWUP' | 'BIRTHDAY'
export type BotStatus = 'SUCCESS' | 'ERROR' | 'PARTIAL'

export interface BotExecutionLog {
  id: string
  bot_type: BotType
  status: BotStatus
  messages_sent: number
  errors: number
  duration_ms: number
  details: Record<string, unknown>
  organization_id?: string
  created_at: string
}

// ============================================================
// CONFIG TYPES (Sesion 18 — Birthday Bot, Vacation Mode)
// ============================================================

export interface BirthdayBotConfig {
  enabled: boolean
  message_template: string  // Supports {nombre}, {clinica}
}

export interface VacationModeConfig {
  vacation_mode: boolean
  vacation_return_date: string  // ISO date, e.g. "2026-03-15"
}

// ============================================================
// PAYMENTS & ATTRIBUTION
// ============================================================

export interface Payment {
  id: string
  patient_id: string
  organization_id: string
  amount_cop: number
  currency?: string
  status: string
  service_name?: string
  payment_method_type?: string
  reference?: string
  link_url?: string
  created_at: string
  patients?: { full_name: string; phone: string }
}

export interface RevenueAttribution {
  resumen: {
    total_revenue: number
    total_pending: number
    total_pagos: number
    pagos_pendientes: number
    ticket_promedio: number
    roi_estimado: number
    costo_ia_usd: number
    tiempo_promedio_a_pago_horas: number
    total_transacciones?: number
  }
  attribution: {
    por_canal: Record<string, number>
    por_servicio: Record<string, number>
    por_dia: Record<string, number>
  }
  top_conversaciones?: {
    patient: string
    service: string
    conversation_snippet: string
    payment_amount: number
    paid_at: string
  }[]
}

// ============================================================
// SERVICES & BUSINESS HOURS
// ============================================================

export interface ServiceCatalog {
  id: string
  organization_id: string
  name: string
  description?: string
  price: number
  currency: string
  duration_minutes: number
  category: string
  requires_deposit: boolean
  deposit_amount: number
  is_active: boolean
}

export interface BusinessHour {
  id: string
  organization_id: string
  day_of_week: number
  open_time: string
  close_time: string
  slot_duration_minutes: number
  buffer_minutes?: number
  is_open: boolean
  is_active: boolean
}

// ============================================================
// STAFF NOTES & TREATMENTS
// ============================================================

export interface StaffNote {
  id: string
  patient_id?: string
  staff_user_id?: string
  note_content: string
  sentiment_label?: string
  is_private: boolean
  created_at: string
}

export interface Treatment {
  id: string
  patient_id: string
  organization_id: string
  appointment_id?: string
  treatment_name: string
  medication: string
  dosage: string
  frequency_hours: number
  start_date: string
  end_date: string
  next_reminder_at?: string
  total_reminders_sent: number
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  notes?: string
  created_at: string
  patients?: { full_name: string; phone: string }
}

// ============================================================
// MEDIA
// ============================================================

export interface PatientMedia {
  id: string
  content_type: 'AUDIO' | 'IMAGE' | 'DOCUMENT'
  media_url?: string
  transcription?: string
  raw_content?: string
  created_at: string
}

// ============================================================
// VOICE AI METRICS
// ============================================================

export interface VoiceMetrics {
  total_calls: number
  total_whatsapp: number
  avg_duration_seconds: number
  appointments_by_voice: number
  appointments_by_whatsapp: number
  voice_pct: number
}

// ============================================================
// PIPELINE TYPES
// ============================================================

export type PipelineStage = 'LEAD' | 'CONTACTADO' | 'CITA_AGENDADA' | 'CITA_COMPLETADA' | 'PAGADO' | 'RECURRENTE'

export interface PipelinePatient {
  id: string
  full_name: string
  phone: string
  email?: string
  service_interest?: string
  created_at: string
  stage: PipelineStage
  interaction_count: number
  appointment_count: number
  completed_count: number
  has_paid: boolean
}

// ============================================================
// SYSTEM HEALTH
// ============================================================

export interface CircuitBreakerDetail {
  state: string
  name: string
  failure_count: number
  success_count: number
  uptime_seconds: number
}

export interface SystemHealth {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL'
  uptime_human?: string
  uptime_seconds?: number
  database?: string
  version?: string
  message_queue?: {
    pending: number
    [key: string]: unknown
  }
  circuit_breakers?: Record<string, CircuitBreakerDetail>
  error?: string
}

// ============================================================
// DATA LAKE
// ============================================================

export interface DataLakeModel {
  model_name: string
  status: string
  base_model: string
  training_samples: number
  training_loss: number
}

export interface DataLakeStats {
  raw_data_total: number
  training_data_total: number
  quality_promedio: number
  modelos_entrenados: number
  listo_para_finetuning: boolean
  recomendacion?: string
  training_exported?: number
  ultimo_modelo?: DataLakeModel
  ultimo_entrenamiento?: string
  por_intent: Record<string, number>
  por_tipo?: Record<string, number>
}

export interface DataLakeExportResult {
  message?: string
  error?: string
  jsonl_preview?: string
  export_batch?: string
  stats?: {
    total: number
    tokens_estimados: number
  }
  costo_estimado_usd?: number
  recomendacion?: string
}

// ============================================================
// SUBSCRIPTIONS & BILLING
// ============================================================

export interface Subscription {
  id: string
  organization_id: string
  plan: 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE'
  billing_cycle: 'MONTHLY' | 'ANNUAL'
  status: 'ACTIVE' | 'PAST_DUE' | 'GRACE_PERIOD' | 'CANCELLED' | 'EXPIRED'
  wompi_payment_source_id?: number
  payment_method_type?: string
  payment_method_last_four?: string
  payment_method_brand?: string
  customer_email: string
  amount_cop: number
  current_period_start: string
  current_period_end: string
  next_billing_date: string
  cancelled_at?: string
  cancel_at_period_end: boolean
  retry_count: number
  grace_period_ends_at?: string
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  organization_id: string
  subscription_id?: string
  wompi_transaction_id?: string
  wompi_reference?: string
  wompi_status?: string
  amount_cop: number
  currency: string
  plan: string
  billing_cycle: string
  period_start?: string
  period_end?: string
  description?: string
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'VOID'
  paid_at?: string
  failed_at?: string
  failure_reason?: string
  created_at: string
}

export interface UsageData {
  message_count: number
  message_limit: number | null
  percent: number
  period_start: string
  period_end: string
}

export interface WompiConfig {
  public_key: string
  sandbox: boolean
  acceptance_token: string | null
}

// ============================================================
// INTERACTION LOGS
// ============================================================

export interface InteractionAnnotation {
  interaction_id: string
  rating: 'thumbs_up' | 'thumbs_down'
  notes?: string
  annotated_by?: string
  updated_at?: string
}

export interface InteractionLog {
  id: string
  organization_id: string
  patient_id: string
  channel: string
  direction: 'INBOUND' | 'OUTBOUND'
  message_content: string
  intent?: string
  sentiment_score?: number
  sentiment_label?: string
  tools_used?: string[]
  tokens_used?: number
  cost_usd?: number
  response_time_ms?: number
  conversation_id?: string
  created_at: string
  annotation?: InteractionAnnotation | null
  // Joined from patients table (if backend returns it)
  patients?: { full_name: string; phone: string }
}

// ============================================================
// FINE-TUNING MODELS (P4-01)
// ============================================================

export type ModelStatus = 'TRAINING' | 'COMPLETED' | 'DEPLOYED' | 'FAILED'

export interface FineTuneModel {
  id: string
  organization_id: string
  model_name: string
  base_model: string
  status: ModelStatus
  training_samples: number
  training_loss?: number | null
  created_at: string
  deployed_at?: string | null
}

export interface ModelEvaluation {
  id: string
  model_id: string
  similarity_score: number
  token_savings_pct: number
  response_time_ms: number
  tone_consistency: number
  overall_score: number
  created_at: string
}

export interface ModelComparison {
  model_a: ModelEvaluation
  model_b: ModelEvaluation
}

// ============================================================
// LEAD SCORING (P4-02)
// ============================================================

export type LeadClassification = 'HOT' | 'WARM' | 'COLD' | 'DEAD'

export interface LeadScore {
  patient_id: string
  score: number
  classification: LeadClassification
  engagement_pct: number
  intent_pct: number
  behavioral_pct: number
  negative_signals: number
  scored_at: string
  patients?: { full_name: string; phone: string }
}

export interface LeadInsights {
  total_scored: number
  distribution: Record<LeadClassification, number>
  top_converting_features: string[]
  avg_score: number
}

export interface LeadScoreAllResult {
  scored: number
  message: string
}

// ============================================================
// PATIENT SEGMENTATION (P4-04)
// ============================================================

export interface PatientSegment {
  id: string
  organization_id: string
  segment_label: string
  patient_count: number
  avg_ticket: number
  top_services: string[]
  color: string
  created_at: string
}

export interface SegmentPatient {
  patient_id: string
  full_name: string
  phone: string
  similarity_score?: number
  avg_ticket?: number
  total_appointments?: number
}

export interface CampaignSuggestion {
  segment_id: string
  segment_label: string
  campaign_type: string
  subject: string
  message: string
  channel: string
  estimated_reach: number
}

export interface ClusteringResult {
  segments_created: number
  patients_assigned: number
  message: string
}

export interface EmbeddingsResult {
  embeddings_generated: number
  message: string
}

export interface SimilarPatient {
  patient_id: string
  full_name: string
  phone: string
  similarity_score: number
  segment_label?: string
}

// ============================================================
// CONVERSION PREDICTION (P4-05)
// ============================================================

export interface ConversionPrediction {
  patient_id: string
  conversion_probability: number
  best_contact_time: string
  best_contact_day: string
  factors: ConversionFactor[]
  predicted_at: string
}

export interface ConversionFactor {
  name: string
  impact: number
  direction: 'positive' | 'negative'
}

export interface ConversionInsights {
  avg_conversion_rate: number
  quincena_boost: number
  top_factors: ConversionFactor[]
  heatmap: Record<string, Record<string, number>>
  total_predicted: number
}

export interface FollowUpItem {
  patient_id: string
  full_name: string
  phone: string
  conversion_probability: number
  best_contact_time: string
  best_contact_day: string
  last_interaction_days_ago: number
}

export interface PredictAllResult {
  predicted: number
  message: string
}

// ============================================================
// DYNAMIC PRICING (P4-03)
// ============================================================

export interface PricingRules {
  max_discount_pct: number
  max_premium_pct: number
  demand_weight: number
  segment_weight: number
  temporal_weight: number
  excluded_services: string[]
  auto_apply: boolean
  min_prices: Record<string, number>
  max_prices: Record<string, number>
}

export interface PriceSuggestion {
  id: string
  service_id: string
  patient_id: string
  base_price: number
  suggested_price: number
  demand_factor: number
  segment_factor: number
  temporal_factor: number
  final_factor: number
  confidence: number
  status: string
  target_date: string
  created_at: string
}

export interface PricingInsights {
  avg_discount_pct: number
  total_suggestions: number
  applied_count: number
  rejected_count: number
  revenue_impact: number
  most_adjusted_services: Array<{ service: string; adjustments: number }>
}

export interface SuggestPriceRequest {
  service_id: string
  patient_id: string
  target_date?: string
}

export interface SuggestPriceBatchRequest {
  items: SuggestPriceRequest[]
}

// ============================================================
// NETWORK INTELLIGENCE (P4-07)
// ============================================================

export interface NetworkBenchmarks {
  conversion_rate: { yours: number; market_avg: number; percentile: number }
  avg_ticket: { yours: number; market_avg: number; percentile: number }
  satisfaction: { yours: number; market_avg: number; percentile: number }
  response_time: { yours: number; market_avg: number; percentile: number }
}

export interface ServiceTrend {
  service_name: string
  trend: 'UP' | 'DOWN' | 'STABLE'
  change_pct: number
  demand_count: number
}

export interface PricingBenchmark {
  service: string
  your_price: number
  market_min: number
  market_avg: number
  market_max: number
}

export interface ConversionPattern {
  pattern: string
  impact_factor: number
  description: string
}

export interface OptimalHour {
  hour: number
  day: string
  score: number
}

export interface NetworkAlert {
  id: string
  alert_type: string
  severity: 'INFO' | 'WARNING' | 'CRITICAL'
  title: string
  description: string
  is_read: boolean
  created_at: string
}

export interface NetworkNarrative {
  narrative: string
  generated_at: string
}

export interface NetworkStats {
  total_clinics: number
  total_countries: number
  total_interactions: number
  total_patients: number
}

// ============================================================
// DUPLICATE DETECTION (P5-11)
// ============================================================

export interface DuplicateCandidate {
  id: string
  patient_a_id: string
  patient_b_id: string
  patient_a_name: string
  patient_b_name: string
  patient_a_phone: string
  patient_b_phone: string
  similarity_score: number
  signals: {
    name_similarity?: number
    id_match?: boolean
    phone_similarity?: number
    behavioral_score?: number
    temporal_proximity?: number
  }
  status: 'PENDING' | 'CONFIRMED' | 'MERGED' | 'DISMISSED'
  created_at: string
}

export interface DuplicateStats {
  total_detected: number
  pending_review: number
  merged: number
  dismissed: number
}

// ============================================================
// LIFETIME VALUE PREDICTION (P5-12)
// ============================================================

export type LTVTier = 'DIAMOND' | 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE'
export type LTVTrend = 'RISING' | 'STABLE' | 'DECLINING'

export interface LTVPrediction {
  id: string
  patient_id: string
  patient_name: string
  predicted_ltv_12m: number
  ltv_tier: LTVTier
  confidence: number
  factors: {
    historical_score: number
    service_affinity: number
    engagement_score: number
    demographic_factor: number
  }
  trend: LTVTrend
  predicted_at: string
}

export interface LTVInsights {
  avg_ltv: number
  total_predicted_revenue: number
  tier_distribution: Record<string, number>
  best_channel: string
  best_channel_avg_ltv: number
}

export interface CohortData {
  cohort_month: string
  patient_count: number
  avg_ltv: number
  total_ltv: number
}
