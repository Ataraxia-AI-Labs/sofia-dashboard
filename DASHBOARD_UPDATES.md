# Dashboard Updates — Para el Backend Claude

Este documento describe todas las actualizaciones realizadas en el dashboard de SofIA para que el Claude del backend pueda estar al tanto de los cambios, endpoints que se consumen, y la estructura de datos esperada.

---

## 1. Arquitectura del Dashboard

### Stack
- **Framework**: Next.js 14 (App Router)
- **Auth**: Supabase Auth (cookie-based SSR)
- **State**: React Context (`OrgContext`) para org/user
- **Styling**: Tailwind CSS (dark theme)
- **Charts**: Recharts
- **Tipos**: TypeScript estricto (0 errores de compilacion)

### Flujo de Autenticacion
1. `middleware.ts` verifica cookies `sb-*-auth-token` en todas las rutas `/dashboard/*`
2. Si no hay cookie, redirige a `/login?redirect=/dashboard`
3. `layout.tsx` obtiene el usuario via `supabase.auth.getUser()` y luego llama a `fetchUserOrganization(userId)` para obtener la org
4. El `OrgContext.Provider` expone `{ user, org, orgId }` a todas las paginas hijas
5. Cada pagina accede al orgId con `const { orgId } = useOrg()`

### Error Boundary
- Todas las paginas del dashboard estan envueltas en un `ErrorBoundary` React
- Si una pagina crashea, muestra UI de error con boton de reintentar (no white-screen)

---

## 2. Endpoints que Consume el Dashboard

### Analytics (Overview Page)
```
GET /analytics/{orgId}/full?dias={7|30|90}
→ Returns: FullAnalytics { periodo, conversiones, revenue, performance_ia, oportunidades, sub_bots }

GET /voice/{orgId}/metrics?dias={7|30|90}
→ Returns: VoiceMetrics { total_calls, total_whatsapp, avg_duration_seconds, appointments_by_voice, appointments_by_whatsapp, voice_pct }
```

### Pacientes
```
GET /patients/{orgId}?limit=20&offset=0&search=&orderBy=created_at&orderDir=desc
→ Returns: { patients: Patient[], total: number }

GET /patients/{patientId}/detail
→ Returns: PatientDetail (select * from patients)

GET /patients/{patientId}/ml-features
→ Returns: PatientMLFeatures (engagement, appointments, revenue, predictions, sentiment, media flags)

GET /patients/{patientId}/staff-notes
→ Returns: StaffNote[] (id, note_content, sentiment_label, is_private, created_at)

GET /patients/{patientId}/treatments
→ Returns: Treatment[] (tratamientos activos con medicamento, dosis, frecuencia)

GET /patients/{patientId}/media
→ Returns: PatientMedia[] (AUDIO/IMAGE/DOCUMENT con transcription y raw_content)

POST /patients/{orgId}
→ Body: { full_name, phone, email?, city?, service_interest? }

PATCH /patients/{patientId}
→ Body: Partial<Patient>

GET /patients/{orgId}/export-csv
→ Returns: CSV file download
```

### Pipeline
```
GET /pipeline/{orgId}
→ Returns: PipelinePatient[] con stage calculado automaticamente:
  - LEAD: tiene interacciones pero 0 citas
  - CONTACTADO: interaction_count > 0
  - CITA_AGENDADA: appointment_count > 0
  - CITA_COMPLETADA: completed_count > 0
  - PAGADO: has_paid = true
  - RECURRENTE: completed_count >= 2 && has_paid
```

### Calendario
```
GET /appointments/{orgId}?from={ISO}&to={ISO}&status={CONFIRMED|COMPLETED|CANCELLED|NO_SHOW|REQUESTED|RESCHEDULED}
→ Returns: Appointment[] con patients join { full_name, phone }

POST /appointments/{orgId}
→ Body: { patient_id, start_time, end_time, service_name }

PATCH /appointments/{appointmentId}/status
→ Body: { status, cancellation_reason? }
```

### Oportunidades
```
GET /opportunities/{orgId}?status={DETECTED|ACTED_ON|CONVERTED|EXPIRED|DISMISSED}
→ Returns: Opportunity[] con patients join { full_name, phone }
→ Tipos: HOT_LEAD, UPSELL, WINBACK, REFERRAL_POTENTIAL, CHURN_RISK, PRICE_OBJECTION, MULTI_PROCEDURE, EMERGENCY_MEDICAL
```
El dashboard tambien actualiza oportunidades directamente via Supabase client:
```
supabase.from('detected_opportunities').update({ status, acted_on_at?, converted_at? }).eq('id', oppId)
```

### Pagos & Revenue Attribution
```
GET /payments/{orgId}?status={PAID|PENDING|DECLINED}
→ Returns: { payments: Payment[] }
→ Payment incluye: amount_cop, currency, status, service_name, payment_method_type, reference, link_url, patients join

GET /payments/{orgId}/attribution?dias=30
→ Returns: RevenueAttribution {
    resumen: { total_revenue, total_pending, total_pagos, pagos_pendientes, ticket_promedio, roi_estimado, costo_ia_usd, tiempo_promedio_a_pago_horas },
    attribution: { por_canal, por_servicio, por_dia },
    top_conversaciones?: [{ patient, service, conversation_snippet, payment_amount, paid_at }]
  }
```

### Ajustes (Configuracion)
```
GET /organizations/{orgId}
→ Returns: Organization { id, name, status, system_prompt, whatsapp_phone_id, config_settings }

PATCH /organizations/{orgId}
→ Body: { system_prompt?, config_settings? }
→ config_settings incluye: { notification_phone, vacation_mode, ... }

GET /services/{orgId}
→ Returns: ServiceCatalog[] { name, price, duration_minutes, category, requires_deposit, deposit_amount, is_active }

POST /services/{orgId}
PATCH /services/{serviceId}
DELETE /services/{serviceId} (soft delete: is_active = false)

GET /business-hours/{orgId}
→ Returns: BusinessHour[] { day_of_week, open_time, close_time, slot_duration_minutes, is_open, is_active }

PATCH /business-hours/{hourId}
```

### Data Lake (Fine-tuning Pipeline)
```
GET /data-lake/{orgId}/stats
→ Returns: DataLakeStats {
    raw_data_total, training_data_total, quality_promedio, modelos_entrenados,
    listo_para_finetuning, recomendacion, training_exported,
    ultimo_modelo?: { model_name, status, base_model, training_samples, training_loss },
    ultimo_entrenamiento, por_intent, por_tipo?
  }

GET /data-lake/{orgId}/daily?dias=30
→ Returns: { date, count }[] (ingesta diaria)

GET /data-lake/{orgId}/training-ready-count
→ Returns: number

POST /data-lake/{orgId}/export-jsonl
→ Body: { product: 'SOFIA', min_quality: 0.7, balance_intents: true }
→ Returns: DataLakeExportResult { message, jsonl_preview, export_batch, stats: { total, tokens_estimados }, costo_estimado_usd, recomendacion }
```

### System Health
```
GET /health
→ Returns: SystemHealth {
    status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL',
    uptime_human, uptime_seconds, database, version,
    message_queue: { pending, ... },
    circuit_breakers: Record<string, { state, name, failure_count, success_count, uptime_seconds }>
  }
→ Dashboard hace polling cada 15s con auto-refresh
```

### WhatsApp (Mensajes directos)
```
POST /dashboard/send-message
→ Body: { organization_id, phone, message }
→ Permite al staff enviar mensajes desde el panel de paciente
```

### Tratamientos (Nurse Bot)
```
POST /treatments/{orgId}
→ Body: { patient_id, treatment_name, medication, dosage, frequency_hours, start_date, end_date, notes? }
```

---

## 3. Supabase Tables que Accede el Dashboard

El dashboard lee directamente via Supabase client:
- `detected_opportunities` — actualiza status de oportunidades
- Todos los demas datos vienen via API REST del backend

### RLS Policies
Se configuraron policies scoped por organizacion usando:
```sql
CREATE OR REPLACE FUNCTION user_org_ids() RETURNS SETOF uuid AS $$
  SELECT organization_id FROM org_users WHERE user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```
Todas las tablas usan `USING (organization_id IN (SELECT user_org_ids()))`.

---

## 4. Tipos TypeScript Completos

Todos los tipos estan en `types/index.ts`. Los principales:

- `FullAnalytics` — respuesta de /analytics/full
- `ConversionMetrics` — funnel completo con tasas
- `RevenueMetrics` — revenue total, pipeline, proyeccion
- `PerformanceMetrics` — tokens, costos, herramientas, intents
- `OpportunityMetrics` — por tipo y status
- `SubBotMetrics` — reminder, hunter, nurse bots
- `Patient` / `PatientDetail` — datos de paciente
- `PatientMLFeatures` — 40+ features ML por paciente
- `Appointment` — citas con status union type
- `Opportunity` — oportunidades detectadas
- `Payment` / `RevenueAttribution` — pagos y attribution
- `ServiceCatalog` / `BusinessHour` — configuracion
- `StaffNote` / `Treatment` / `PatientMedia` — datos clinicos
- `SystemHealth` / `CircuitBreakerDetail` — health monitoring
- `DataLakeStats` / `DataLakeExportResult` — fine-tuning pipeline
- `VoiceMetrics` — metricas de Voice AI
- `PipelinePatient` / `PipelineStage` — pipeline CRM

---

## 5. Paginas del Dashboard

| Ruta | Descripcion |
|------|-------------|
| `/dashboard` | Overview: KPIs, funnel, revenue, intents, oportunidades, Voice AI, sub-bots |
| `/dashboard/pacientes` | CRM: tabla paginada, detalle slide-over, ML features, notas, tratamientos, media, WhatsApp directo |
| `/dashboard/pipeline` | Kanban: 6 etapas automaticas (Lead → Recurrente) |
| `/dashboard/calendario` | Calendario: vista semana/mes, crear citas, cambiar status |
| `/dashboard/oportunidades` | Lista: filtros por status/tipo, acciones rapidas |
| `/dashboard/pagos` | Tabla de pagos + Revenue Attribution (por canal, servicio, dia) |
| `/dashboard/ajustes` | Config: system prompt, catalogo servicios, horarios, notificaciones, vacation mode |
| `/dashboard/datalake` | Data Lake: stats, ingesta diaria, export JSONL, modelos entrenados |
| `/dashboard/health` | System Health: circuit breakers, uptime, auto-refresh 15s |

---

## 6. Notas Importantes para el Backend

1. **Vacation Mode**: Cuando `config_settings.vacation_mode = true`, el dashboard muestra warning. El backend debe checkear esto antes de procesar mensajes.

2. **Oportunidades**: El dashboard espera que el backend detecte oportunidades y las inserte en `detected_opportunities` con los tipos definidos (HOT_LEAD, UPSELL, etc.)

3. **ML Features**: El dashboard consume ~40 features por paciente. Si agregas nuevas features al modelo, agrega las propiedades correspondientes a `PatientMLFeatures` en `types/index.ts`.

4. **Voice AI**: El dashboard muestra metricas de voz solo si `total_calls > 0 || total_whatsapp > 0`.

5. **Data Lake Export**: El dashboard espera que `/export-jsonl` devuelva `jsonl_preview` como string (no array), con `stats.total`, `stats.tokens_estimados`, `costo_estimado_usd`, y `recomendacion`.

6. **Circuit Breakers**: El dashboard renderiza los circuit breakers por nombre: openai, supabase, meta, vapi, wompi. Si agregas nuevos servicios, el dashboard los mostrara con icono generico (Server).

7. **message_queue**: El dashboard accede a `health.message_queue.pending` (no al objeto completo).

8. **Revenue Attribution**: El endpoint debe devolver `por_canal`, `por_servicio`, `por_dia` como `Record<string, number>`. `top_conversaciones` es opcional.

9. **Pipeline**: Las etapas se calculan en el backend basado en: interacciones, citas, completadas, pagos. El dashboard solo renderiza.

10. **Auth**: El dashboard usa `fetchUserOrganization(userId)` que busca en `org_users` join `organizations`. Si no encuentra mapping, muestra error (no hay fallback inseguro).
