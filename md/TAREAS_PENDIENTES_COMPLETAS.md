# ATARAXIA IA LABS — TAREAS PENDIENTES COMPLETAS
## Auditoría total: Sesiones 1-15 + Backlogs + Dashboard
## Última actualización: 22 Febrero 2026

---

## ✅ BLOQUE A — ENTERPRISE CRÍTICO (COMPLETADO — Sesión 14)

> Las 5 tareas enterprise fueron completadas. Backend es producción-ready.

### A1. Rate Limiting ✅ COMPLETADO
**Commit:** Sesión 14
**Qué se hizo:**
- `slowapi` instalado, agregado a requirements.txt
- `rate_limiter.py` creado con `Limiter(key_func=get_remote_address)`
- Límites aplicados: /webhook 30/min, /vapi 10/min, /analytics 60/min, /patients 60/min, /data-lake/export 5/min
- Response 429 Too Many Requests si excede

### A2. CORS Restrictivo ✅ COMPLETADO
**Commit:** Sesión 14
**Qué se hizo:**
- CORSMiddleware en main.py con allow_origins SOLO:
  `["https://sofia-dashboard.vercel.app", "https://ataraxiaialabs.ai", "http://localhost:3000", "http://localhost:5173"]`
- allow_credentials=True, allow_methods=["*"], allow_headers=["*"]

### A3. Webhook Signature Verification ✅ COMPLETADO
**Commit:** Sesión 14
**Qué se hizo:**
- En /webhook POST handler: lee X-Hub-Signature-256
- HMAC-SHA256 del body con META_APP_SECRET
- hmac.compare_digest() para comparar. Si no matchea → 403
- Variable de entorno: META_APP_SECRET

### A4. Plan Gating ✅ COMPLETADO
**Commit:** Sesión 14
**Qué se hizo:**
- `get_org_plan(org_id)` en config.py con caché 5 min TTL
- `require_feature(org_id, feature)` → raise 403 si plan no permite
- Tabla de permisos por plan (TRIAL/BASIC/PRO/ENTERPRISE)
- Verificado en: voice, outbound calls, A/B testing, multi-sede, data lake export, follow-up bots, fine-tuning

### A5. OpenAI Retry + Graceful Degradation ✅ COMPLETADO
**Commit:** Sesión 14
**Qué se hizo:**
- ai_brain.py y voice_service.py: retry con exponential backoff (3 intentos: 1s, 2s, 4s)
- Si GPT-4o falla 3 veces → GPT-4o-mini como fallback
- Si todo falla → respuesta template amigable
- Logging en Sentry cuando se activa fallback

---

## ✅ BLOQUE B — MEJORAS DE PRODUCTO (COMPLETADO — Sesión 15)

> 8 de 10 tareas completadas. B7 y B10 son para dashboard (pendientes).

### B1. RAG con trust_level ✅ COMPLETADO
**Commit:** Sesión 15
**Qué se hizo:**
- ai_brain.py: inyecta instrucciones de tono en system_prompt según trust_level del paciente
- trust < 0.3 → tono empático, no presionar, ofrecer testimonios
- trust < 0.5 → tono amable, info detallada
- trust > 0.8 → tono directo, sugerir upsell

### B2. Predicción de conversión activa ✅ COMPLETADO
**Commit:** Sesión 15
**Qué se hizo:**
- opportunity_detector.py: auto-detect HOT_LEAD si conversion_probability > 0.7 (ML)
- hunter_bot.py: skip follow-up si conversion_probability < 0.3 (ahorra mensajes)
- Reactivación: skip si conversion_probability < 0.2

### B3. Cacheo de FAQs ✅ COMPLETADO
**Commit:** Sesión 15
**Qué se hizo:**
- services/faq_cache.py: in-memory cache con TTL 1h, max 500 entries
- Cachea intents CONSULTAR_PRECIO y SALUDO (sin historial)
- main.py: check cache before OpenAI, store after
- Key: md5(org_id:intent:normalized_message)

### B4. Export JSONL programado ✅ COMPLETADO
**Commit:** Sesión 15
**Qué se hizo:**
- jobs/scheduled_export.py: job semanal para orgs PRO+ con data_lake_export
- Scheduler: domingo 3:00 AM COL
- Registra en data_lake_exports + bot_execution_logs

### B5. Graceful degradation completa ✅ COMPLETADO
**Commit:** Sesión 15
**Qué se hizo:**
- circuit_breaker.py: encolar_escritura_supabase() + procesar_escrituras_pendientes()
- get_organization_with_fallback(): Supabase read-from-cache cuando breaker abierto
- main.py: org lookup con cache fallback + supabase_breaker integration
- Scheduler: Meta queue flush + Supabase queue flush cada 5 min

### B6. Dead letter queue webhooks ✅ COMPLETADO
**Commit:** Sesión 15
**Qué se hizo:**
- services/dead_letter_queue.py: encolar_webhook_fallido() + reprocesar_dead_letters()
- main.py: webhooks que fallan en procesar_mensaje_unificado → DLQ
- Max 3 reintentos, después FAILED permanente
- Scheduler: DLQ reprocess cada hora

### B7. Templates WhatsApp Business ❌ PENDIENTE (Dashboard)
**Qué:** Mensajes fuera de la ventana de 24h requieren templates aprobados por Meta.
**Impacto:** Los bots (reminder, hunter, nurse) pueden fallar si el paciente no ha escrito en 24h.
**Implementar:** Crear templates en Meta Business, usar template messages en vez de text messages cuando fuera de ventana.
**Nota:** Tarea de dashboard + Meta Business Manager. Backend ya tiene channel_window_validator.py como base.

### B8. Wompi keys por sede ✅ COMPLETADO
**Commit:** Sesión 15
**Qué se hizo:**
- payment_service.py: _get_wompi_config(org_id, branch_id=None)
- Prioridad: branch config_settings.wompi → org config_settings.wompi
- Backward compatible (branch_id opcional)

### B9. WhatsApp por sede ✅ COMPLETADO
**Commit:** Sesión 15
**Qué se hizo:**
- branch_service.py: resolve_org_by_phone_id() — busca branches con whatsapp_phone_id primero
- main.py: org lookup intenta branch match antes que org-level
- _branch_from_phone override en branch resolution step

### B10. Reportes consolidados vs por sede ❌ PENDIENTE (Dashboard)
**Qué:** Dashboard muestra todo junto. Debería poder filtrar por sede.
**Dónde:** Todos los endpoints de analytics necesitan ?branch_id= opcional.
**Nota:** Tarea de dashboard. Backend ya tiene branch_service.py y multi-sede funcional.

---

## 🟢 BLOQUE C — ESCALA (Cuando tengas 10+ clínicas)

### C1. Render Standard ($25/mes)
**Estado:** ❌ Pendiente
**Cuándo:** Cuando tengas 3+ clínicas activas

### C2. Test de carga (Locust)
**Estado:** ❌ Pendiente
**Cuándo:** Cuando tengas 10+ clínicas concurrentes

### C3. Métricas latencia P50/P95/P99
**Estado:** ❌ Pendiente
**Cuándo:** Cuando tengas tráfico real sostenido

### C4. Alertas Slack/email
**Estado:** ❌ Pendiente
**Cuándo:** Cuando no puedas monitorear manualmente 24/7

### C5. Audit log
**Estado:** ❌ Pendiente
**Qué:** Registrar quién cambió qué en el dashboard (system_prompt, servicios, horarios)
**Cuándo:** Cuando tengas equipos de >3 personas por clínica

### C6. 2FA dashboard
**Estado:** ❌ Pendiente
**Cuándo:** Cuando manejes datos de pacientes reales (HIPAA/LATAM compliance)

### C7. API keys por cliente
**Estado:** ❌ Pendiente
**Qué:** Para cuando vendas acceso API a integraciones externas
**Cuándo:** Cuando tengas 25+ clínicas

### C8. Rotación de secrets programada
**Estado:** ❌ Pendiente
**Cuándo:** Cuando tengas equipo de seguridad

### C9. Rollback strategy documentada
**Estado:** ❌ Pendiente
**Qué:** Procedimiento para revertir un deploy malo
**Cuándo:** Antes del primer cliente en producción

---

## 🔵 BLOQUE D — WHITE-LABEL (Cuando tengas Enterprise)

### D1. Dominio custom por clínica (clinica.sofia.ai) ❌
### D2. Logo custom en dashboard ❌
### D3. Tema colores CSS por org ❌
### D4. Email templates con branding clínica ❌
### D5. Widget web chat embeddable ❌
### D6. Página booking pública (link para agendar sin WhatsApp) ❌

---

## 🟣 BLOQUE E — VOICE AI AVANZADO

### E1. Detección tono de voz paciente (enojado/tranquilo) ❌
### E2. Multi-idioma voz (inglés para pacientes extranjeros) ❌
### E3. Voice analytics avanzado (sentiment por llamada, keywords) ❌

---

## 🧠 BLOQUE F — ML/AI AVANZADO (Cuando tengas 100K+ datos)

### F1. Modelo propio fine-tuned (train_sofia.py → producción) ❌
### F2. Scoring leads automático (hot/warm/cold basado en ML) ❌
### F3. Dynamic pricing (precios varían por demanda/hora) ❌
### F4. Segmentación pacientes por clusters (pgvector) ❌
### F5. Predicción conversión con variables externas (quincena, clima) ❌
### F6. Annotation UI (marcar conversaciones buenas/malas manualmente) ❌

---

## RESUMEN EJECUTIVO

| Bloque | Items | Completados | Pendientes | Estado |
|--------|-------|-------------|------------|--------|
| A — Enterprise critico | 5 | 5 | 0 | ✅ 100% COMPLETADO |
| B — Mejoras producto | 10 | 8 | 2 (dashboard) | ✅ 80% COMPLETADO |
| C — Escala | 9 | 0 | 9 | ❌ Esperando trafico |
| D — White-label | 6 | 0 | 6 | ❌ Esperando enterprise |
| E — Voice avanzado | 3 | 0 | 3 | ❌ Nice-to-have |
| F — ML avanzado | 6 | 0 | 6 | ❌ Necesita datos |

**Total: 39 items. 13 completados. 2 pendientes dashboard. 24 pueden esperar.**

---

## SESIONES COMPLETADAS

| # | Qué | Commits clave |
|---|-----|---------------|
| 1 | Landing V3 + SSL A+ | — |
| 2 | Backend Fases 1-3 (core, AI brain, tools) | — |
| 3 | Backend Fases 4-5 + Sub-bots | — |
| 4 | Dashboard V1 | — |
| 5 | Blindaje v9.1 (93/100 edge cases) | — |
| 6 | Dashboard V4 Enterprise (8 paginas) | — |
| 7 | Onboarding + Pagos Wompi + Revenue Attribution | — |
| 8 | Data Lake 3 capas + Fine-tuning pipeline + JSONL Export | — |
| 9 | Voice AI (Vapi) + White-Label + Circuit Breaker | — |
| 10 | Voice enterprise fixes + DB overhaul (12 migraciones SQL) | — |
| 11 | Voice 10 bugs fixed + Data lake fix + Bots logging + KB 81 chunks | — |
| 12 | ROADMAP 1.1-2.5: data lake bulletproof, 4 bots, scheduler v3.3 | — |
| 13 | Bloque 4-5-6: fine-tuning, outbound calls, voicemail, enterprise (130 tests, CI/CD, Sentry, A/B, multi-sede), 33 endpoints | fbddad1, addb446 |
| 14 | Bloque A Enterprise Security: rate limiting, CORS, webhook verification, plan gating, OpenAI retry | — |
| 15 | Bloque B Intelligence & Resilience: RAG trust, conversion prediction, FAQ cache, scheduled export, graceful degradation, DLQ, Wompi/WhatsApp per-branch | c41fcd0 |
| 15.1 | Fix ruff lint errors (CI green) | 3aadb74 |

---

## QUE FUNCIONA HOY (22 Feb 2026) — 34 features

1. WhatsApp completo (texto + audio + imagen)
2. Voice AI streaming SSE con 7 tools
3. Agendar/cancelar/reagendar + anti-doble-booking
4. Precios y catalogo
5. Links de pago Wompi (codigo listo)
6. Escalamiento a humano
7. Dashboard Next.js con 33 API endpoints
8. Circuit breaker + fallback
9. Multi-tenant (org_id en todo)
10. RLS enterprise (12 migraciones)
11. Data lake ingesta (safe serialize + fallback)
12. Scheduler v3.5 con 14 jobs
13. 130 pytest tests + CI/CD GitHub Actions
14. Sentry error tracking + structured logging
15. A/B testing de prompts (determinista)
16. Multi-sede (branch-aware appointments)
17. Voice outbound (confirmacion + VIP followup)
18. Pipeline CRM (6 stages auto-calculados)
19. Patient CRUD + ML features + staff notes + treatments + media + CSV export
20. Revenue attribution
21. Opportunity detector (8 tipos)
22. Rate limiting per-IP (slowapi)
23. CORS restrictivo (4 origins only)
24. Webhook signature verification (HMAC-SHA256)
25. Plan gating (TRIAL/BASIC/PRO/ENTERPRISE feature flags)
26. OpenAI graceful degradation (retry + fallback + template + Sentry)
27. RAG trust_level (tono adaptivo segun confianza del paciente)
28. Conversion prediction (HOT_LEAD auto-detection, skip low-prob)
29. FAQ cache (in-memory, TTL 1h, ahorra llamadas OpenAI)
30. Scheduled JSONL export (semanal, domingo 3am)
31. Graceful degradation completa (Supabase cache + Meta/Supabase write queues)
32. Dead letter queue (webhooks fallidos → retry hourly, max 3)
33. Wompi per-branch (branch-level payment keys)
34. WhatsApp per-branch (resolve org+branch from phone_id)

---

*Ataraxia IA Labs — Cada dato es una decision. Cada decision es dinero. Cada linea de codigo es infraestructura que escala a 1000 clinicas.*
