# SOFIA DASHBOARD — CLAUDE.md
# Frontend del sistema SofIA. Updated: 27 Feb 2026.

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
Dashboard: https://dashboard.ataraxiaialabs.ai
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
| Pacientes | /dashboard/pacientes | ✅ Lista, búsqueda, panel detalle |
| Calendario | /dashboard/calendario | ✅ Citas día/semana/mes |
| Conversaciones | /dashboard/conversaciones | ✅ WhatsApp timeline viewer |
| Pipeline | /dashboard/pipeline | ✅ CRM Kanban (6 stages) |
| Pagos | /dashboard/pagos | ✅ Transacciones |
| Data Lake | /dashboard/datalake | ✅ Stats, quality scores, export JSONL |
| Oportunidades | /dashboard/oportunidades | ✅ Lista con acciones, filtros |
| Equipo | /dashboard/equipo | ✅ Gestión de miembros |
| System Health | /dashboard/health | ✅ Backend/Supabase status, bot logs |
| Ajustes | /dashboard/ajustes | ✅ Config org, business hours, prompt |
| Onboarding | /onboarding | ✅ Self-service, email verify, Turnstile |

### Admin Panel (Super Admin only)

| Página | Ruta | Estado |
|--------|------|--------|
| Organizaciones | /admin | ✅ List all orgs, God Mode, stats |
| Crear Org | /admin/organizaciones/nueva | ✅ Full wizard flow |
| Detalle Org | /admin/organizaciones/[id] | ✅ Full detail + God Mode |
| Métricas | /admin/metricas | ✅ Global metrics |
| System Health | /admin/health | ✅ Bot logs, error count |

## SUPER ADMIN ARCHITECTURE

- **Access**: `app_metadata.is_super_admin === true` (set server-side, NOT client-side)
- **Middleware**: `/admin` routes blocked at middleware.ts level for non-super-admins
- **God Mode**: Impersonate any clinic via `lib/impersonation.ts` (sessionStorage)
- **RLS**: Super admin has full access via 8 RLS policies on key tables
- **fetchAllOrganizations**: Queries `organizations` directly (not through org_members)
- **ensureSuperAdminMembership**: Auto-adds admin to org_members for RLS when entering God Mode

## TABLAS SUPABASE

- `organizations` — Config de la clínica
- `org_members` — Usuarios ↔ Orgs (role: OWNER/ADMIN/MEMBER)
- `patients` — Lista de pacientes
- `appointments` — Citas
- `interaction_logs` — Conversaciones
- `services_catalog` — Servicios y precios
- `business_hours` — Horarios (7 days, open/close times)
- `payments` — Pagos
- `detected_opportunities` — Oportunidades
- `data_lake_raw` — Stats del data lake
- `patient_ml_features` — Features ML
- `bot_execution_logs` — Logs de bots

## RLS — IMPORTANTE

- Dashboard usa `anon key` + usuario autenticado. RLS filtra por `get_user_org_ids()`
- Super admin: RLS policies grant full access via `app_metadata.is_super_admin`
- NUNCA hagas queries sin filtro de org — RLS los bloquea pero es mala práctica

## REGLAS

1. **NO toques backend** — solo consumes API y Supabase
2. **Tailwind para estilos** — no CSS custom salvo excepciones
3. **Componentes reutilizables** — si se usa 2+ veces, es componente
4. **TypeScript strict** — no `any`, tipar todo
5. **Un commit por feature** — no mega-commits
6. **useSearchParams()** — SIEMPRE en <Suspense> boundary (Next.js 14 SSG)
7. **Brand**: Favicon = SofiaLogo (neural arcs + S + cyan dot), NOT a simple "S"
8. **Landing = Ataraxia IA Labs**, Dashboard = SofIA. NUNCA mezclar branding.

## FEATURES PENDIENTES (ver SOFIA_ROADMAP_PRODUCCION.md)

### Human Takeover (Fase 3)
- Boton "Tomar control" / "Devolver a SofIA" en /dashboard/conversaciones
- Input de chat para que el doctor escriba directamente al paciente
- Indicador de estado por conversacion (AI / HUMAN / PENDING)
- Notificaciones cuando SofIA escala un caso
- Backend endpoints: POST /takeover/{org_id}/take, /release, /send

### Conexion de canales (Fases 2 y 5)
- Tab "Canales" en /dashboard/ajustes
- Boton "Conectar WhatsApp" → Meta Embedded Signup (popup Facebook)
- Boton "Conectar Instagram" / "Conectar Messenger"
- Indicador de estado por canal (verde/rojo/pendiente)
- Componente: `components/whatsapp-connect.tsx`
- API: `lib/api/channels.ts`

### Pagina de planes (Fase 4)
- Nueva pagina: /dashboard/planes
- Plan actual, dias restantes de trial
- Selector de planes (BASIC/PRO/ENTERPRISE) con precios
- Boton "Pagar" → link Wompi
- Banner de trial expirando en layout del dashboard

### Trial lifecycle
- Banner en dashboard: "Trial: X dias restantes" (si plan=TRIAL)
- Si trial expirado: overlay/modal bloqueante "Tu trial termino. Elige un plan."
- Redirect a /dashboard/planes si status=TRIAL_EXPIRED
