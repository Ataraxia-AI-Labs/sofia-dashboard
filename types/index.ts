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
  full_name: string
  phone: string
  email?: string
  acquisition_channel: string
  service_interest?: string
  city?: string
  created_at: string
  updated_at?: string
}

export interface Appointment {
  id: string
  patient_id: string
  start_time: string
  end_time: string
  service_name: string
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'REQUESTED'
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
  patients?: { full_name: string; phone: string }
}

export interface Organization {
  id: string
  name: string
  status: string
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
