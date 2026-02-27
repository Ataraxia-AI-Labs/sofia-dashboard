# DASHBOARD SYNC INSTRUCTIONS — Sesion 18 Security Update
## Para el Claude Code del Dashboard Next.js

**Fecha:** 22 Febrero 2026
**Contexto:** El backend ahora requiere JWT Bearer en TODOS los endpoints del dashboard (43+). Este documento contiene todo lo que el dashboard necesita actualizar para ser coherente con el backend.

---

## 1. AUTHENTICATION — JWT Bearer en TODOS los Endpoints

### Cambio critico
El backend ahora rechaza con `401 Unauthorized` cualquier request sin `Authorization: Bearer <token>` en TODOS los endpoints del dashboard API.

### Que hacer en el dashboard

**1.1 Verificar que `authFetch()` (o el equivalente) envie el JWT en TODOS los API calls:**

```typescript
// El patron correcto — CADA fetch al backend debe incluir:
const response = await fetch(`${API_BASE}/patients/${orgId}`, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
});
```

**1.2 Manejar respuestas 401 y 403 globalmente:**

```typescript
// En el wrapper de fetch o en un interceptor:
if (response.status === 401) {
  // Token expired o invalid — redirigir a login
  await supabase.auth.signOut();
  router.push('/login');
  return;
}

if (response.status === 403) {
  // Access denied — usuario intentando acceder a org que no es suya
  toast.error('No tienes acceso a esta organizacion');
  router.push('/dashboard');
  return;
}
```

**1.3 Refresh token antes de expirar:**

```typescript
// Supabase JS auto-refreshes, pero verificar que onAuthStateChange este configurado:
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    // Actualizar token en el store/context
  }
  if (event === 'SIGNED_OUT') {
    router.push('/login');
  }
});
```

### Endpoints publicos (NO requieren auth)
Estos endpoints NO cambiaron y siguen siendo publicos:
- `GET /` — Health check
- `GET /health` — System health
- `GET /health/breakers` — Circuit breakers
- `GET /webhook` + `POST /webhook` — Meta webhooks
- `GET /privacy` + `GET /terms` + `GET /data-deletion` — Legal
- `POST /vapi/chat/completions` + `POST /vapi/webhook` — Vapi (auth propia)
- `POST /payments/webhook` — Wompi (auth propia)
- `GET /dashboard` + `GET /dashboard/{org_id}` — HTML pages (legacy)

---

## 2. STANDARDIZED ERROR FORMAT

### Todas las respuestas de error ahora tienen este formato:

```typescript
interface APIError {
  error: true;
  status_code: number;
  message: string;
}
```

**Ejemplo:**
```json
{"error": true, "status_code": 401, "message": "Authorization header required"}
{"error": true, "status_code": 403, "message": "Access denied"}
{"error": true, "status_code": 404, "message": "Paciente no encontrado"}
{"error": true, "status_code": 422, "message": "Validation error..."}
{"error": true, "status_code": 429, "message": "5 per 1 minute"}
```

### Que hacer en el dashboard

Actualizar el error handling para usar `response.message` en vez de `response.detail`:

```typescript
// ANTES (inconsistente):
const data = await response.json();
toast.error(data.detail || data.error || 'Error');

// AHORA (estandarizado):
const data = await response.json();
if (data.error) {
  toast.error(data.message);
}
```

---

## 3. NEW TYPESCRIPT INTERFACES

### 3.1 Auth Types

```typescript
interface AuthUser {
  user_id: string;
  email: string;
  org_id: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF';
}
```

### 3.2 AI Tools (ahora 13, antes 7)

```typescript
type AITool =
  | 'consultar_disponibilidad'
  | 'agendar_cita'
  | 'cancelar_cita'
  | 'buscar_historial'
  | 'consultar_precio'
  | 'listar_servicios'
  | 'enviar_link_pago'
  // Nuevos (Sesion 17):
  | 'reagendar_cita'
  | 'confirmar_asistencia'
  | 'consultar_preparacion'
  | 'calificar_atencion'
  | 'enviar_referido'
  | 'transferir_llamada';
```

### 3.3 Patient ML Features (actualizado)

```typescript
interface PatientMLFeatures {
  patient_id: string;
  engagement_score: number;
  total_interactions: number;
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_show_count: number;
  total_revenue: number;
  avg_response_time_minutes: number;
  preferred_channel: 'WHATSAPP' | 'VOICE_CALL' | 'INSTAGRAM' | 'MESSENGER';
  sentiment_avg: number;
  last_interaction_days_ago: number | null;
  churn_risk: number;       // 0.0 - 1.0
  lifetime_value: number;
  referral_count: number;
  has_sent_audio: boolean;
  has_sent_image: boolean;
  has_sent_document: boolean;
  // Nuevo:
  no_show_probability: number;  // 0.0 - 1.0 (calculado por ML)
}
```

### 3.4 Pipeline Stages

```typescript
type PipelineStage =
  | 'LEAD'
  | 'CONTACTADO'
  | 'CITA_AGENDADA'
  | 'CITA_COMPLETADA'
  | 'PAGADO'
  | 'RECURRENTE';

interface PipelinePatient {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  stage: PipelineStage;
  interaction_count: number;
  appointment_count: number;
  completed_count: number;
  has_paid: boolean;
}
```

### 3.5 Appointment Status

```typescript
type AppointmentStatus =
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'REQUESTED'
  | 'RESCHEDULED'
  | 'SCHEDULED';
```

### 3.6 Opportunity Types

```typescript
type OpportunityType =
  | 'HOT_LEAD'
  | 'UPSELL'
  | 'REFERRAL'
  | 'REACTIVATION'
  | 'MULTI_PROCEDURE'
  | 'PRICE_SENSITIVE'
  | 'HIGH_VALUE'
  | 'CHURN_RISK';
```

### 3.7 Bot Execution Log

```typescript
interface BotExecutionLog {
  id: string;
  bot_type: 'REMINDER' | 'HUNTER' | 'NURSE' | 'VOICE_CONFIRM' | 'VIP_FOLLOWUP' | 'BIRTHDAY';
  status: 'SUCCESS' | 'ERROR' | 'PARTIAL';  // NEVER "FAILURE"
  messages_sent: number;
  errors: number;
  duration_ms: number;
  details: Record<string, any>;
  created_at: string;
}
```

### 3.8 Voice Metrics

```typescript
interface VoiceMetrics {
  total_calls: number;
  total_whatsapp: number;
  avg_duration_seconds: number;
  appointments_by_voice: number;
  appointments_by_whatsapp: number;
  voice_pct: number;
}
```

### 3.9 Conversation State (from ai_brain)

```typescript
interface ConversationState {
  intent_actual: string;
  servicio_mencionado: string;
  fecha_mencionada: string;
  hora_mencionada: string;
  conversation_stage: 'INITIAL' | 'DISCOVERY' | 'SCHEDULING' | 'FOLLOW_UP' | 'POST_SERVICE' | 'REACTIVATION' | 'NEGOTIATION';
}
```

---

## 4. NEW DASHBOARD COMPONENTS / PAGES

### 4.1 No-Show Risk Indicator (Appointments Page)

En la pagina de citas, cada cita deberia mostrar un badge de riesgo de no-show:

```typescript
// Obtener desde GET /patients/{patient_id}/ml-features
// Campo: no_show_probability (0.0 - 1.0)

function NoShowBadge({ probability }: { probability: number }) {
  const color = probability > 0.6 ? 'red' : probability > 0.3 ? 'yellow' : 'green';
  const label = probability > 0.6 ? 'Alto riesgo' : probability > 0.3 ? 'Riesgo medio' : 'Bajo riesgo';
  return <Badge color={color}>{label} ({Math.round(probability * 100)}%)</Badge>;
}
```

### 4.2 Birthday Bot Config (Settings Page)

En ajustes, agregar seccion para configurar el bot de cumpleanos:

- Toggle enable/disable
- Template del mensaje de felicitacion
- Se guarda en `organizations.config_settings.birthday_bot`

```typescript
interface BirthdayBotConfig {
  enabled: boolean;
  message_template: string;  // Soporta {nombre}, {clinica}
}
```

### 4.3 Referral Program Dashboard

Nuevo componente o seccion para rastrear codigos de referidos:

- Codigo formato: `REF-XXXXXXXX`
- Se trackea en `data_lake_raw` con `data_type = 'REFERRAL_CREATED'`
- Metricas: codigos generados, usos, conversiones

### 4.4 Vacation Mode Toggle (Settings Page)

En ajustes, agregar toggle de modo vacaciones:

```typescript
interface VacationModeConfig {
  vacation_mode: boolean;
  vacation_return_date: string;  // ISO date, e.g. "2026-03-15"
}
// Se guarda en PATCH /organizations/{org_id} -> config_settings
```

- Date picker para `vacation_return_date`
- Sofia sigue respondiendo en modo vacaciones pero informa que la clinica esta cerrada

### 4.5 Bot Execution Monitor (Settings/Admin Page)

Monitor de los 15 jobs del scheduler:

```
GET /admin/jobs (requiere X-Admin-Key)
```

Muestra: nombre del bot, ultimo run, proximo run, status, mensajes enviados.

### 4.6 Doctor Notification Config (Settings Page)

En ajustes, campo para `notification_phone`:

```typescript
// Se guarda en PATCH /organizations/{org_id}
// Dentro de config_settings.notification_phone
{
  config_settings: {
    notification_phone: "573001234567",  // Numero WhatsApp del doctor
    // ... otros settings
  }
}
```

El backend envia notificaciones a este numero cuando:
- Crisis emocional detectada
- Emergencia medica
- Paciente pide hablar con humano
- Oportunidad de alto valor detectada

---

## 5. API ENDPOINT REFERENCE (33+ endpoints)

### 5.1 Analytics (7 endpoints) — `require_org_access`

| Method | Path | Params | Response |
|--------|------|--------|----------|
| GET | `/analytics/{org_id}/full` | `?dias=30` | `{ conversiones, revenue, performance_ia, oportunidades, sub_bots }` |
| GET | `/analytics/{org_id}/quick` | — | Quick metrics (today) |
| GET | `/analytics/{org_id}/conversions` | `?dias=30` | Conversion funnel |
| GET | `/analytics/{org_id}/revenue` | `?dias=30` | Revenue metrics |
| GET | `/analytics/{org_id}/performance` | `?dias=30` | AI performance |
| GET | `/analytics/{org_id}/opportunities` | `?dias=30` | Opportunities |
| GET | `/analytics/{org_id}/bots` | `?dias=30` | Sub-bot metrics |

### 5.2 Patients (9 endpoints)

| Method | Path | Auth | Params | Response |
|--------|------|------|--------|----------|
| GET | `/patients/{org_id}` | `require_org_access` | `?limit=20&offset=0&search=&orderBy=created_at&orderDir=desc` | `{ patients: Patient[], total: number }` |
| GET | `/patients/{patient_id}/detail` | `require_auth` + ownership | — | `Patient` |
| GET | `/patients/{patient_id}/ml-features` | `require_auth` + ownership | — | `PatientMLFeatures` |
| GET | `/patients/{patient_id}/staff-notes` | `require_auth` + ownership | — | `StaffNote[]` |
| GET | `/patients/{patient_id}/treatments` | `require_auth` + ownership | — | `Treatment[]` |
| GET | `/patients/{patient_id}/media` | `require_auth` + ownership | — | `PatientMedia[]` |
| POST | `/patients/{org_id}` | `require_org_access` | Body: `{ full_name, phone, email?, city?, service_interest? }` | `Patient` |
| PATCH | `/patients/{patient_id}` | `require_auth` + ownership | Body: partial Patient | `Patient` |
| GET | `/patients/{org_id}/export-csv` | `require_org_access` | — | CSV file download |

### 5.3 Appointments (3 endpoints)

| Method | Path | Auth | Body / Params |
|--------|------|------|---------------|
| GET | `/appointments/{org_id}` | `require_org_access` | `?from=ISO&to=ISO&status=` |
| POST | `/appointments/{org_id}` | `require_org_access` | `{ patient_id, start_time, end_time?, service_name?, status?, branch_id? }` |
| PATCH | `/appointments/{appointment_id}/status` | `require_auth` + ownership | `{ status: AppointmentStatus, cancellation_reason? }` |

### 5.4 Pipeline (1 endpoint)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/pipeline/{org_id}` | `require_org_access` | `PipelinePatient[]` |

### 5.5 Opportunities (1 endpoint)

| Method | Path | Auth | Params |
|--------|------|------|--------|
| GET | `/opportunities/{org_id}` | `require_org_access` | `?status=DETECTED` |

### 5.6 Payments (2 endpoints + 1 auth)

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/payments/{org_id}` | `require_org_access` | `{ payments, total }` |
| GET | `/payments/{org_id}/attribution` | `require_org_access` | Revenue attribution |
| POST | `/payments/create-link` | `require_auth` + body org_id check | Payment link |

### 5.7 Settings (8 endpoints)

| Method | Path | Auth |
|--------|------|------|
| GET | `/organizations/{org_id}` | `require_org_access` |
| PATCH | `/organizations/{org_id}` | `require_role(OWNER, ADMIN)` |
| GET | `/services/{org_id}` | `require_org_access` |
| POST | `/services/{org_id}` | `require_org_access` |
| PATCH | `/services/{service_id}` | `require_auth` + ownership |
| DELETE | `/services/{service_id}` | `require_auth` + ownership |
| GET | `/business-hours/{org_id}` | `require_org_access` |
| PATCH | `/business-hours/{hour_id}` | `require_auth` + ownership |

### 5.8 Data Lake (7 endpoints)

| Method | Path | Auth |
|--------|------|------|
| GET | `/data-lake/{org_id}/stats` | `require_org_access` |
| GET | `/data-lake/{org_id}/daily` | `require_org_access` |
| GET | `/data-lake/{org_id}/training-ready-count` | `require_org_access` |
| POST | `/data-lake/{org_id}/export-jsonl` | `require_org_access` |
| POST | `/data-lake/{org_id}/export-validation` | `require_org_access` |
| GET | `/data-lake/{org_id}/models` | `require_org_access` |
| POST | `/data-lake/register-model` | `require_auth` |

### 5.9 Voice (3 dashboard endpoints)

| Method | Path | Auth |
|--------|------|------|
| GET | `/voice/{org_id}/metrics` | `require_org_access` |
| POST | `/vapi/{org_id}/outbound-call` | `require_role(OWNER, ADMIN)` + rate limit 10/min |
| POST | `/vapi/{org_id}/outbound-batch` | `require_role(OWNER, ADMIN)` + rate limit 3/min |

### 5.10 Branches (7 endpoints)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/branches/{org_id}` | `require_org_access` |
| GET | `/api/branches/{org_id}/staff` | `require_org_access` |
| GET | `/api/branches/{org_id}/schedule` | `require_org_access` |
| GET | `/api/branches/{org_id}/services` | `require_org_access` |
| GET | `/api/branches/{org_id}/metrics` | `require_org_access` |
| POST | `/api/branches/{org_id}` | `require_org_access` |
| PATCH | `/api/branches/{org_id}/{branch_id}` | `require_org_access` |

### 5.11 Dashboard / Other

| Method | Path | Auth |
|--------|------|------|
| POST | `/dashboard/send-message` | `require_auth` + body org_id check + rate limit 20/min |
| GET | `/api/ab-tests/{org_id}` | `require_org_access` |
| POST | `/treatments/{org_id}` | `require_org_access` |
| GET | `/diagnostics/{org_id}` | `require_org_access` |
| GET | `/white-label/{org_id}` | `require_org_access` |
| PUT | `/white-label/{org_id}` | `require_role(OWNER, ADMIN)` |

---

## 6. RATE LIMITS

Endpoints con rate limiting estricto:

| Endpoint | Limit |
|----------|-------|
| `POST /dashboard/send-message` | 20/minute |
| `POST /vapi/{org_id}/outbound-call` | 10/minute |
| `POST /vapi/{org_id}/outbound-batch` | 3/minute |
| `POST /onboarding/register` | 3/minute |
| `POST /health/flush-queue` | 5/minute |
| `GET /analytics/{org_id}/*` | 60/minute |
| `GET /patients/{org_id}` | 60/minute |

Si el dashboard recibe `429 Too Many Requests`:
```typescript
if (response.status === 429) {
  toast.warning('Demasiadas solicitudes. Espera un momento.');
  // Implementar retry con backoff si es necesario
}
```

---

## 7. ROLE-BASED ACCESS

Algunos endpoints requieren roles especificos:

| Role | Acceso |
|------|--------|
| `OWNER` | Todo — incluyendo PATCH organizations, outbound calls, white-label update |
| `ADMIN` | Casi todo — igual que OWNER |
| `STAFF` | Solo lectura + crear citas/pacientes. NO puede: modificar org, hacer outbound calls, cambiar white-label |

### Que hacer en el dashboard

Ocultar/deshabilitar botones segun el rol del usuario:

```typescript
// Obtener rol del usuario:
// 1. Del JWT token (payload.app_metadata.role) si esta configurado
// 2. O hacer un GET a /organizations/{org_id} y verificar

// Ejemplo:
const canMakeOutboundCalls = user.role === 'OWNER' || user.role === 'ADMIN';
const canEditOrganization = user.role === 'OWNER' || user.role === 'ADMIN';
const canDeleteServices = true; // Todos pueden (ownership check en backend)
```

---

## 8. DATABASE SCHEMA CHANGES (referencia)

Tablas/columnas nuevas referenciadas por el backend:

| Table | Column/Change | Uso |
|-------|--------------|-----|
| `patient_ml_features` | `no_show_probability` float | Prediccion ML de no-show |
| `interaction_logs` | intent=`BIRTHDAY_GREETING` | Birthday bot |
| `data_lake_raw` | data_type=`REFERRAL_CREATED` | Codigos de referidos |
| `data_lake_raw` | data_type=`MEDICAL_EMERGENCY` | Emergencias detectadas |
| `data_lake_raw` | data_type=`BOT_OUTBOUND` | Llamadas salientes de bots |
| `bot_execution_logs` | bot_type=`BIRTHDAY` | Ejecuciones del birthday bot |
| `org_members` | `user_id`, `organization_id`, `role`, `is_active` | Auth - mapeo usuario->org |

---

## 9. SEARCH PARAMETER SANITIZATION

El backend ahora sanitiza el parametro `search` en `/patients/{org_id}`:
- Remueve caracteres que podrian manipular filtros PostgREST: `% _ \ ( ) . ,`
- Maximo 100 caracteres
- El frontend NO necesita hacer nada extra, pero debe saber que caracteres especiales se filtran

---

## 10. CHECKLIST DE IMPLEMENTACION

```
[ ] 1. Verificar que TODOS los fetch al backend incluyan Authorization: Bearer
[ ] 2. Implementar manejo global de 401 (redirect a login)
[ ] 3. Implementar manejo global de 403 (toast + redirect)
[ ] 4. Actualizar error parsing a { error, status_code, message }
[ ] 5. Implementar manejo de 429 (rate limit feedback)
[ ] 6. Agregar TypeScript interfaces actualizadas (seccion 3)
[ ] 7. Agregar No-Show badge en pagina de citas
[ ] 8. Agregar config de Birthday Bot en settings
[ ] 9. Agregar Vacation Mode toggle en settings
[ ] 10. Agregar campo notification_phone en settings
[ ] 11. Ocultar botones segun rol (outbound calls, org update, white-label)
[ ] 12. Agregar Voice Metrics dashboard widget
[ ] 13. Agregar Referral tracking (opcional, puede ser fase posterior)
[ ] 14. Agregar Bot Execution Monitor (opcional, puede ser fase posterior)
[ ] 15. Verificar token refresh automatico con Supabase Auth
```

**Prioridad:**
- Items 1-6: CRITICOS (el dashboard no funciona sin esto)
- Items 7-11: IMPORTANTES (funcionalidad nueva del backend)
- Items 12-14: NICE-TO-HAVE (puede ser siguiente sprint)

---

*Ataraxia IA Labs — Sesion 18: Enterprise Security + Dashboard Coherence*
