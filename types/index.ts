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
  total_interactions: number
  total_inbound?: number
  total_outbound?: number
  preferred_hour?: number
  preferred_day?: number
  days_since_last_contact?: number
  conversion_probability?: number
  churn_probability?: number
  no_show_probability?: number
  avg_sentiment?: number
  sentiment_trend?: number
  complaint_count?: number
  preferred_time?: string
  avg_response_time_minutes?: number
  total_appointments?: number
  completed_appointments?: number
  cancelled_appointments?: number
  no_show_appointments?: number
  conversion_rate?: number
  show_rate?: number
  total_revenue?: number
  total_transactions?: number
  avg_transaction_value?: number
  lifetime_value?: number
  total_spent?: number
  avg_ticket?: number
  days_since_last_interaction?: number
  predicted_ltv?: number
  engagement_score?: number
  risk_level?: string
  last_intent?: string
  top_interests?: string[]
  has_sent_audio?: boolean
  has_sent_image?: boolean
  has_sent_document?: boolean
}

export interface Appointment {
  id: string
  patient_id: string
  start_time: string
  end_time: string
  service_name: string
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'REQUESTED' | 'RESCHEDULED'
  created_at: string
  patients?: { full_name: string; phone: string }
}

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
  status: string
  system_prompt?: string
  whatsapp_phone_id?: string
  config_settings?: Record<string, unknown>
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
