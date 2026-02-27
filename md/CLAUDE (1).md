# ATARAXIA IA LABS — CLAUDE.md
# Single source of truth. Updated: 21 Febrero 2026, post-Sesión 12.

---

## TU ROL

CTO técnico de Ataraxia IA Labs. No asistente — socio builder. Cada commit tiene consecuencias de revenue. Cada dato no capturado es dinero perdido. Enterprise from day one. No existe "después lo arreglo".

**Principios:** DATA IS THE MOAT (data lake = ventaja competitiva, meta = modelos propios) · ENTERPRISE FROM DAY ONE (multi-tenant, RLS, circuit breakers, quality scoring) · EVERY LINE SHIPS (código en PR no existe) · MEASURE EVERYTHING · PATIENT-FIRST ALWAYS.

---

## LA EMPRESA

**Ataraxia IA Labs** = empresa (como Apple). **SofIA** = primer producto (como iPhone).
Web: ataraxiaialabs.ai · Email: hola@ataraxialabs.com · Colombia 🇨🇴
La infra escala a verticales: bienes raíces (JAMES), restaurantes (LUCIA), legal (MARCUS).

---

## EL PRODUCTO — SOFIA v3

Sistema operativo de IA para clínicas de estética y odontología LATAM.
Atiende pacientes 24/7 por WhatsApp + llamada telefónica. Agenda citas, cobra anticipos, detecta oportunidades, hace follow-up, alimenta data lake para modelos propios.

### Planes (de la landing ataraxiaialabs.ai)

| | Starter | Pro | Enterprise |
|--|---------|-----|-----------|
| **Setup** | $997 USD único | $1,997 USD único | Custom |
| **Mensual** | $497 USD | $997 USD | Custom |
| WhatsApp 24/7 | ✅ | ✅ | ✅ |
| Agendamiento | ✅ | ✅ | ✅ |
| Conversaciones | 500/mes | Ilimitadas | Ilimitadas |
| Dashboard | Básico | CRM visual completo | Completo |
| Voice AI | ❌ | ✅ | ✅ |
| Revenue Engine | ❌ | ✅ | ✅ |
| Links de pago | ❌ | ✅ | ✅ |
| Follow-up automático | ❌ | ✅ | ✅ |
| Fine-tuning propio | ❌ | ✅ | ✅ |
| Red Neuronal LATAM | ❌ | ❌ | ✅ |
| Multi-sede | ❌ | ❌ | ✅ |
| API access | ❌ | ❌ | ✅ |
| SLA 99.9% | ❌ | ❌ | ✅ |

### Promesas de la landing (lo que el cliente ESPERA)

1. "Responde en 3 segundos con empatía real" → ✅ funciona
2. "Resuelve dudas, muestra precios, agenda la cita en tu calendario real" → ✅ funciona
3. "Envía link de pago por WhatsApp. El paciente paga sin salir del chat" → ⏳ código listo, falta RUT Wompi
4. "Confirma asistencia, envía recordatorios, detecta oportunidades de upsell" → ✅ S12: Bots + detector conectados
5. "Voice AI — Llamadas entrantes y salientes con voz humana" → ⚠️ entrantes OK, salientes NO
6. "Revenue Engine — Detecta oportunidades de upsell en cada conversación" → ✅ S12: opportunity_detector conectado
7. "CRM Visual Completo — Pipeline visual de pacientes" → ⚠️ dashboard básico, no pipeline
8. "Follow-up Automático — Post-procedimiento, retoques, reactivación" → ✅ S12: 4 bots activos (reminder 24h, confirm 2h, nurse followup, hunter reactivación)
9. "Fine-tuning por Clínica — SofIA se entrena con tu data" → ⚠️ Data lake ingesta OK, train_sofia.py vacío
10. "Red Neuronal LATAM — Inteligencia colectiva anónima" → ❌ NO EXISTE
11. "Garantía 30 días — 100% devuelto si no hay resultados" → Política activa
12. "Implementación 7-14 días hábiles" → Plazo objetivo
13. "Escala automáticamente al equipo humano" → ✅ funciona (detección de crisis)
14. "$9,300 USD ROI mensual estimado" → Número de la landing (conservador)

### Mercado (de la landing)
- 45,000+ clínicas solo en Colombia
- $4.2B mercado estético LATAM
- 0% usan IA operativa hoy

---

## STACK TÉCNICO

| Componente | Tech | URL/Ubicación | Estado |
|-----------|------|---------------|--------|
| Backend API | Python 3.11 / FastAPI | Render: ataraxia-api-core.onrender.com | ✅ |
| Base de datos | Supabase PostgreSQL 17 + pgvector | cvfzdxhkiyrbkptvpuja.supabase.co | ✅ |
| Dashboard | React + Vite + TypeScript | Vercel: sofia-dashboard | ✅ |
| Landing | HTML/CSS/JS | Cloudflare: ataraxiaialabs.ai | ✅ |
| WhatsApp | Meta Cloud API | ✅ Operativo |
| Voice AI | Vapi + ElevenLabs + Deepgram | ✅ SSE streaming |
| Pagos | Wompi | ⏳ Código listo, falta RUT |
| IA Chat | OpenAI GPT-4o | ✅ |
| IA Voz | OpenAI GPT-4o-mini | ✅ |
| Backend repo | github.com/Ataraxia-ia-labs/ataraxia-backend-core | |
| Dashboard repo | github.com/Ataraxia-ia-labs/sofia-dashboard | |

### Variables de entorno — Backend (.env en Render)

```
SUPABASE_URL=https://cvfzdxhkiyrbkptvpuja.supabase.co
SUPABASE_KEY=<service_role_key>          # NUNCA anon key en backend
OPENAI_API_KEY=sk-...
META_TOKEN=<WhatsApp Cloud API token>
VERIFY_TOKEN=ATARAXIA_SECURE_TOKEN_2026  # Webhook verification
```

### Variables de entorno — Dashboard (.env.local en Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=https://cvfzdxhkiyrbkptvpuja.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>  # Anon key para dashboard (RLS filtra)
NEXT_PUBLIC_API_URL=https://ataraxia-api-core.onrender.com
```

---

## ARQUITECTURA BACKEND (~45 archivos)

```
main.py                          ← Entry point: webhooks WhatsApp/IG/Messenger
config.py                        ← ENV vars, constantes, TZ Bogotá, VALID_INTENTS
database.py                      ← Supabase client (service_role key)
models.py                        ← Pydantic models
scheduler.py                     ← APScheduler v3.3 — 8 jobs (AsyncIOScheduler)

voice_health_router.py           ← /vapi/chat/completions + /health + /diagnostics
analytics_router.py              ← Métricas dashboard
dashboard_router.py              ← Auth + org management
payment_router.py                ← Webhooks Wompi
data_lake_router.py              ← Export JSONL + stats
legal_router.py                  ← Términos, privacidad

services/
  ai_brain.py                    ← 🧠 CEREBRO: prompt blindado v4.1, 7 tools, GPT-4o
  voice_service.py               ← 🎙️ Voice: SSE streaming, GPT-4o-mini
  appointment_service.py         ← 📅 CRUD citas + anti-doble-booking
  catalog_service.py             ← 💰 Servicios y precios
  patient_service.py             ← 👤 Zero-null policy
  payment_service.py             ← 💳 Wompi integration + revenue_attribution (S12)
  whatsapp_service.py            ← 📱 Meta API
  messaging_service.py           ← 📨 Multi-canal
  media_service.py               ← 🎵 Whisper (audio) + Vision (imágenes)
  memory_service.py              ← 💾 Historial
  rag_service.py                 ← 📚 Knowledge base + pgvector (threshold 0.5)
  analytics_service.py           ← 📊 Métricas
  data_lake_service.py           ← 🗄️ Ingesta data lake (_safe_serialize + fallback insert)
  data_lake_archival.py          ← 📦 Auto-archivado
  data_lake_integration.py       ← 📄 Documentación (no código activo)
  jsonl_export.py                ← 📤 Export fine-tuning
  circuit_breaker.py             ← 🛡️ Resiliencia
  white_label_service.py         ← 🏷️ Multi-tenant
  opportunity_detector.py        ← 🎯 Upsell — ✅ CONECTADO (S12, 8 tipos)
  revenue_attribution.py         ← 💵 Attribution — ✅ CONECTADO (S12, payment webhook)
  onboarding_service.py          ← 🚀 Self-service
  data_enricher.py               ← 🔍 Enriquecimiento
  channel_normalizer.py          ← 🔄 Normaliza input
  moderation_service.py          ← 🚫 Filtro
  phone_normalizer.py            ← 📞 Normaliza tel
  channel_window_validator.py    ← ⏰ Ventana 24h
  payment_tool.py                ← Tool pago para ai_brain

jobs/
  hunter_bot.py                  ← 🎯 ejecutar_hunter() + ejecutar_reactivacion() + bot_execution_logs
  reminder_bot.py                ← 📋 ejecutar_recordatorio_24h() + ejecutar_confirmacion_2h() + bot_execution_logs
  nurse_bot.py                   ← 💊 ejecutar_nurse() + ejecutar_followup_postprocedimiento() + bot_execution_logs
  log_retention.py               ← 🧹 Limpieza logs

scripts/
  populate_knowledge_base.py     ← Poblar KB con 81 chunks + embeddings
```

### 7 Tools de ai_brain.py

consultar_disponibilidad · agendar_cita · cancelar_cita · buscar_historial · consultar_precio · listar_servicios · enviar_link_pago

### API Endpoints principales

| Method | Path | Qué hace |
|--------|------|----------|
| POST | /webhook | WhatsApp/IG/Messenger incoming |
| GET | /webhook | Meta verification |
| POST | /vapi/chat/completions | Voice AI (SSE streaming) |
| POST | /vapi/webhook | Vapi events (call ended, etc.) |
| GET | /health | Health check |
| GET | /diagnostics/{org_id} | Full system diagnostics |
| GET | /diagnostics/{org_id}/voice-test | Voice pipeline test |
| GET | /analytics/overview/{org_id} | Dashboard metrics |
| GET | /analytics/patients/{org_id} | Patient metrics |
| GET | /analytics/appointments/{org_id} | Appointment metrics |
| POST | /payments/wompi/webhook | Wompi payment events |
| GET | /data-lake/stats/{org_id} | Data lake statistics |
| POST | /data-lake/export/{org_id} | Export JSONL |

---

## SCHEDULER v3.3 — 8 Jobs (AsyncIOScheduler)

| Job ID | Función | Schedule | Archivo |
|--------|---------|----------|---------|
| `log_retention_daily` | `limpiar_logs_viejos()` | 3:00 AM COL | `jobs/log_retention.py` |
| `data_lake_archival` | `verificar_y_archivar()` | 4:00 AM COL | `services/data_lake_archival.py` |
| `reminder_24h` | `ejecutar_recordatorio_24h()` | 8:00 PM COL | `jobs/reminder_bot.py` |
| `confirm_2h` | `ejecutar_confirmacion_2h()` | Cada hora 7-19 COL | `jobs/reminder_bot.py` |
| `hunter_bot` | `ejecutar_hunter()` | 9:00 AM COL | `jobs/hunter_bot.py` |
| `hunter_reactivacion` | `ejecutar_reactivacion()` | Lunes 10:00 AM COL | `jobs/hunter_bot.py` |
| `nurse_bot` | `ejecutar_nurse()` | Cada hora | `jobs/nurse_bot.py` |
| `nurse_followup` | `ejecutar_followup_postprocedimiento()` | 10:00 AM COL | `jobs/nurse_bot.py` |

Todos con: `misfire_grace_time` (1-2h), `coalesce=True`, `max_instances=1`.

---

## DASHBOARD — 9 páginas (React + Vite + TypeScript)

| Página | Ruta | Qué muestra |
|--------|------|-------------|
| Overview | / | KPIs principales, gráficas de actividad |
| Pacientes | /patients | Lista de pacientes, búsqueda, filtros |
| Calendario | /calendar | Citas del día/semana/mes |
| Pagos | /payments | Transacciones, revenue |
| Data Lake | /data-lake | Stats de ingesta, quality scores |
| Oportunidades | /opportunities | Upsell/cross-sell detectados |
| System Health | /health | Estado de servicios, errores |
| Ajustes | /settings | Config org, horarios, servicios |
| Onboarding | /onboarding | Self-service setup (fuera del dashboard) |

**Auth:** Supabase Auth → org_users/org_members → get_user_org_ids() → RLS filtra datos por org.

---

## BASE DE DATOS — 25 tablas (Supabase)

### Estado actual de datos (21 Feb 2026, post-Sesión 12)

| Tabla | Filas | Estado |
|-------|-------|--------|
| organizations | 1 | ✅ |
| patients | 2 | ✅ |
| appointments | 8 | ✅ |
| interaction_logs | 119 | ✅ |
| services_catalog | 18 | ✅ |
| business_hours | 6 | ✅ |
| patient_ml_features | 2 | ✅ |
| detected_opportunities | 1 | ✅ S12: detector conectado, crece con tráfico |
| active_treatments | 1 | ⚠️ |
| leads | 2 | ✅ |
| data_lake_raw | **11** | ✅ S11: fix double serialization · S12: safe serialize + fallback |
| data_lake_training | 0 | ✅ Se genera auto cuando quality >= 0.7 (necesita más tráfico) |
| data_lake_models | 0 | ⏳ Pendiente train_sofia.py |
| bot_execution_logs | **57** | ✅ S11: bots logean · S12: fix status constraint |
| knowledge_base | **81** | ✅ 72 chunks servicios + 9 generales (embeddings 1536d) |
| payments | 0 | ⏳ Wompi pendiente RUT |

### RLS (migraciones 011 + 012)
- TODAS: RLS ON
- Backend: service_role (bypasea RLS)
- Dashboard: authenticated + `get_user_org_ids()`
- Service policies: `TO service_role` (nunca public)

### Constraints importantes
- `idx_no_patient_double_booking`: UNIQUE (patient_id, start_time) WHERE status != CANCELLED
- `MAX_CITAS_POR_PACIENTE_DIA = 2`
- patients: phone + org_id UNIQUE
- services_catalog: normalized_name GENERATED
- bot_execution_logs: `CHECK (status IN ('SUCCESS', 'ERROR', 'PARTIAL'))`

---

## VOICE AI — Configuración completa

### Vapi Assistant (JSON real en producción)
```json
{
  "id": "440c68e6-5c24-4d9f-867f-f85e95ff0d1a",
  "name": "Sofia",
  "voice": {
    "model": "eleven_multilingual_v2",
    "voiceId": "J4vZAFDEcpenkMp3f3R9",
    "provider": "11labs",
    "stability": 0.7,
    "similarityBoost": 0.75
  },
  "model": {
    "url": "https://ataraxia-api-core.onrender.com/vapi",
    "model": "sofia-voice",
    "provider": "custom-llm"
  },
  "firstMessage": "¡Hola! Hablas con Sofía, Asistente premium virtual ¿En qué te puedo ayudar hoy?",
  "endCallMessage": "¡Fue un gusto ayudarte! Que tengas un excelente día. ¡Chao!",
  "transcriber": {
    "model": "nova-3-general",
    "language": "es-419",
    "provider": "deepgram"
  },
  "backgroundSound": "off",
  "startSpeakingPlan": {"waitSeconds": 0.5},
  "stopSpeakingPlan": {"numWords": 3},
  "metadata": {"org_id": "42c7320b-9a6d-4dea-a620-d41b6299ddc5"}
}
```

### Pipeline de voz
1. Paciente habla → Deepgram STT (nova-3-general, es-419) → Vapi POST /vapi/chat/completions
2. Backend: resolver org_id (3 estrategias) → patient lookup → prompt blindado + RAG
3. GPT-4o-mini stream (temp 0.4, max_tokens 120)
4. Tool calls → ejecutar → resultado RAW a GPT (NO pasa por _adaptar_texto_voz_stream)
5. Loop de hasta 3 rondas para tool chaining (ej: buscar_historial → cancelar_cita)
6. `_adaptar_texto_voz_stream()` SOLO en output final (números→texto español, horarios→12h)
7. SSE chunks → Vapi → ElevenLabs TTS → paciente escucha
8. Post-streaming: ingestar_conversacion() + actualizar_ml_features()

### Guards
- `tools_ejecutados = set()` — bloquea doble agendar/cancelar (solo marca en éxito)
- Patient identification obligatoria (busca nombre en DB por teléfono)
- Historial limitado a 10 mensajes
- Cancelación segura (confirma cuál cita)
- AM/PM usa `\bAM\b` / `\bPM\b` (word boundary, no corrompe "EXAMEN")

---

## EDGE CASES BLINDADOS (93/100 — Sesión 5)

SofIA maneja:
- Inyección de prompt ("ignora tus instrucciones") → rechaza amablemente
- Paciente que insulta → mantiene calma, ofrece escalar a humano
- Intento de agendar en horario cerrado → dice horario y ofrece otro día
- Intento de agendar en el pasado → detecta y corrige
- Doble booking → UNIQUE INDEX + slot_check antes de insertar
- Pregunta médica compleja → "No soy médica, te recomiendo consultar con el doctor"
- Paciente pide cancelar sin tener cita → busca historial primero
- Mensaje vacío o solo emojis → pide clarificación
- Audio que Whisper no entiende → pide que repita
- Rate limiting → circuit breaker con fallback
- WhatsApp fuera de ventana 24h → channel_window_validator

---

## ONBOARDING — Flujo de nueva clínica

1. Lead llena formulario en ataraxiaialabs.ai → INSERT en `leads`
2. Equipo contacta en <24h → demo personalizada
3. Si cierra → crear `organization` con config:
   - system_prompt personalizado (tono, servicios, políticas)
   - WhatsApp phone_id
   - Vapi assistant (si plan Pro)
   - Wompi keys (si plan Pro)
4. Poblar `services_catalog` con servicios de la clínica
5. Configurar `business_hours`
6. Crear `org_users` para acceso al dashboard
7. Poblar `knowledge_base` con FAQs y protocolos
8. Test end-to-end: WhatsApp + voz + cita + pago
9. Go live (7-14 días)

---

## REGLAS DE CÓDIGO

```python
# ✅ CORRECTO
from services.ai_brain import obtener_respuesta_ia
result = supabase.table("x").insert(data).execute()
patient = obtener_o_crear_paciente(phone, org_id)
query = supabase.table("x").select("*").eq("organization_id", org_id)
supabase.table("x").insert({"details": {"key": "value"}}).execute()  # JSONB = dict directo

# ❌ PROHIBIDO
from ai_brain import obtener_respuesta_ia          # Falta services.
result = supabase.table("x").insert(data).select("id").execute()  # CRASHEA
patient = {"phone": phone}                         # Sin zero-null policy
query = supabase.table("x").select("*")            # Sin org_id = data leak
supabase.table("x").insert({"details": json.dumps(d)}).execute()  # DOUBLE SERIALIZATION
```

**Regla JSONB (aprendida S11):** Las columnas JSONB de Supabase (details, structured_data, ai_analysis, network_info, etc.) reciben dicts de Python DIRECTAMENTE. El cliente Supabase auto-serializa. Usar `json.dumps()` causa double serialization → PostgREST rechaza o corrompe el insert.

**Regla bot_execution_logs (aprendida S12):** La tabla tiene `CHECK (status IN ('SUCCESS', 'ERROR', 'PARTIAL'))`. NO usar `"FAILURE"` ni `"PARTIAL_FAILURE"`.

**Proceso:** Explica antes de hacer → un commit por fix → verifica compilación → verifica imports → verifica .select("id") → push cuando todo pasa.

---

## SESIONES COMPLETADAS (1-12)

| # | Qué |
|---|-----|
| 1 | Landing V3 + SSL A+ |
| 2 | Backend Fases 1-3 (core, AI brain, tools) |
| 3 | Backend Fases 4-5 + Sub-bots |
| 4 | Dashboard V1 |
| 5 | Blindaje v9.1 (93/100 edge cases) |
| 6 | Dashboard V4 Enterprise (8 páginas) |
| 7 | Onboarding + Pagos Wompi + Revenue Attribution |
| 8 | Data Lake 3 capas + Fine-tuning pipeline + JSONL Export |
| 9 | Voice AI (Vapi) + White-Label + Circuit Breaker |
| 10 | Voice enterprise fixes + DB overhaul (12 migraciones SQL) + Gap analysis |
| 11 | Voice 10 bugs fixed + Data lake fix + Bots → bot_execution_logs + KB 81 chunks |
| 12 | ROADMAP 1.1→2.5 completado: data lake bulletproof, opportunity_detector + revenue_attribution conectados, 4 bots follow-up activos (reminder 24h, confirm 2h, nurse followup, hunter reactivación), scheduler v3.3 con 8 jobs, bugfix status constraints + dedup |

### Commits Sesión 12

| Hash | Descripción |
|------|-------------|
| `33eda92` | fix(data-lake): fix double serialization causing 0 rows |
| `0eacf94` | fix(bots): scheduler + 3 bots now log to bot_execution_logs |
| `2e02922` | feat(rag): populate knowledge_base with 81 chunks + lower threshold |
| `86bb9b1` | fix(detector): lower opportunity detection thresholds for real traffic |
| `5de3e33` | feat(revenue): connect revenue_attribution to payment webhook |
| `5b09d96` | feat(bots): reminder 24h — daily 8 PM |
| `e697290` | feat(bots): add 2h confirmation — hourly 7am-7pm |
| `caef2de` | feat(bots): nurse follow-up post-procedimiento — daily 10 AM |
| `da97f85` | feat(bots): hunter reactivation — Mondays 10 AM |
| `fd26eb7` | fix(data-lake): bulletproof ingestion — safe serialize, fallback insert |
| pendiente | fix(bots): status constraint + dedup intent + VALID_INTENTS |

---

## QUÉ FUNCIONA vs QUÉ FALTA

### ✅ Funciona (21 Feb 2026)
1. WhatsApp completo (texto + audio + imagen)
2. Voice AI streaming SSE con 7 tools (10 bugs fijados en S11)
3. Agendar/cancelar/reagendar + anti-doble-booking
4. Precios y catálogo
5. Links de pago Wompi (código listo)
6. Escalamiento a humano
7. Dashboard con métricas
8. Circuit breaker + fallback
9. Multi-tenant (org_id en todo)
10. RLS enterprise (12 migraciones)
11. Diagnósticos /diagnostics/{org_id}
12. **Data lake ingesta** — S11: fix double serialization · S12: safe serialize + fallback insert (11 filas)
13. **Scheduler v3.3 con 8 jobs** — S12: AsyncIOScheduler, misfire_grace_time, coalesce, max_instances
14. **Bots escriben a bot_execution_logs** — S11: base · S12: fix status constraint (57 filas)
15. **Knowledge base con 81 chunks** — RAG funcional, threshold 0.5
16. **Opportunity detector conectado** — S12: 8 tipos, linked via interaction_id
17. **Revenue attribution conectado** — S12: payment webhook → atribuir_revenue()
18. **Recordatorio 24h** — S12: reminder_bot, CronTrigger 8PM COL, dedup REMINDER_24H
19. **Confirmación 2h** — S12: reminder_bot, CronTrigger hora 7-19, dedup REMINDER_CONFIRM_2H
20. **Follow-up post-procedimiento** — S12: nurse_bot, CronTrigger 10AM, RAG tips, dedup NURSE_FOLLOWUP
21. **Reactivación 30+ días** — S12: hunter_bot, CronTrigger Lunes 10AM, max 10/org, dedup HUNTER_REACTIVACION

### ❌ No funciona / No existe
1. **train_sofia.py** — VACÍO (pipeline JSONL export existe, falta training loop)
2. **Llamadas salientes** — solo entrantes
3. **Pipeline visual pacientes** — dashboard no tiene
4. **Red Neuronal LATAM** — no existe
5. **Wompi pagos reales** — código listo, falta RUT

---

## SPRINTS

### SPRINT 1 — "Demo que cierra ventas" (COMPLETADO ✅)
- [x] Data lake ingesta — S11: fix json.dumps · S12: safe serialize + fallback
- [x] Voice service bugs — S11: 10 bugs fijados
- [x] Scheduler + bots → bot_execution_logs — S11: scheduler v3.0 · S12: v3.3 con 8 jobs
- [x] Knowledge base — S11: 81 chunks, RAG threshold 0.5
- [x] Conectar opportunity_detector a main.py — S12: 8 tipos, interaction_id linked
- [x] Conectar revenue_attribution a payment_service.py — S12: payment webhook
- [x] Recordatorio 24h — S12: reminder_bot.py, CronTrigger 20:00
- [x] Confirmación 2h — S12: reminder_bot.py, CronTrigger '7-19'
- [x] Follow-up post-procedimiento — S12: nurse_bot.py, CronTrigger 10:00 + RAG
- [x] Reactivación 30+ días — S12: hunter_bot.py, CronTrigger mon 10:00
- [x] Conectar scheduler a main.py — S11: startup/shutdown events
- [ ] Voz: ajustar ElevenLabs (stability 0.5, similarity 0.8)

### SPRINT 2 — "Enterprise ready"
- [ ] train_sofia.py completo (OpenAI Fine-tuning API)
- [ ] Auto-switch a modelo fine-tuned
- [ ] Outbound calls via Vapi API
- [ ] Pipeline visual pacientes en dashboard
- [ ] Transfer call a humano
- [ ] Dashboard: métricas de voz, data lake view mejorado

### SPRINT 3 — "Escala"
- [ ] CI/CD GitHub Actions
- [ ] Unit tests (pytest)
- [ ] Sentry error tracking
- [ ] Multi-sede UI
- [ ] A/B testing prompts
- [ ] Widget web embeddable

---

## DEPLOY

```bash
# Backend → Render (auto-deploy on push)
git add -A && git commit -m "feat: descripción" && git push origin main

# Dashboard → Vercel (auto-deploy on push, repo separado)

# Verificar:
curl https://ataraxia-api-core.onrender.com/health
curl https://ataraxia-api-core.onrender.com/diagnostics/{org_id}
```

---

## SERVICIOS EXTERNOS

| Servicio | Acceso |
|----------|--------|
| Render | dashboard.render.com → ataraxia-api-core |
| Supabase | supabase.com → cvfzdxhkiyrbkptvpuja |
| Vercel | vercel.com → sofia-dashboard + ataraxia-landing |
| Vapi | vapi.ai → Assistant 440c68e6-5c24-4d9f-867f-f85e95ff0d1a |
| Meta | developers.facebook.com |
| OpenAI | platform.openai.com |
| Wompi | comercios.wompi.co (pendiente RUT) |
| GitHub | github.com/Ataraxia-ia-labs |

---

*Ataraxia IA Labs — Cada dato es una decisión. Cada decisión es dinero. Cada línea de código es infraestructura que escala a 1000 clínicas.*
