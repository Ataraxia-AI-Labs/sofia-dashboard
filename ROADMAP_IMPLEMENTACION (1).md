# ATARAXIA IA LABS — ROADMAP DE IMPLEMENTACION
## Todo lo que falta para produccion v1.0
## Fecha: 21 Febrero 2026 — Actualizado post-Sesion 12

---

## RESUMEN EJECUTIVO

**Estado post-Sesion 12:** Bloques 1 y 2 COMPLETADOS. SofIA ahora captura datos, detecta oportunidades, atribuye revenue, y ejecuta 4 bots de follow-up automatico.

| Tabla | Antes | Ahora | Estado |
|-------|-------|-------|--------|
| data_lake_raw | 0 | **11** | ✅ Ingesta funcional |
| bot_execution_logs | 0 | **57** | ✅ 3 bots logean |
| knowledge_base | 0 | **81** | ✅ RAG funcional |
| detected_opportunities | 1 (manual) | 1 (auto) | ✅ Detector conectado |
| payments | 0 | 0 | ⏳ Pendiente RUT Wompi |
| data_lake_training | 0 | 0 | ⏳ Necesita mas trafico (quality >= 0.7) |
| data_lake_models | 0 | 0 | ⏳ Pendiente train_sofia.py |

---

## BLOQUE 1 — "ARREGLAR LO ROTO" ✅ COMPLETADO

### [x] Tarea 1.1 — Data Lake no ingesta ✅

**Implementacion:**
- **Commit `33eda92`:** Fix double serialization (`json.dumps()` en JSONB) + case sensitivity (`"AUDIO"` vs `"audio"`) en `data_lake_service.py`
- **Commit `fd26eb7`:** Bulletproof ingestion:
  - `_safe_serialize()` en `services/data_lake_service.py` (lines 28-46) — convierte datetime, Decimal, bytes a JSON-safe
  - `_insertar_data_lake()` en `services/data_lake_service.py` (lines 180-218) — fallback: si insert 17 columnas falla, intenta insert minimo 8 columnas
  - `main.py` line 429: init `descripcion = None` (previene NameError)
  - `main.py` lines 654-657: `traceback.print_exc()` para visibilidad de errores

**Resultado:** `data_lake_raw` = 11 filas (era 0). Cada conversacion WhatsApp + voz se ingesta.

---

### [x] Tarea 1.2 — Bots no ejecutan (scheduler desconectado) ✅

**Implementacion:**
- **Commit `0eacf94`:** Refactor `scheduler.py` a v3.3:
  - `AsyncIOScheduler` con `job_defaults`: `coalesce=True`, `max_instances=1`, `misfire_grace_time=3600`
  - 8 jobs registrados dentro de `iniciar_scheduler()`
  - `detener_scheduler()` para cleanup
- Cada bot (`reminder_bot.py`, `hunter_bot.py`, `nurse_bot.py`) tiene `_log_ejecucion()` que escribe a `bot_execution_logs`
- **Bugfix S12:** Status values `"PARTIAL_FAILURE"` → `"PARTIAL"`, `"FAILURE"` → `"ERROR"` (constraint violation fix)

**Resultado:** `bot_execution_logs` = 57 filas (era 0).

---

### [x] Tarea 1.3 — Knowledge Base vacia (RAG sin contenido) ✅

**Implementacion:**
- **Commit `2e02922`:**
  - CREADO `scripts/populate_knowledge_base.py` — genera 81 chunks:
    - 72 de servicios (18 servicios x 4 tipos: descripcion, precio, preparacion, cuidados)
    - 9 generales (horarios, cancelacion, pagos, ubicacion, etc.)
  - Embeddings con `text-embedding-3-small` (1536 dimensiones)
  - Threshold RAG bajado a 0.5 en `services/rag_service.py`

**Resultado:** `knowledge_base` = 81 filas (era 0). RAG funcional en ai_brain.py, voice_service.py, y nurse_bot.py.

---

### [x] Tarea 1.4 — Conectar opportunity_detector ✅

**Implementacion:**
- **Commit `86bb9b1`:**
  - `main.py` lines 586-591: Llama `OpportunityDetector.detectar()` despues de AI response
  - `main.py` lines 623-628: Link oportunidades con `interaction_id`
  - `services/opportunity_detector.py`: Thresholds bajados para trafico real, 8 tipos de oportunidad (HOT_LEAD, UPSELL, CROSS_SELL, WINBACK, PRICE_OBJECTION, REFERRAL, VIP_POTENTIAL, REACTIVATION)

**Resultado:** `detected_opportunities` crece automaticamente con trafico.

---

### [x] Tarea 1.5 — Conectar revenue_attribution ✅

**Implementacion:**
- **Commit `5de3e33`:**
  - `services/payment_service.py` lines 257-285: Cuando `new_status == "PAID"`, llama `atribuir_revenue()`
  - `services/revenue_attribution.py`: `atribuir_revenue()` busca `conversation_id` → si SofIA agendo = 100% atribucion, si no = 0%
  - Inserta REVENUE_CONFIRMED en `detected_opportunities` con status CONVERTED

**Resultado:** Activo, pendiente de pagos reales (Wompi RUT).

---

## BLOQUE 2 — "FOLLOW-UP AUTOMATICO" ✅ COMPLETADO

### [x] Tarea 2.1 — Recordatorio 24h antes ✅

**Implementacion:**
- **Commit `5b09d96`:**
  - `jobs/reminder_bot.py` → `ejecutar_recordatorio_24h()`
  - Query: citas CONFIRMED+SCHEDULED de manana
  - Dedup: `interaction_logs` WHERE `ai_analysis->>intent = 'REMINDER_24H'` (diario)
  - WhatsApp: "te recordamos que manana tienes tu cita de {servicio}..."
  - Log: `bot_execution_logs` (bot_name="REMINDER")
- **Scheduler:** `scheduler.py` job `reminder_24h` — CronTrigger hour=20, tz=America/Bogota

---

### [x] Tarea 2.2 — Confirmacion 2h antes ✅

**Implementacion:**
- **Commit `e697290`:**
  - `jobs/reminder_bot.py` → `ejecutar_confirmacion_2h()`
  - Query: citas CONFIRMED en proximas 3 horas
  - Dedup: `interaction_logs` WHERE `ai_analysis->>intent = 'REMINDER_CONFIRM_2H'` (diario)
  - WhatsApp: "tu cita de {servicio} es en 2 horas..."
  - Log: `bot_execution_logs` (bot_name="REMINDER")
- **Scheduler:** `scheduler.py` job `confirm_2h` — CronTrigger hour='7-19', tz=America/Bogota
- **Bugfix S12:** Dedup query corregido de `"CONFIRM_2H"` a `"REMINDER_CONFIRM_2H"` (matching save)

---

### [x] Tarea 2.3 — Follow-up post-procedimiento (Nurse Bot) ✅

**Implementacion:**
- **Commit `caef2de`:**
  - `jobs/nurse_bot.py` → `ejecutar_followup_postprocedimiento()`
  - Query: citas COMPLETED de hace 24-72h
  - RAG: `buscar_contexto_relevante("cuidados despues de {servicio}")` para tips personalizados
  - Dedup: `interaction_logs` WHERE `ai_analysis->>intent = 'NURSE_FOLLOWUP'` (72h)
  - WhatsApp: "esperamos que te encuentres bien despues de tu {servicio}. Recuerda: {tips}..."
  - Log: `bot_execution_logs` (bot_name="NURSE")
- **Scheduler:** `scheduler.py` job `nurse_followup` — CronTrigger hour=10, tz=America/Bogota

---

### [x] Tarea 2.4 — Reactivacion de pacientes inactivos (Hunter Bot) ✅

**Implementacion:**
- **Commit `da97f85`:**
  - `jobs/hunter_bot.py` → `ejecutar_reactivacion()`
  - Query: `patient_ml_features` WHERE `days_since_last_contact > 30`, limit 30/org
  - Verifica NO tiene cita futura
  - Dedup: `interaction_logs` WHERE `ai_analysis->>intent = 'HUNTER_REACTIVACION'` (30 dias)
  - Limite: max 10 mensajes por org por ejecucion
  - Servicio recomendado: `primary_interest` de ml_features
  - Mensajes rotativos (3 variantes) para no ser repetitivo
  - Marca oportunidades WINBACK como ACTED_ON en `detected_opportunities`
  - Log: `bot_execution_logs` (bot_name="HUNTER")
- **Scheduler:** `scheduler.py` job `hunter_reactivacion` — CronTrigger day_of_week='mon', hour=10, tz=America/Bogota

---

### [x] Tarea 2.5 — Conectar scheduler a main.py ✅

**Implementacion:**
- **Commit `0eacf94`:**
  - `main.py` line 14: `from scheduler import iniciar_scheduler, detener_scheduler`
  - `main.py` lines 62-65: `@app.on_event("startup")` → `iniciar_scheduler()`
  - `main.py` lines 68-70: `@app.on_event("shutdown")` → `detener_scheduler()`
  - `scheduler.py`: `iniciar_scheduler()` crea AsyncIOScheduler con 8 jobs, `detener_scheduler()` limpia

---

### Bugfixes adicionales Sesion 12 (post-verificacion)

| Bug | Archivo | Fix |
|-----|---------|-----|
| `"PARTIAL_FAILURE"` viola CHECK constraint | `reminder_bot.py`, `nurse_bot.py`, `hunter_bot.py` | → `"PARTIAL"` (12 ocurrencias) |
| `"FAILURE"` viola CHECK constraint | `reminder_bot.py`, `nurse_bot.py`, `hunter_bot.py` | → `"ERROR"` (6 ocurrencias) |
| Dedup query `"CONFIRM_2H"` no matchea save `"REMINDER_CONFIRM_2H"` | `reminder_bot.py` line 279 | → `"REMINDER_CONFIRM_2H"` |
| Intents faltantes en VALID_INTENTS | `config.py` | Agregados: `HUNTER_REACTIVACION`, `NURSE_FOLLOWUP`, `REMINDER_CONFIRM_2H` |

---

## BLOQUE 3 — "DASHBOARD QUE IMPRESIONA" (Sprint 2)

**Repo:** `sofia-dashboard` (React + Vite + TypeScript en Vercel)

### Tarea 3.1 — Pipeline visual de pacientes

**Crear componente:** `PipelineView.tsx`

**Columnas del pipeline:**
| Etapa | Criterio |
|-------|----------|
| Lead | Tiene interaccion pero no cita |
| Contactado | > 3 interacciones |
| Cita Agendada | Tiene appointment SCHEDULED/CONFIRMED |
| Cita Completada | Tiene appointment COMPLETED |
| Pagado | Tiene payment PAID |
| Recurrente | > 1 appointment COMPLETED |

**Data:** Query de Supabase que agrupa pacientes por etapa.

---

### Tarea 3.2 — Metricas de Voice AI

**Agregar seccion al dashboard Overview:**
- Total llamadas (interaction_logs WHERE platform = 'VOICE_CALL')
- Citas agendadas por voz vs WhatsApp
- Duracion promedio (del data_lake_raw tipo METRIC)

---

### Tarea 3.3 — Vista de Oportunidades mejorada

**Mejorar pagina Oportunidades:**
- Lista de detected_opportunities con status, valor estimado, paciente
- Boton "Actuar" → cambia status a ACTED_ON
- Boton "Convertida" → cambia a CONVERTED
- Filtros por tipo (UPSELL, CROSS_SELL, REACTIVATION)

---

### Tarea 3.4 — Data Lake dashboard

**Mejorar pagina Data Lake:**
- Total samples raw vs training
- Quality score promedio
- Samples listos para fine-tuning (is_training_ready = true)
- Boton "Export JSONL" → llama al endpoint existente
- Grafica de ingesta por dia

---

## BLOQUE 4 — "FINE-TUNING PIPELINE" (Sprint 2)

### Tarea 4.1 — Implementar train_sofia.py

**Archivo:** `train_sofia.py` (actualmente VACIO)

**Pipeline:**
```
1. Query data_lake_training WHERE quality_score >= 0.7 AND exported_at IS NULL
2. Formatear en JSONL:
   {"messages": [
     {"role": "system", "content": "...prompt blindado..."},
     {"role": "user", "content": "...mensaje real..."},
     {"role": "assistant", "content": "...respuesta real..."}
   ]}
3. Upload archivo a OpenAI Files API
4. Crear fine-tuning job: POST /v1/fine_tuning/jobs
   - model: "gpt-4o-mini-2024-07-18"
   - training_file: file_id
5. Guardar en data_lake_models:
   {model_name: "sofia-v1-{timestamp}", base_model: "gpt-4o-mini",
    training_samples: N, status: "TRAINING"}
6. Poll status hasta COMPLETED
7. Actualizar data_lake_models con model_id, training_loss, etc.
8. Marcar samples como exported_at = now()
```

**Criterio de exito:** `data_lake_models` tiene 1 fila con status COMPLETED.

---

### Tarea 4.2 — Auto-switch a modelo fine-tuned

**Archivos:** `config.py` + `services/ai_brain.py`

**Logica:**
```python
def get_model_for_org(org_id):
    model = supabase.table("data_lake_models")\
        .select("model_id")\
        .eq("status", "DEPLOYED")\
        .order("created_at", desc=True)\
        .limit(1).execute()

    if model.data and model.data[0].get("model_id"):
        return model.data[0]["model_id"]  # ft:gpt-4o-mini:org:sofia-v1:xxx
    return GPT_MODEL_MAIN  # fallback a GPT-4o
```

---

## BLOQUE 5 — "VOZ ENTERPRISE" (Sprint 2)

### Tarea 5.1 — Outbound calls (llamadas salientes)

**Usar Vapi API:**
```python
def llamar_paciente(phone: str, message: str, org_id: str):
    vapi_config = get_vapi_config(org_id)
    response = requests.post(
        "https://api.vapi.ai/call",
        headers={"Authorization": f"Bearer {vapi_config['api_key']}"},
        json={
            "assistantId": vapi_config["assistant_id"],
            "customer": {"number": phone},
            "metadata": {"org_id": org_id, "purpose": "followup"}
        }
    )
    return response.json()
```

### Tarea 5.2 — Transfer call a humano

En Vapi Dashboard: agregar tool `transferCall`, configurar numero destino.

### Tarea 5.3 — Voicemail

Si la llamada no se contesta en 30s: grabar, transcribir, notificar por WhatsApp.

---

## BLOQUE 6 — "ENTERPRISE & ESCALA" (Sprint 3)

### Tarea 6.1 — CI/CD con GitHub Actions
### Tarea 6.2 — Unit tests (pytest)
### Tarea 6.3 — Sentry error tracking
### Tarea 6.4 — Multi-sede UI
### Tarea 6.5 — A/B testing de prompts

---

## ORDEN DE EJECUCION ACTUALIZADO

```
COMPLETADO (Sesiones 11-12):
  ✅ Tareas 1.1-1.5 (arreglar lo roto)
  ✅ Tareas 2.1-2.5 (follow-up automatico)

PROXIMO (Sprint 2):
  Semana 1: Tareas 3.1-3.4 (dashboard improvements)
  Semana 2: Tarea 4.1 (train_sofia.py) + 5.1 (outbound calls)
  Semana 3: Tarea 4.2 (auto-switch modelo) + 5.2 (transfer call)

DESPUES (Sprint 3):
  Tareas 6.1-6.5 (CI/CD, tests, Sentry, multi-sede, A/B)
```

---

*Ataraxia IA Labs — Cada dato es una decision. Cada decision es dinero.*
