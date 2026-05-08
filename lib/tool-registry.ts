import type { LucideIcon } from 'lucide-react'
import {
  UserPlus, UserCog, StickyNote, Search as SearchIcon, Merge, UserX,
  Calendar, CalendarClock, CalendarX, RepeatIcon, Clock,
  Zap, MessageSquareShare, Workflow, Target,
  Users, UserPlus2, ShieldCheck,
  MapPin, Building, Tag, Palette, Image as ImageIcon,
  Star, MessageCircle, BarChart3, FileBarChart, Wallet,
  Webhook, KeyRound, Puzzle, Gift, Trophy,
  Phone, PhoneIncoming, PhoneOff, Pill, Activity,
  BrainCircuit, Sparkles, MessageCirclePlus,
} from 'lucide-react'

export type ToolCategory =
  | 'patients'
  | 'appointments'
  | 'services'
  | 'growth'
  | 'team'
  | 'branding'
  | 'reviews'
  | 'analytics'
  | 'integrations'
  | 'workflows'
  | 'voice'
  | 'treatments'

export type ToolRole = 'OWNER' | 'ADMIN' | 'STAFF'

export interface ToolDef {
  id: string
  category: ToolCategory
  icon: LucideIcon
  label: string            // Short UI label
  description: string      // Short description (<60 chars)
  prompt: string           // Pre-formed prompt injected to chat input
  minRole: ToolRole        // STAFF means everyone can use it
  status: 'live' | 'soon'  // implemented or roadmap
  hot?: boolean            // highlight as frequent / high-value
}

// Precedence for role lock: OWNER > ADMIN > STAFF.
const ROLE_WEIGHT: Record<ToolRole, number> = { STAFF: 1, ADMIN: 2, OWNER: 3 }
export function canUseTool(userRole: ToolRole, tool: ToolDef): boolean {
  return ROLE_WEIGHT[userRole] >= ROLE_WEIGHT[tool.minRole]
}

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  patients: 'Personas',
  appointments: 'Agenda',
  services: 'Servicios',
  growth: 'Crecimiento',
  team: 'Equipo',
  branding: 'Marca',
  reviews: 'Reseñas',
  analytics: 'Inteligencia',
  integrations: 'Integraciones',
  workflows: 'Automatizaciones',
  voice: 'Voz',
  treatments: 'Tratamientos',
}

export const CATEGORY_ORDER: ToolCategory[] = [
  'patients', 'appointments', 'treatments', 'services',
  'growth', 'reviews', 'voice',
  'workflows', 'team', 'branding', 'integrations', 'analytics',
]

// =======================================================
// REGISTRY — 45 tools propuestas en DB_MAP (10 live + 35 soon)
// =======================================================

export const TOOL_REGISTRY: ToolDef[] = [
  // -------- PACIENTES (patients)
  { id: 'find_patient', category: 'patients', icon: SearchIcon, label: 'Buscar paciente', description: 'Encuentra por nombre o teléfono', prompt: 'Busca al paciente ', minRole: 'STAFF', status: 'live', hot: true },
  { id: 'create_patient', category: 'patients', icon: UserPlus, label: 'Crear paciente', description: 'Registra un paciente nuevo', prompt: 'Crea un paciente nuevo: ', minRole: 'STAFF', status: 'live', hot: true },
  { id: 'update_patient', category: 'patients', icon: UserCog, label: 'Editar paciente', description: 'Actualiza datos de un paciente', prompt: 'Actualiza los datos de ', minRole: 'STAFF', status: 'soon' },
  { id: 'add_staff_note', category: 'patients', icon: StickyNote, label: 'Agregar nota', description: 'Nota privada del equipo', prompt: 'Anota lo siguiente para el paciente ', minRole: 'STAFF', status: 'live', hot: true },
  { id: 'merge_duplicates', category: 'patients', icon: Merge, label: 'Merge duplicados', description: 'Fusiona dos registros', prompt: 'Une los pacientes duplicados ', minRole: 'ADMIN', status: 'soon' },
  { id: 'archive_patient', category: 'patients', icon: UserX, label: 'Archivar paciente', description: 'Soft delete', prompt: 'Archiva al paciente ', minRole: 'ADMIN', status: 'soon' },
  { id: 'generate_portal_link', category: 'patients', icon: KeyRound, label: 'Link portal', description: 'Genera link único paciente', prompt: 'Genera un link de portal para ', minRole: 'STAFF', status: 'soon' },

  // -------- AGENDA (appointments)
  { id: 'list_appointments', category: 'appointments', icon: Calendar, label: 'Ver agenda', description: 'Citas por fecha', prompt: '¿Qué citas tengo ', minRole: 'STAFF', status: 'live', hot: true },
  { id: 'book_appointment', category: 'appointments', icon: CalendarClock, label: 'Agendar cita', description: 'Crea nueva cita', prompt: 'Agenda una cita para ', minRole: 'STAFF', status: 'live', hot: true },
  { id: 'reschedule_appointment', category: 'appointments', icon: RepeatIcon, label: 'Reagendar', description: 'Cambia fecha/hora', prompt: 'Reagenda la cita de ', minRole: 'STAFF', status: 'live' },
  { id: 'cancel_appointment', category: 'appointments', icon: CalendarX, label: 'Cancelar cita', description: 'Cancela y notifica', prompt: 'Cancela la cita de ', minRole: 'STAFF', status: 'live' },
  { id: 'send_followup', category: 'appointments', icon: MessageSquareShare, label: 'Follow-up', description: 'Mensaje de seguimiento', prompt: 'Envíale un follow-up a ', minRole: 'STAFF', status: 'live' },
  { id: 'set_business_hours', category: 'appointments', icon: Clock, label: 'Horarios', description: 'Define horarios de atención', prompt: 'Define los horarios de atención: ', minRole: 'ADMIN', status: 'soon' },
  { id: 'create_recurring', category: 'appointments', icon: RepeatIcon, label: 'Serie de citas', description: 'Tratamiento con múltiples sesiones', prompt: 'Crea una serie recurrente para ', minRole: 'STAFF', status: 'soon' },

  // -------- TRATAMIENTOS (treatments)
  { id: 'create_treatment', category: 'treatments', icon: Pill, label: 'Crear tratamiento', description: 'Plan activo con medicación', prompt: 'Crea un tratamiento para ', minRole: 'STAFF', status: 'live', hot: true },
  { id: 'log_treatment_progress', category: 'treatments', icon: Activity, label: 'Registrar avance', description: 'Progreso del tratamiento', prompt: 'Anota el avance del tratamiento de ', minRole: 'STAFF', status: 'soon' },

  // -------- SERVICIOS (services)
  { id: 'create_service', category: 'services', icon: Tag, label: 'Crear servicio', description: 'Catálogo: nombre + precio', prompt: 'Crea un servicio nuevo: ', minRole: 'ADMIN', status: 'live', hot: true },
  { id: 'update_service_price', category: 'services', icon: Wallet, label: 'Cambiar precio', description: 'Actualiza precio de servicio', prompt: 'Cambia el precio del servicio ', minRole: 'ADMIN', status: 'soon' },
  { id: 'create_pricing_rule', category: 'services', icon: Zap, label: 'Regla de precio', description: 'Precio dinámico por condición', prompt: 'Crea una regla de precio: ', minRole: 'OWNER', status: 'soon' },

  // -------- CRECIMIENTO (growth)
  { id: 'list_opportunities', category: 'growth', icon: Target, label: 'Oportunidades', description: 'Radar de hot leads', prompt: '¿Qué oportunidades tengo ahora?', minRole: 'STAFF', status: 'live', hot: true },
  { id: 'get_funnel', category: 'growth', icon: BarChart3, label: 'Funnel', description: 'Conversión por etapa', prompt: 'Muéstrame el funnel últimos 30 días', minRole: 'ADMIN', status: 'live' },
  { id: 'create_campaign', category: 'growth', icon: MessageSquareShare, label: 'Campaña', description: 'Outreach segmentado', prompt: 'Crea una campaña para ', minRole: 'ADMIN', status: 'soon' },
  { id: 'create_ad_campaign', category: 'growth', icon: Zap, label: 'Campaña de ads', description: 'Meta/Google con presupuesto', prompt: 'Crea una campaña de ads ', minRole: 'ADMIN', status: 'soon' },
  { id: 'create_whatsapp_template', category: 'growth', icon: MessageCircle, label: 'Plantilla WhatsApp', description: 'Genera plantilla desde descripción', prompt: 'Crea una plantilla de WhatsApp llamada ', minRole: 'ADMIN', status: 'live', hot: true },
  { id: 'generate_referral_link', category: 'growth', icon: Gift, label: 'Link de referido', description: 'Link único para paciente', prompt: 'Genera un link de referido para ', minRole: 'STAFF', status: 'soon' },

  // -------- RESEÑAS (reviews)
  { id: 'reply_review', category: 'reviews', icon: Star, label: 'Responder reseña', description: 'Respuesta a review público', prompt: 'Responde esta reseña: ', minRole: 'STAFF', status: 'soon' },
  { id: 'trigger_nps', category: 'reviews', icon: MessageCirclePlus, label: 'Disparar NPS', description: 'Encuesta post-cita', prompt: 'Dispara encuesta NPS a ', minRole: 'ADMIN', status: 'soon' },

  // -------- GAMIFICACIÓN / REWARDS
  { id: 'create_reward', category: 'patients', icon: Trophy, label: 'Crear reward', description: 'Gamification: premio canjeable', prompt: 'Crea un reward llamado ', minRole: 'ADMIN', status: 'live', hot: true },

  // -------- COMPETIDORES
  { id: 'add_competitor', category: 'analytics', icon: SearchIcon, label: 'Agregar competidor', description: 'Monitorear clínica rival', prompt: 'Agrega como competidor a ', minRole: 'ADMIN', status: 'live', hot: true },

  // -------- SALA DE ESPERA
  { id: 'check_in_patient', category: 'patients', icon: UserPlus, label: 'Check-in paciente', description: 'Marcar como presente en sala', prompt: 'Haz check-in del paciente ', minRole: 'STAFF', status: 'live', hot: true },

  // -------- VOZ (voice)
  { id: 'configure_voice_channel', category: 'voice', icon: PhoneIncoming, label: 'Activar voz', description: 'Crea assistant Vapi per sede', prompt: 'Activa el canal de voz para la sede ', minRole: 'OWNER', status: 'soon' },
  { id: 'outbound_call', category: 'voice', icon: Phone, label: 'Llamada saliente', description: 'SofIA llama al paciente', prompt: 'Llama a ', minRole: 'ADMIN', status: 'soon' },

  // -------- AUTOMATIZACIONES (workflows)
  { id: 'create_workflow', category: 'workflows', icon: Workflow, label: 'Workflow', description: 'IF-THEN en lenguaje natural', prompt: 'Crea un workflow: si ', minRole: 'ADMIN', status: 'soon', hot: true },
  { id: 'queue_proactive', category: 'workflows', icon: Sparkles, label: 'Mensaje proactivo', description: 'Envío programado', prompt: 'Programa un mensaje a ', minRole: 'ADMIN', status: 'soon' },

  // -------- EQUIPO (team)
  { id: 'invite_staff', category: 'team', icon: UserPlus2, label: 'Invitar staff', description: 'Email + rol', prompt: 'Invita al equipo a ', minRole: 'ADMIN', status: 'live', hot: true },
  { id: 'update_staff_role', category: 'team', icon: ShieldCheck, label: 'Cambiar rol', description: 'OWNER/ADMIN/STAFF', prompt: 'Cambia el rol de ', minRole: 'OWNER', status: 'soon' },
  { id: 'create_branch', category: 'team', icon: Building, label: 'Crear sede', description: 'Multi-sede: nueva sucursal', prompt: 'Crea una nueva sede: ', minRole: 'OWNER', status: 'live', hot: true },
  { id: 'assign_staff_branch', category: 'team', icon: MapPin, label: 'Asignar a sede', description: 'Staff ↔ sede + schedule', prompt: 'Asigna al staff ', minRole: 'ADMIN', status: 'soon' },
  { id: 'generate_coaching_tip', category: 'team', icon: BrainCircuit, label: 'Tip de coaching', description: 'Basado en conversaciones', prompt: 'Genera un tip de coaching para ', minRole: 'ADMIN', status: 'soon' },

  // -------- MARCA (branding)
  { id: 'set_brand_colors', category: 'branding', icon: Palette, label: 'Colores marca', description: 'Paleta white-label', prompt: 'Cambia los colores de marca a ', minRole: 'OWNER', status: 'soon' },
  { id: 'update_system_prompt', category: 'branding', icon: BrainCircuit, label: 'Ajustar prompt', description: 'Personalidad de SofIA', prompt: 'Actualiza el prompt de SofIA: ', minRole: 'OWNER', status: 'soon' },
  { id: 'upload_logo', category: 'branding', icon: ImageIcon, label: 'Subir logo', description: 'PNG de la clínica', prompt: '', minRole: 'OWNER', status: 'soon' },

  // -------- INTEGRACIONES (integrations)
  { id: 'register_webhook', category: 'integrations', icon: Webhook, label: 'Webhook saliente', description: 'URL + eventos', prompt: 'Registra un webhook: ', minRole: 'ADMIN', status: 'soon' },
  { id: 'create_api_key', category: 'integrations', icon: KeyRound, label: 'API Key', description: 'Token con scopes', prompt: 'Crea una API key llamada ', minRole: 'OWNER', status: 'live', hot: true },
  { id: 'install_connector', category: 'integrations', icon: Puzzle, label: 'Instalar plugin', description: 'Marketplace de conectores', prompt: 'Instala el plugin ', minRole: 'ADMIN', status: 'soon' },

  // -------- INTELIGENCIA (analytics)
  { id: 'get_revenue', category: 'analytics', icon: Wallet, label: 'Revenue', description: 'Ingresos por período', prompt: '¿Cuánto he facturado ', minRole: 'ADMIN', status: 'live', hot: true },
  { id: 'get_org_snapshot', category: 'analytics', icon: FileBarChart, label: 'Reporte del día', description: 'Resumen ejecutivo', prompt: 'Dame el reporte de hoy', minRole: 'STAFF', status: 'live', hot: true },
  { id: 'top_patients', category: 'analytics', icon: Trophy, label: 'Top pacientes', description: 'Ranking LTV', prompt: '¿Quiénes son mis mejores pacientes?', minRole: 'ADMIN', status: 'soon' },
  { id: 'churn_risk', category: 'analytics', icon: UserX, label: 'Pacientes en riesgo', description: 'Probabilidad de churn', prompt: 'Identifica pacientes en riesgo de churn', minRole: 'ADMIN', status: 'live' },
]

export function toolsByCategory(userRole: ToolRole, query: string = ''): Map<ToolCategory, ToolDef[]> {
  const q = query.trim().toLowerCase()
  const map = new Map<ToolCategory, ToolDef[]>()
  for (const cat of CATEGORY_ORDER) map.set(cat, [])
  for (const tool of TOOL_REGISTRY) {
    if (q) {
      const haystack = `${tool.label} ${tool.description} ${CATEGORY_LABELS[tool.category]}`.toLowerCase()
      if (!haystack.includes(q)) continue
    }
    map.get(tool.category)?.push(tool)
  }
  // Remove empty categories
  for (const cat of Array.from(map.keys())) {
    if ((map.get(cat) || []).length === 0) map.delete(cat)
  }
  // Sort within: hot first, live before soon, then alpha
  for (const cat of map.keys()) {
    const arr = map.get(cat)!
    arr.sort((a, b) => {
      const rankA = (a.hot ? 0 : 10) + (a.status === 'live' ? 0 : 5)
      const rankB = (b.hot ? 0 : 10) + (b.status === 'live' ? 0 : 5)
      if (rankA !== rankB) return rankA - rankB
      return a.label.localeCompare(b.label)
    })
  }
  return map
}

export function flattenForKeyboard(map: Map<ToolCategory, ToolDef[]>): ToolDef[] {
  const out: ToolDef[] = []
  for (const cat of CATEGORY_ORDER) {
    const list = map.get(cat)
    if (list) out.push(...list)
  }
  return out
}
