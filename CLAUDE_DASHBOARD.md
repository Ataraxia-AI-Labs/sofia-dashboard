# SOFIA DASHBOARD — CLAUDE.md
# Frontend del sistema SofIA. Updated: 24 Feb 2026.

---

## CONTEXTO

Este es el FRONTEND. El backend es otro repo (ataraxia-backend-core). NO edites lógica de backend aquí. Solo consumes la API.

**Stack:** Next.js 14 App Router + TypeScript + Tailwind CSS
**Deploy:** Vercel (auto-deploy on push to main)
**Auth:** Supabase Auth (email + password)
**Data:** Supabase client con anon key (RLS filtra por org)

## CONEXIONES

```
Backend API: https://ataraxia-api-core.onrender.com
Supabase: https://cvfzdxhkiyrbkptvpuja.supabase.co
```

## ENV VARS (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://cvfzdxhkiyrbkptvpuja.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_API_URL=https://ataraxia-api-core.onrender.com
```

## PÁGINAS ACTUALES

| Página | Ruta | Estado |
|--------|------|--------|
| Overview | /dashboard | ✅ KPIs, gráficas, Voice AI metrics |
| Pacientes | /dashboard/patients | ✅ Lista, búsqueda |
| Calendario | /dashboard/calendar | ✅ Citas día/semana/mes |
| Pagos | /dashboard/payments | ✅ Transacciones |
| Data Lake | /dashboard/data-lake | ✅ Stats, quality scores, export JSONL |
| Oportunidades | /dashboard/opportunities | ✅ Lista con acciones, filtros por tipo |
| Pipeline | /dashboard/pipeline | ✅ CRM Kanban (6 stages) |
| Conversaciones | /dashboard/conversaciones | ✅ WhatsApp conversation timeline viewer |
| System Health | /dashboard/health | ✅ |
| Ajustes | /dashboard/settings | ✅ Config org, business hours editor |
| Onboarding | /onboarding | ✅ Self-service, email verification, Turnstile CAPTCHA, team invites |

## TABLAS SUPABASE QUE USA EL DASHBOARD (lectura via anon key + RLS)

- `organizations` — Config de la clínica
- `patients` — Lista de pacientes
- `appointments` — Citas
- `interaction_logs` — Conversaciones
- `services_catalog` — Servicios y precios
- `business_hours` — Horarios
- `payments` — Pagos
- `detected_opportunities` — Oportunidades
- `data_lake_raw` — Stats del data lake
- `patient_ml_features` — Features ML
- `bot_execution_logs` — Logs de bots

## RLS — IMPORTANTE

El dashboard usa `anon key` + usuario autenticado. RLS filtra por `get_user_org_ids()`. El usuario SOLO ve datos de su organización. NUNCA hagas queries sin filtro de org — RLS los bloquea de todas formas pero es mala práctica.

## TAREAS COMPLETADAS (Bloque 3 del ROADMAP)

### 3.1 — Pipeline visual de pacientes ✅ DONE
Componente tipo Kanban: Lead → Contactado → Cita Agendada → Completada → Pagado → Recurrente.
Ruta: /dashboard/pipeline — CRM Kanban con 6 stages auto-calculados.

### 3.2 — Métricas de Voice AI ✅ DONE
Sección en Overview: total llamadas, duración promedio, citas por voz vs WhatsApp.
Integrado en el dashboard Overview con datos de Gemini Live + Twilio.

### 3.3 — Vista de Oportunidades mejorada ✅ DONE
Lista detected_opportunities con acciones (Actuar, Convertida, Descartar).
Filtros por tipo: UPSELL, CROSS_SELL, REACTIVATION.

### 3.4 — Data Lake dashboard mejorado ✅ DONE
Total samples, quality score promedio, gráfica ingesta por día.
Botón Export JSONL → POST /data-lake/export/{org_id}

## FEATURES RECIENTES

### Onboarding mejorado
- Email verification flow (verify email before accessing dashboard)
- Cloudflare Turnstile CAPTCHA (bot protection on registration)
- Team invites (invite members to organization via email)
- Business hours editor (configure org schedule from settings page)

### Conversaciones page
- WhatsApp conversation timeline viewer (/dashboard/conversaciones)
- Full interaction history per patient with message bubbles
- Filter by date range and patient

## REGLAS

1. **NO toques backend** — solo consumes API y Supabase
2. **Tailwind para estilos** — no CSS custom salvo excepciones
3. **Componentes reutilizables** — si se usa 2+ veces, es componente
4. **TypeScript strict** — no `any`, tipar todo
5. **Un commit por feature** — no mega-commits
