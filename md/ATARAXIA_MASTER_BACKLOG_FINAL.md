# ATARAXIA IA LABS — MASTER BACKLOG FINAL
## Auditoría Total: Sesiones 1-14 · Fecha: 22 Febrero 2026
## NADA MÁS QUEDA POR DESCUBRIR. ESTE ES EL DOCUMENTO DEFINITIVO.

---

## RESUMEN: 78 ITEMS TOTALES

| Bloque | Items | Prioridad | Cuándo |
|--------|-------|-----------|--------|
| 🔴 P0 — Pre-demo (bloqueante) | 12 | HOY | Antes de presentar a la clínica |
| 🟡 P1 — Producto competitivo | 18 | Sprint 1 | Primera semana post-demo |
| 🟢 P2 — Enterprise scale | 14 | Sprint 2 | Cuando 5+ clínicas |
| 🔵 P3 — White-label & premium | 12 | Sprint 3 | Cuando primer Enterprise |
| 🟣 P4 — ML/AI avanzado | 8 | Futuro | Cuando 100K+ datos |
| ⚪ P5 — Nice-to-have / Creativo | 14 | Aspiracional | Cuando todo lo demás esté hecho |
| **TOTAL** | **78** | | |

---

# 🔴 P0 — PRE-DEMO (12 items)
## Sin estos, NO puedes presentar a la clínica. Son bloqueantes.

---

### P0-01. SUPER ADMIN DASHBOARD (para ti, no para clínicas)
**Estado:** ❌ NO EXISTE
**Qué:** Hoy para registrar una clínica, crear servicios, configurar horarios — TODO es manual con SQL en Supabase. Eso no escala. Necesitas TU propio dashboard de administración.

**Páginas del Super Admin:**

**a) Vista global de organizaciones**
- Lista de todas las orgs con: nombre, plan, status, fecha creación, # pacientes, # citas, # interacciones, revenue atribuido, última actividad
- Filtros: por plan (TRIAL/BASIC/PRO/ENTERPRISE), por status (ACTIVE/PAUSED/CANCELLED)
- Botón "Crear nueva organización"
- Indicador de salud por org (verde/amarillo/rojo basado en: errores últimas 24h, bots ejecutando, data lake ingesta activa)

**b) Detalle de organización**
- Editar nombre, plan, status, config_settings
- Ver/editar system_prompt
- Ver/editar services_catalog (CRUD visual, no SQL)
- Ver/editar business_hours (grid visual Lun-Dom)
- Ver/editar org_users (agregar/quitar acceso, cambiar roles)
- Ver branches (sedes) y su config
- Botón "Poblar knowledge base" (auto-genera con servicios actuales)
- Botón "Test WhatsApp" (envía mensaje de prueba)
- Botón "Test Voice" (hace llamada de prueba)
- Log de actividad: últimas 50 interacciones, últimos errores

**c) Crear nueva organización (wizard)**
- Paso 1: Nombre, slug, plan, especialidad (estética/odontología/ambas)
- Paso 2: Email + password del dueño → crea Auth user + org_users (role=OWNER)
- Paso 3: Servicios (templates pre-cargados por especialidad + custom)
- Paso 4: Horarios (grid visual, pre-cargado Lun-Vie 8-6, Sáb 8-1)
- Paso 5: System prompt (auto-generado con nombre, servicios, horarios, tono)
- Paso 6: WhatsApp phone_id (input manual — requiere config en Meta)
- Paso 7: Vapi config (si plan Pro) — assistant_id, voice_id
- Al completar: auto-genera knowledge_base, status = ACTIVE
- **Esto reemplaza las 8+ queries SQL manuales que haces hoy**

**d) Métricas globales**
- Revenue total atribuido a SofIA (todas las orgs)
- Total pacientes, total citas, total interacciones
- Costo total OpenAI tokens (por org y global)
- Costo Vapi (por org y global)
- Gráfica de crecimiento (nuevas orgs por semana/mes)
- Tabla: org | plan | MRR | costo OpenAI | costo Vapi | margen

**e) Billing & Usage tracking**
- Por org: # conversaciones este mes, # llamadas voz, # tokens usados
- Alertas: org cerca del límite de conversaciones del plan
- Export CSV de uso por org para facturación manual

**f) System-wide health**
- Estado de Render (up/down/sleeping)
- Estado de Supabase (connections, storage)
- Errores Sentry últimas 24h por org
- Bots: última ejecución de cada bot por org
- Data lake: ingesta últimas 24h por org

**Implementación:**
- Ruta: /admin/* (protegida con role = SUPER_ADMIN)
- Nueva tabla: `super_admins` (user_id, created_at) — solo tú
- O más simple: flag `is_super_admin` en org_users/auth metadata
- Backend: nuevos endpoints /admin/* con verificación de super_admin
- Dashboard: nuevas páginas en /admin con layout diferente

---

### P0-02. ONBOARDING SELF-SERVICE (endpoint + wizard)
**Estado:** ❌ Parcial — landing tiene formulario → leads, pero después es manual
**Qué:** Doctor llena formulario → recibe credenciales → entra al dashboard → wizard 4 pasos → SofIA lista

**Backend — POST /onboarding/register:**
```
Input: {email, password, clinic_name, phone, specialty, plan}
Proceso:
  1. Crear usuario en Supabase Auth
  2. Crear organization (name, plan=TRIAL, status=SETUP)
  3. Crear org_users (user_id, org_id, role=OWNER)
  4. Insertar business_hours defaults (Lun-Vie 8-6, Sáb 8-1)
  5. Generar system_prompt default basado en specialty
  6. Enviar email de bienvenida con link al dashboard
Output: {org_id, user_id, dashboard_url}
```

**Dashboard — Wizard post-registro (si org.status = SETUP):**
- Paso 1: "Datos de tu clínica" — nombre, dirección, ciudad, teléfono, especialidades (checkboxes), logo (upload)
- Paso 2: "Tus servicios" — templates pre-cargados por especialidad + formulario para agregar custom (nombre, precio COP, duración min, categoría). Botón "agregar otro"
- Paso 3: "Tus horarios" — grid visual Lun-Dom. Cada día: checkbox activo, hora apertura, hora cierre, duración slot. Pre-cargado con defaults
- Paso 4: "Personaliza a SofIA" — tono (formal/casual/paisa/neutro), mensaje de bienvenida personalizado, instrucciones especiales ("no ofrecer descuentos", "siempre mencionar la garantía")
- Al completar: auto-genera system_prompt con datos de pasos 1-4, llama populate_knowledge_base, cambia org.status = ACTIVE, redirect al dashboard principal

**Lo ÚNICO que queda manual:** conectar WhatsApp Business API (requiere Meta approval) y configurar Vapi (si es Pro). Todo lo demás es self-service.

---

### P0-03. TOOLS NUEVOS PARA SOFIA (4 tools faltantes)
**Estado:** SofIA tiene 7 tools. Necesita 11 mínimo para demo.

**a) reagendar_cita:**
- Paciente: "¿puedo cambiar mi cita para el jueves?"
- SofIA busca cita activa → cancela la vieja → agenda nueva → confirma
- Hoy: tiene que cancelar y volver a agendar. 2 pasos donde debería ser 1

**b) confirmar_asistencia:**
- Paciente: "sí voy" o "confirmo mi cita"
- SofIA marca appointment.status = CONFIRMED
- Responde con instrucciones de preparación si hay en KB
- Hoy: el paciente dice "sí voy" y SofIA no sabe qué hacer con eso

**c) consultar_preparacion:**
- Paciente: "¿qué tengo que hacer antes del botox?"
- SofIA busca en knowledge_base "preparación + servicio"
- Responde con instrucciones pre-procedimiento específicas
- Hoy: depende de que el prompt lo tenga hardcodeado

**d) calificar_atencion:**
- SofIA post-procedimiento: "¿Cómo fue tu experiencia del 1 al 5?"
- Paciente da score → guarda en patient_ml_features (avg_sentiment) + data_lake_raw (NPS_SCORE)
- Si score ≤ 2: alerta automática al doctor vía WhatsApp
- Dato valiosísimo para: data lake, reentrenamiento, detección de problemas

---

### P0-04. SENTIMENT SCORING AUTOMÁTICO
**Estado:** ❌ NO EXISTE
**Qué:** Cada mensaje del paciente debería tener un sentiment (positivo/negativo/neutro).
**Cómo:** En ai_brain.py, después de analizar el intent, agregar al ai_analysis JSON: `"sentiment": "POSITIVE"/"NEGATIVE"/"NEUTRAL"`. No gastar tokens extra: usar el análisis que ya hace ai_brain + palabras clave (gracias, excelente = POSITIVE; queja, terrible, horrible = NEGATIVE).
**Impacto:** Alimenta data_lake_training, permite filtrar conversaciones buenas vs malas para fine-tuning, alerta si muchos pacientes están negativos.

---

### P0-05. CONVERSATION QUALITY SCORING
**Estado:** ❌ NO EXISTE
**Qué:** Cada interacción necesita un score de calidad 0-1.
**Criterios:**
- ¿SofIA resolvió lo que el paciente pedía? (usó tool = +0.3)
- ¿El paciente tuvo que repetir? (>2 mensajes mismo intent = -0.2)
- ¿El paciente quedó satisfecho? (sentiment posterior POSITIVE = +0.2)
- ¿La conversación terminó con acción? (cita agendada, precio consultado = +0.3)
**Dónde:** Guardar en data_lake_raw.quality_score. Alimenta data_lake_training automáticamente (solo quality ≥ 0.7 entra).

---

### P0-06. PATIENT JOURNEY TRACKING
**Estado:** ❌ Solo se calcula en pipeline de dashboard, no se trackea como evento
**Qué:** Cada transición del paciente es un dato:
- FIRST_CONTACT → PRICE_INQUIRY → APPOINTMENT_SCHEDULED → APPOINTMENT_CONFIRMED → APPOINTMENT_COMPLETED → PAYMENT_RECEIVED → RETURNING_PATIENT
**Cómo:** Cada vez que un paciente cambia de etapa, insertar en data_lake_raw:
```
{data_type: "PATIENT_JOURNEY", content: {stage: "APPOINTMENT_SCHEDULED", from_stage: "PRICE_INQUIRY"}, patient_id, org_id}
```
**Impacto:** Permite medir funnel de conversión real. Responde: "¿en qué paso se pierden los pacientes?"

---

### P0-07. RATE LIMITING (ya en Bloque A)
**Estado:** ⚠️ Debería estar implementado por Claude Code
**Verificar:** slowapi en main.py, límites por endpoint

---

### P0-08. CORS RESTRICTIVO (ya en Bloque A)
**Estado:** ⚠️ Debería estar implementado por Claude Code
**Verificar:** allow_origins no es ["*"]

---

### P0-09. WEBHOOK SIGNATURE VERIFICATION (ya en Bloque A)
**Estado:** ⚠️ Debería estar implementado por Claude Code
**Verificar:** X-Hub-Signature-256 verificado con HMAC

---

### P0-10. PLAN GATING (ya en Bloque A)
**Estado:** ⚠️ Debería estar implementado por Claude Code
**Verificar:** get_org_plan() con caché, verificación en endpoints

---

### P0-11. OPENAI RETRY + FALLBACK (ya en Bloque A)
**Estado:** ⚠️ Debería estar implementado por Claude Code
**Verificar:** exponential backoff, GPT-4o → GPT-4o-mini → template

---

### P0-12. LANDING AUDIT & FIXES
**Estado:** ⚠️ Landing existe pero necesita revisión
**Qué revisar:**

**a) Coherencia promesas vs realidad:**
- "Confirma asistencia, envía recordatorios" → ¿bots funcionando?
- "Revenue Engine — Detecta oportunidades" → ¿opportunity_detector conectado?
- "Follow-up Automático" → ¿nurse/hunter bot ejecutando?
- "Fine-tuning por Clínica" → ¿train_sofia.py implementado?
- Cualquier promesa que no funcione → quitar de landing o agregar disclaimer "próximamente"

**b) Branding consistente:**
- Logo Ataraxia IA Labs en toda la landing
- Colores corporativos consistentes
- Font consistente
- Fotos/imágenes profesionales (no stock genérico)
- Favicon correcto

**c) Formulario de contacto:**
- ¿Inserta en `leads` correctamente?
- ¿Envía notificación a ti? (email o WhatsApp)
- ¿Tiene campos suficientes? (nombre, email, clínica, WhatsApp, plan interés, fuente)

**d) SEO básico:**
- Meta title, description, og:image
- Schema markup para SaaS
- Sitemap.xml
- robots.txt

**e) Performance:**
- Lighthouse score > 90
- Lazy loading imágenes
- Minificado CSS/JS

**f) Legal:**
- Política de privacidad (link funcional)
- Términos y condiciones (link funcional)
- Habeas data Colombia (ley 1581 de 2012)
- Aviso de cookies si aplica

**g) CTA claro:**
- Botón principal: "Agenda tu demo" o "Empieza gratis"
- WhatsApp floating button directo a tu número
- Formulario visible sin scroll excesivo

---

# 🟡 P1 — PRODUCTO COMPETITIVO (18 items)
## Hacen que SofIA sea mejor que cualquier competidor. Sprint 1 post-demo.

---

### P1-01. RAG con trust_level
**Estado:** ⚠️ RAG funciona, trust_level existe en ml_features, pero no cambia tono
**Qué:** Si trust_level < 0.5 → SofIA: "sé más empática, menciona testimonios, ofrece valoración gratis". Si > 0.8 → "ve directo al grano, ofrece fecha inmediata"
**Dónde:** ai_brain.py — inyectar instrucción en system_prompt basado en trust_level del paciente

### P1-02. Predicción de conversión activa
**Estado:** ⚠️ conversion_probability existe pero no se usa
**Qué:** Si probability > 0.7 → marcar HOT_LEAD auto en pipeline. Si < 0.3 → hunter_bot no gasta tokens.
**Dónde:** opportunity_detector.py + hunter_bot.py

### P1-03. Cacheo de FAQs
**Estado:** ❌
**Qué:** "¿dónde queda la clínica?" se repite 50 veces. No gastar tokens cada vez.
**Implementar:** Dict en memoria con TTL 1h. Key = hash(intent + org_id). Si hit, responder sin llamar OpenAI.
**Impacto:** Reduce costo OpenAI ~30%

### P1-04. Export JSONL programado
**Estado:** ❌ Solo manual
**Qué:** Job dominical 3am, auto-export training data a archivo.

### P1-05. Graceful degradation Supabase
**Estado:** ❌ Solo OpenAI tiene fallback
**Qué:** Si Supabase no responde en 5s → responder desde caché (últimos horarios, últimos precios).

### P1-06. Dead letter queue webhooks
**Estado:** ❌
**Qué:** Webhook falla → guardar body + error en dead_letter_queue → job cada hora reprocesa.
**Tabla nueva:** dead_letter_queue (id, payload JSONB, error TEXT, attempts INT, created_at, next_retry_at)

### P1-07. Templates WhatsApp Business
**Estado:** ❌
**Qué:** Mensajes fuera de ventana 24h FALLAN. Bots (reminder, hunter, nurse) envían fuera de ventana.
**Implementar:** Crear templates en Meta Business. Detectar si fuera de ventana → usar template message.
**CRÍTICO para bots:** Sin esto, recordatorios de citas NO LLEGAN si el paciente no escribió hoy.

### P1-08. Wompi keys por sede
**Estado:** ❌
**Qué:** Cada sede puede tener cuenta bancaria diferente.
**Dónde:** branches.config_settings → wompi_public_key, wompi_private_key

### P1-09. WhatsApp por sede
**Estado:** ❌
**Qué:** Cada sede puede tener número de WhatsApp diferente.
**Dónde:** branches.whatsapp_phone_id → main.py resuelve org por número entrante

### P1-10. Reportes por sede
**Estado:** ❌
**Qué:** Dashboard muestra todo junto. Debería poder filtrar por sede.
**Dónde:** Todos los endpoints analytics aceptar ?branch_id= opcional. Dashboard: selector de sede global

### P1-11. Consentimiento informado digital
**Estado:** ❌
**Qué:** Antes de procedimiento, enviar PDF de consentimiento por WhatsApp. Paciente firma digitalmente.
**Escenario clínica exigente:** "¿SofIA envía el consentimiento antes de la cita? Porque si no, mi recepcionista tiene que hacerlo manual."
**Implementar:** Template de consentimiento por servicio en knowledge_base. Tool enviar_consentimiento que genera PDF y envía por WhatsApp. Registro en appointment (consent_sent_at, consent_signed_at).

### P1-12. Notificaciones al doctor
**Estado:** ❌
**Qué:** El doctor necesita saber:
- Nueva cita agendada → WhatsApp al doctor
- Cita cancelada → WhatsApp al doctor
- Paciente con NPS ≤ 2 → WhatsApp urgente
- Oportunidad de venta detectada → WhatsApp
- Pago recibido → WhatsApp con monto
**Implementar:** config_settings.notification_phone + notification_preferences (qué notificar y por qué canal)

### P1-13. Mensajes multimedia de SofIA
**Estado:** ❌
**Qué:** SofIA solo envía texto. Debería poder enviar:
- Foto de "antes y después" del servicio (desde knowledge_base)
- Mapa de ubicación de la clínica
- PDF de consentimiento
- Audio de instrucciones pre-procedimiento
**Escenario:** Paciente pregunta "¿cómo queda el botox?" → SofIA envía foto real de resultado

### P1-14. Conversación multi-turno mejorada
**Estado:** ⚠️ Funciona pero limitado
**Qué:** SofIA debería recordar contexto de la conversación completa:
- "Quiero botox" → "Claro, ¿para cuándo?" → "Mañana" → "¿A qué hora?" → "3pm" → AGENDA
- Hoy a veces pierde el servicio entre turnos
**Mejora:** Mantener estado de la conversación en memory_service con: intent_actual, servicio_mencionado, fecha_mencionada, hora_mencionada

### P1-15. Horario inteligente
**Estado:** ❌
**Qué:** Si un paciente pregunta por cita y hay muchos slots → SofIA sugiere los mejores horarios (no lista todos).
**Lógica:** Mostrar máximo 3 opciones. Priorizar: slots vacíos contiguos, horarios populares de este paciente, horarios con menor ocupación.

### P1-16. Respuesta a ubicación compartida
**Estado:** ❌
**Qué:** Paciente comparte ubicación de WhatsApp → SofIA calcula distancia a la clínica → "Estás a 15 minutos de nuestra sede principal"
**Requiere:** Guardar lat/lon de la clínica en organizations. Calcular distancia con fórmula haversine.

### P1-17. Detección de urgencias médicas
**Estado:** ⚠️ Escala a humano pero no detecta urgencias médicas específicas
**Qué:** Paciente post-botox: "me está sangrando mucho" → SofIA: escalamiento INMEDIATO + WhatsApp urgente al doctor + instrucciones de primeros auxilios
**Keywords:** sangrado, inflamación excesiva, fiebre, dificultad respirar, reacción alérgica
**Diferente de escalamiento a humano:** esto es URGENCIA MÉDICA con protocolo específico

### P1-18. WhatsApp Business Profile completo
**Estado:** ❌
**Qué:** El perfil de WhatsApp Business de la clínica debe tener:
- Foto de perfil con logo
- Descripción del negocio
- Dirección
- Horarios de atención
- Catálogo de servicios (WhatsApp Business Catalog API)
- Link al sitio web
**Impacto:** Profesionalismo. Confianza del paciente.

---

# 🟢 P2 — ENTERPRISE SCALE (14 items)
## Cuando tengas 5+ clínicas activas.

---

### P2-01. Render Standard ($25/mes)
Backend no se duerme. Crítico con 3+ clínicas.

### P2-02. Test de carga (Locust)
Simular 50 conversaciones concurrentes. Verificar que no crashea.

### P2-03. Métricas latencia P50/P95/P99
Middleware que mide latencia de cada endpoint. Dashboard de performance.

### P2-04. Alertas Slack/email automáticas
Sentry alerta → Slack channel → tú te enteras en tiempo real.
Configurar: errores > 10/hora, latencia P95 > 5s, bot falló ejecución, data lake sin ingesta 24h.

### P2-05. Audit log
Tabla audit_logs: quién cambió qué en el dashboard (system_prompt, servicios, horarios).
Cada UPDATE en tablas críticas → INSERT en audit_logs con: user_id, table_name, action, old_value, new_value, timestamp.

### P2-06. 2FA dashboard
Supabase Auth soporta TOTP. Habilitar para roles OWNER y ADMIN.
Compliance: datos de pacientes en Colombia → ley 1581 de 2012 habeas data.

### P2-07. API keys por cliente
Para clínicas Enterprise que quieran integrar con su propio software.
Tabla: api_keys (id, org_id, key_hash, permissions, rate_limit, created_at, expires_at, is_active).
Middleware que verifica API key en header X-API-Key.

### P2-08. Rotación de secrets programada
Documentar proceso para rotar: SUPABASE_KEY, OPENAI_API_KEY, META_TOKEN, VERIFY_TOKEN.
Alerta cuando un secret tiene > 90 días sin rotar.

### P2-09. Rollback strategy documentada
Proceso paso a paso para revertir un deploy malo:
1. Render → deploy anterior
2. Supabase → restore backup (point in time)
3. Verificar /health
4. Comunicar a clínicas afectadas

### P2-10. Integration tests E2E
Test automatizado: enviar WhatsApp → verificar respuesta → agendar cita → verificar en DB → cancelar → verificar.
Usar Supabase test project + Meta test phone number.

### P2-11. Database backups documentados
Supabase hace backups automáticos (plan Pro: 7 días point-in-time).
Documentar: cómo restaurar, RPO, RTO.
Agregar export semanal a Storage como backup adicional.

### P2-12. Multi-región
Cuando haya clínicas en México, Chile, Argentina: considerar CDN, región de Supabase.
Hoy: todo en us-east-1. Latencia aceptable para LATAM pero no ideal.

### P2-13. Connection pooling
Supabase tiene límite de conexiones. Con 20+ clínicas concurrentes, puede saturar.
Configurar: PgBouncer (Supabase lo incluye), pool_mode=transaction.

### P2-14. Monitoring dashboard (Grafana/Datadog)
Cuando manual monitoring no escale: métricas de infra, APM, tracing distribuido.

---

# 🔵 P3 — WHITE-LABEL & PREMIUM (12 items)
## Cuando tengas primer cliente Enterprise.

---

### P3-01. Dominio custom por clínica
clinica.sofia.ai o sofia.miclinicareal.com. Vercel soporta custom domains.

### P3-02. Logo custom en dashboard
Upload logo en settings → se muestra en header del dashboard. Guardado en Supabase Storage.

### P3-03. Tema colores CSS por org
organizations.config_settings.theme = {primary: "#2E75B6", secondary: "#..."}
Dashboard aplica colores dinámicamente.

### P3-04. Email templates con branding
Recordatorios, confirmaciones, post-procedimiento — con logo y colores de la clínica.
Usar: Resend o SendGrid con templates HTML.

### P3-05. Widget web chat embeddable
Script que la clínica pone en su sitio web:
```html
<script src="https://sofia.ataraxiaialabs.ai/widget.js" data-org="ORG_ID"></script>
```
Abre chat con SofIA sin necesitar WhatsApp. Mismos tools, mismo cerebro.

### P3-06. Página booking pública
URL: booking.ataraxiaialabs.ai/clinica-nombre
Paciente puede agendar cita sin WhatsApp. Seleccionar servicio → fecha → hora → datos → confirmar.
Útil para: links en Instagram, Google My Business, firmas de email.

### P3-07. Reportes PDF automatizados
Reporte mensual PDF auto-generado y enviado al dueño de la clínica:
- Resumen: citas, revenue, pacientes nuevos, NPS promedio
- Gráficas: tendencia mensual, distribución por servicio
- ROI: "SofIA generó $X en citas este mes"
- Recomendaciones: "El servicio X tiene alta demanda, considerar más slots"

### P3-08. Multi-idioma (inglés + portugués)
Para clínicas en Miami, São Paulo, o con pacientes extranjeros.
system_prompt detecta idioma del mensaje → responde en el mismo idioma.
Dashboard: selector de idioma (ES/EN/PT).

### P3-09. Integración con Google Calendar
Sync citas de SofIA ↔ Google Calendar del doctor.
Cuando SofIA agenda → aparece en Google Calendar. Cuando doctor agenda manual → SofIA lo sabe.

### P3-10. Integración con Google My Business
Respuestas automáticas a reseñas. Review request post-procedimiento.
Paciente NPS ≥ 4 → "¿Nos dejarías una reseña en Google? [link]"

### P3-11. Facturación electrónica Colombia
Integración con proveedor de facturación electrónica (Siigo, Alegra, o similar).
Cuando pago confirmado → generar factura electrónica automáticamente.
Requerido legalmente en Colombia para todos los comercios.

### P3-12. App móvil para el doctor
React Native o Flutter. El doctor ve desde su celular:
- Citas del día
- Notificaciones en tiempo real
- Aprobar/rechazar citas
- Ver conversaciones de SofIA
- Dashboard básico de métricas

---

# 🟣 P4 — ML/AI AVANZADO (8 items)
## Cuando tengas 100K+ interacciones en el data lake.

---

### P4-01. Modelo propio fine-tuned
train_sofia.py → producción. Fine-tune GPT-4o-mini con datos reales.
Auto-switch cuando modelo supere baseline en métricas de calidad.

### P4-02. Scoring leads automático (ML)
Modelo que predice: este lead va a agendar cita? Hot/Warm/Cold basado en: # mensajes, tiempo de respuesta, preguntas de precio, sentiment.
Reemplaza reglas hardcodeadas del opportunity_detector.

### P4-03. Dynamic pricing
Precios varían por demanda/hora/día. Más caro en horarios pico, descuento en horarios vacíos.
"El botox está a $800,000 pero si agendas para el miércoles a las 2pm, tiene 10% de descuento."

### P4-04. Segmentación pacientes por clusters (pgvector)
Agrupar pacientes similares usando embeddings: mismo rango de edad, mismos servicios, mismo comportamiento.
Permite: campañas personalizadas por segmento.

### P4-05. Predicción conversión con variables externas
Variables: quincena (más conversiones), clima (lluvia = más cancelaciones), hora del día, día de semana.
Permite: optimizar timing de follow-up.

### P4-06. Annotation UI
Interfaz en dashboard para que el doctor marque conversaciones: "esto estuvo bien" / "esto estuvo mal".
Alimenta ai_training_feedback → mejora calidad de fine-tuning.
Botón thumbs-up/thumbs-down en cada conversación del historial.

### P4-07. Red Neuronal LATAM (aggregator cross-org)
Datos anónimos de TODAS las clínicas → modelo general → beneficia a todas.
"Las clínicas que ofrecen valoración gratis convierten 34% más" → insight para todas.
Requiere: anonimización, opt-in por clínica, compliance legal.

### P4-08. Auto-generación de system_prompt mejorado
IA que analiza las mejores conversaciones de una clínica → genera system_prompt optimizado.
"Hemos notado que cuando SofIA menciona la garantía, la conversión sube 20%. Ajustamos tu prompt."

---

# ⚪ P5 — NICE-TO-HAVE / CREATIVO (14 items)
## Para la clínica más exigente. Diferenciadores únicos.

---

### P5-01. SofIA proactiva (outreach inteligente)
SofIA no solo responde — INICIA conversaciones basadas en datos:
- "Hola María, hace 6 meses te hiciste botox. ¿Te gustaría agendar tu retoque?"
- "Juan, vimos que consultaste por rinoplastia. Tenemos una valoración gratis esta semana."
- "Laura, ¡feliz cumpleaños! 🎂 Te regalamos 15% en tu próximo tratamiento."
**Escenario clínica exigente:** "¿SofIA me consigue pacientes o solo atiende a los que ya llegan?"

### P5-02. Análisis de competencia automático
Web scraping de precios y servicios de clínicas competidoras en la misma ciudad.
Dashboard: "Tu botox está $100K más caro que el promedio de tu zona."
**Escenario:** Doctor pregunta "¿estoy cobrando bien?" → SofIA compara con mercado

### P5-03. Predictor de no-show
ML que predice qué pacientes van a faltar a su cita:
- Historial de cancelaciones
- Tiempo entre agendamiento y cita
- Hora del día (citas temprano = más no-show)
- Si confirmó o no
**Acción:** Si probabilidad > 60%, hacer llamada de voz 4h antes en vez de solo WhatsApp.

### P5-04. Sala de espera virtual
Paciente llega tarde → WhatsApp automático: "Hola, ya estamos listos. ¿En cuánto llegas?"
Si > 15 min tarde → ofrecer reagendar
Si llega a tiempo → "Tu turno es el próximo, aprox. 10 minutos de espera"
**Requiere:** Check-in del paciente al llegar (QR code, WhatsApp "ya llegué")

### P5-05. Programa de referidos
Paciente refiere a amigo → ambos reciben descuento.
SofIA después de NPS ≥ 4: "¿Conoces a alguien que le interese? Si nos recomiendas, ambos reciben 10% de descuento."
Tracking: tabla referrals (referrer_patient_id, referred_patient_id, discount_applied, status)

### P5-06. Gamificación para pacientes
Puntos por: cada visita (+100), referido (+500), reseña en Google (+200), pago puntual (+50).
Niveles: Bronze, Silver, Gold, Platinum
Beneficios por nivel: descuentos progresivos, acceso a promos exclusivas, prioridad en agenda.
Dashboard del paciente: "Tienes 1,200 puntos. ¡300 más y subes a Gold!"

### P5-07. Integración Instagram DMs
SofIA responde DMs de Instagram con el mismo cerebro.
Paciente escribe por IG → misma experiencia que WhatsApp.
**Ya existe parcialmente:** main.py maneja instagram_page_id. Verificar que funciona.

### P5-08. Dashboard para el paciente
Portal web donde el paciente ve:
- Sus próximas citas
- Historial de tratamientos
- Facturas y pagos
- Mensajes de SofIA
- Resultados de antes/después
**Diferenciador:** Ningún competidor ofrece esto.

### P5-09. Campañas de marketing automatizadas
Segmentar pacientes → crear campaña → enviar por WhatsApp (con templates aprobados).
"Enviar a todas las mujeres 30-45 años que se hicieron botox hace >6 meses: oferta de retoque."
Dashboard: crear campaña → seleccionar segmento → previsualizar → programar → enviar → ver resultados.

### P5-10. Voice AI multimodal
SofIA envía imágenes DURANTE la llamada de voz.
"Te voy a enviar por WhatsApp una foto de cómo queda el ácido hialurónico" → envía mientras habla.
Requiere: coordinación entre voice_service y whatsapp_service.

### P5-11. Detección de duplicados inteligente
Paciente escribe desde número nuevo pero es el mismo paciente.
Detectar por: nombre similar, misma cédula/ID, misma dirección, historial similar.
Merge automático: "¿Eres María García de la Calle 50? Encontré tu historial."

### P5-12. Predictor de lifetime value
ML que estima cuánto va a gastar un paciente en los próximos 12 meses.
Basado en: servicios actuales, frecuencia, ticket promedio, comportamiento similar.
Dashboard: "Tus top 10 pacientes por LTV predicho"

### P5-13. SofIA aprende del doctor
Después de cada corrección manual del doctor (cambió cita, ajustó respuesta), SofIA aprende.
ai_training_feedback → se usa en fine-tuning → SofIA mejora.
"El doctor siempre ofrece valoración gratis cuando preguntan por cirugía" → SofIA aprende a hacer lo mismo.

### P5-14. Modo vacaciones / fuera de horario inteligente
Cuando la clínica cierra:
- SofIA sigue respondiendo preguntas de información
- Agenda para el próximo día hábil
- "La clínica está cerrada por vacaciones hasta el 5 de enero. ¿Te agendo para el 6?"
**Ya existe parcialmente:** config_settings.vacation_mode. Verificar que funciona y es inteligente.

---

# ARQUITECTURA PARA ESCALAR

## Hoy (1-5 clínicas)
- Backend: Render Starter (1 instancia)
- DB: Supabase Free/Pro (1 proyecto)
- Dashboard: Vercel Free
- Landing: Cloudflare
- Costo total: ~$50/mes

## 5-20 clínicas
- Backend: Render Standard ($25/mes, no se duerme)
- DB: Supabase Pro ($25/mes, backups 7 días)
- Dashboard: Vercel Pro ($20/mes)
- Monitoring: Sentry Team ($26/mes)
- Costo total: ~$100/mes

## 20-100 clínicas
- Backend: Render Professional o AWS ECS
- DB: Supabase Team o RDS PostgreSQL
- Cache: Redis (Upstash o AWS ElastiCache)
- Queue: BullMQ o AWS SQS (para webhooks + bots)
- CDN: Cloudflare Pro
- Monitoring: Datadog o New Relic
- Costo total: ~$500-1,000/mes

## 100+ clínicas
- Backend: Kubernetes (EKS)
- DB: RDS Multi-AZ + Read Replicas
- Cache: Redis Cluster
- Queue: SQS + SNS
- Monitoring: Full APM stack
- ML: SageMaker para modelos propios
- Costo total: ~$5,000+/mes

---

# RECOLECCIÓN DE DATOS — ESTRATEGIA COMPLETA

## Qué se captura HOY:
1. Cada mensaje (interaction_logs) ✅
2. Cada cita (appointments) ✅
3. Cada pago (payments) ⏳
4. Cada ejecución de bot (bot_execution_logs) ✅
5. Data lake raw (data_lake_raw) ✅ (subió de 0 a 38)

## Qué DEBERÍA capturarse y NO se captura:
6. Sentiment de cada mensaje → P0-04
7. Quality score de cada conversación → P0-05
8. Journey stage transitions → P0-06
9. NPS score del paciente → P0-03d
10. Tiempo de respuesta de SofIA (latencia percibida)
11. Tokens usados por conversación (costo)
12. Cuántas veces el paciente tuvo que repetir
13. Si el paciente abandonó la conversación sin resolver
14. Tasa de resolución: ¿SofIA resolvió sin escalar a humano?
15. Fuente del paciente (cómo llegó: WhatsApp directo, voice, web, referido)
16. Hora del día y día de semana de cada interacción
17. Tipo de dispositivo (si disponible)

## Para qué sirven estos datos:
- Fine-tuning: entrenar modelo propio con las mejores conversaciones
- Pricing: optimizar precios por demanda
- Marketing: segmentar pacientes para campañas
- Producto: identificar qué features usan y cuáles no
- Ventas: demostrar ROI con datos reales a prospectos
- Inversión: métricas de crecimiento para levantar capital

---

# CHECKLIST PRE-DEMO

## Lo que el doctor va a querer ver:
- [ ] SofIA responde WhatsApp en < 5 segundos
- [ ] SofIA agenda cita correctamente
- [ ] SofIA consulta precio correctamente
- [ ] SofIA reagenda sin fricción
- [ ] Dashboard muestra citas en tiempo real
- [ ] Dashboard muestra pacientes
- [ ] Dashboard muestra métricas
- [ ] Voice AI funciona (si es plan Pro)
- [ ] Branding profesional en todo
- [ ] Onboarding claro y rápido

## Lo que el doctor va a PREGUNTAR:
- "¿Cuánto tarda la implementación?" → 7-14 días hábiles
- "¿Qué pasa si SofIA dice algo mal?" → escalamiento a humano + moderación
- "¿Mis datos están seguros?" → RLS, encryption at rest, compliance Colombia
- "¿Puedo ver las conversaciones?" → Sí, en el dashboard (historial completo)
- "¿Funciona con mi sistema de agenda actual?" → SofIA ES tu sistema de agenda
- "¿Qué pasa si quiero cancelar?" → Garantía 30 días, sin permanencia
- "¿Puedo personalizar las respuestas?" → 100%, system_prompt editable
- "¿Cuánto cuesta?" → Starter $497/mes, Pro $997/mes
- "¿SofIA puede cobrar?" → Sí, envía links de pago (requiere Wompi/RUT)
- "¿Y si no tengo WhatsApp Business?" → Te ayudamos a configurarlo

---

# ORDEN DE IMPLEMENTACIÓN RECOMENDADO

```
AHORA (antes de la demo):
  1. Verificar que Bloque A (security) está implementado
  2. P0-01: Super Admin Dashboard (mínimo: crear org wizard)
  3. P0-02: Onboarding self-service (mínimo: POST /onboarding/register)
  4. P0-03: 4 tools nuevos (reagendar, confirmar, preparación, calificar)
  5. P0-12: Audit landing (quitar promesas que no funcionan)

SEMANA 1 POST-DEMO:
  6. P0-04, P0-05, P0-06: Sentiment + quality + journey tracking
  7. P1-07: Templates WhatsApp (CRÍTICO para bots)
  8. P1-11: Consentimiento informado
  9. P1-12: Notificaciones al doctor
  10. P1-14: Conversación multi-turno mejorada

SEMANA 2:
  11. P1-01, P1-02, P1-03: RAG trust + predicción + cacheo
  12. P1-05, P1-06: Graceful degradation + dead letter
  13. P1-10: Reportes por sede
  14. P2-01: Render Standard (no se duerme)

MES 2:
  15. P2-05: Audit log
  16. P2-06: 2FA
  17. P2-10: Integration tests
  18. P3-05: Widget web chat
  19. P3-06: Página booking pública

MES 3+:
  20. P4-01: Modelo fine-tuned
  21. P3-07: Reportes PDF
  22. P3-09: Google Calendar
  23. Todo lo demás según demanda de clientes
```

---

*Ataraxia IA Labs — 78 items. 0 excusas. Cada dato es una decisión. Cada decisión es dinero.*
*Este documento es el ÚLTIMO. No hay más "qué falta". Todo está aquí.*
