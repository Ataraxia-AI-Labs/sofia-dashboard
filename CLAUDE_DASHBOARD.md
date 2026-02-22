# SOFIA DASHBOARD — CLAUDE.md
# Frontend del sistema SofIA. Updated: 21 Feb 2026.

---

## CONTEXTO

Este es el FRONTEND. El backend es otro repo (ataraxia-backend-core). NO edites lógica de backend aquí. Solo consumes la API.

**Stack:** React + Vite + TypeScript
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
| Overview | / | ✅ KPIs, gráficas |
| Pacientes | /patients | ✅ Lista, búsqueda |
| Calendario | /calendar | ✅ Citas día/semana/mes |
| Pagos | /payments | ✅ Transacciones |
| Data Lake | /data-lake | ⚠️ Básico, mejorar |
| Oportunidades | /opportunities | ⚠️ Básico, mejorar |
| System Health | /health | ✅ |
| Ajustes | /settings | ✅ Config org |
| Onboarding | /onboarding | ✅ Self-service |

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

## TAREAS PENDIENTES (Bloque 3 del ROADMAP)

### 3.1 — Pipeline visual de pacientes
Componente tipo Kanban: Lead → Contactado → Cita Agendada → Completada → Pagado → Recurrente.
Query pacientes y agrupar por etapa según sus appointments y payments.

### 3.2 — Métricas de Voice AI
Sección en Overview: total llamadas, duración promedio, citas por voz vs WhatsApp.
Query: interaction_logs WHERE platform = 'VOICE_CALL'

### 3.3 — Vista de Oportunidades mejorada
Lista detected_opportunities con acciones (Actuar, Convertida, Descartar).
Filtros por tipo: UPSELL, CROSS_SELL, REACTIVATION.

### 3.4 — Data Lake dashboard mejorado
Total samples, quality score promedio, gráfica ingesta por día.
Botón Export JSONL → POST /data-lake/export/{org_id}

## REGLAS

1. **NO toques backend** — solo consumes API y Supabase
2. **Tailwind para estilos** — no CSS custom salvo excepciones
3. **Componentes reutilizables** — si se usa 2+ veces, es componente
4. **TypeScript strict** — no `any`, tipar todo
5. **Un commit por feature** — no mega-commits
