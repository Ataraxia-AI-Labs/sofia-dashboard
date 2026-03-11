# SOFIA DASHBOARD — CLAUDE.md
# Frontend del sistema SofIA. Updated: 8 Marzo 2026, Session 34.

---

## CONTEXTO

Este es el FRONTEND. El backend es otro repo (SofIA-backend-core). NO edites lógica de backend aquí. Solo consumes la API.

**Stack:** Next.js 14 App Router + TypeScript + Tailwind CSS
**Deploy:** Vercel (auto-deploy on push to main)
**Auth:** Supabase Auth (email + password, cookie-based via @supabase/ssr)
**Data:** Supabase client con anon key (RLS filtra por org)
**Monitoring:** Sentry (client + server + edge) + Vercel Analytics + Speed Insights
**i18n:** next-intl with dynamic locale (cookie-based), 3 languages: es/en/pt, 200+ keys per language
**Tests:** Jest (141 tests, 16 test files) + Playwright E2E infrastructure

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
NEXT_PUBLIC_API_URL=<backend_url>  # NO hardcoded fallback
NEXT_PUBLIC_SENTRY_DSN=<dsn>
SENTRY_AUTH_TOKEN=<token>
```

## PÁGINAS (25 rutas)

### Dashboard (13 páginas)
| Página | Ruta | Estado |
|--------|------|--------|
| Overview | /dashboard | ✅ KPIs, gráficas, Voice AI metrics |
| Pacientes | /dashboard/pacientes | ✅ Lista, búsqueda, panel detalle, ML features |
| Calendario | /dashboard/calendario | ✅ Citas día/semana/mes |
| Conversaciones | /dashboard/conversaciones | ✅ WhatsApp timeline (Supabase Realtime) |
| Pipeline | /dashboard/pipeline | ✅ CRM (LEAD → RECURRENTE) |
| Pagos | /dashboard/pagos | ✅ Transacciones |
| Data Lake | /dashboard/datalake | ✅ Stats, quality scores, export JSONL |
| Oportunidades | /dashboard/oportunidades | ✅ Lista con acciones, filtros |
| Equipo | /dashboard/equipo | ✅ Gestión de miembros, invitaciones |
| System Health | /dashboard/health | ✅ Backend/Supabase status, bot logs |
| Ajustes | /dashboard/ajustes | ✅ Config org, services, hours, channels |
| Planes | /dashboard/planes | ✅ Plan selector, checkout, trial countdown |
| Facturación | /dashboard/facturacion | ✅ Invoices, subscription status |

### Auth & Onboarding (4 páginas)
| Página | Ruta | Estado |
|--------|------|--------|
| Login | /login | ✅ Email + password |
| Forgot Password | /forgot-password | ✅ Reset request |
| Reset Password | /reset-password | ✅ New password form |
| Onboarding | /onboarding | ✅ 4-step wizard + Turnstile |

### Admin (5 páginas — Super Admin only)
| Página | Ruta | Estado |
|--------|------|--------|
| Organizaciones | /admin | ✅ List all orgs, stats |
| Crear Org | /admin/organizaciones/nueva | ✅ Full wizard |
| Detalle Org | /admin/organizaciones/[id] | ✅ Detail + God Mode |
| Métricas | /admin/metricas | ✅ Global metrics |
| System Health | /admin/health | ✅ Bot logs, errors |

### Legal (2 páginas)
| Página | Ruta |
|--------|------|
| Privacidad | /legal/privacidad |
| Términos | /legal/terminos |

## COMPONENTES (9 top-level + 15 UI)

**Top-level:** sidebar, onboarding-wizard, card-tokenization-form, checkout-modal,
error-boundary, chat-input, notifications-dropdown, sofia-logo, providers

**UI (components/ui/):** button, input (Input+Textarea+Select), modal, card (Card+StatCard),
tabs, toggle, badge, status-pill, metric-card, toast, spinner, empty-state,
section-title, perf-item, bot-card

## API LAYER (lib/api/ — 23 modules)

analytics, appointments, branches, business-hours, channels, data-lake, health,
helpers, index, interactions, media, opportunities, organization, patients,
payments, pipeline, services, staff-notes, subscriptions, takeover, team,
treatments, voice

**Centralized fetch:** `lib/api/auth-fetch.ts` → authFetch() with JWT, timeout, parseAPIError()

## LIB UTILITIES

| File | Purpose |
|------|---------|
| `lib/supabase.ts` | createBrowserClient (anon key), API_URL export |
| `lib/impersonation.ts` | God Mode (sessionStorage) |
| `lib/org-context.tsx` | Organization context provider |
| `lib/admin-api.ts` | Admin API functions |

## SUPER ADMIN ARCHITECTURE

- **Access**: `app_metadata.is_super_admin === true` (set server-side)
- **Middleware**: `/admin` routes blocked at middleware.ts for non-super-admins
- **God Mode**: Impersonate any clinic via `lib/impersonation.ts`
- **RLS**: 8 policies grant full access for super admin

## TABLAS SUPABASE (accessed via RLS)

organizations, org_members, patients, appointments, interaction_logs,
services_catalog, business_hours, payments, detected_opportunities,
data_lake_raw, patient_ml_features, bot_execution_logs, branches,
subscriptions, invoices, usage_tracking, staff_notes, knowledge_base

## SENTRY CONFIG

- `sentry.client.config.ts` — maskAllText: true, replaysOnErrorSampleRate: 1.0
- `sentry.server.config.ts` — Server monitoring
- `sentry.edge.config.ts` — Edge runtime
- Error handling: `Sentry.captureException(error)` — NEVER console.error

## REGLAS

1. **NO toques backend** — solo consumes API y Supabase
2. **Tailwind para estilos** — no CSS custom salvo excepciones
3. **Componentes reutilizables** — si se usa 2+ veces, es componente
4. **TypeScript strict** — no `any`, tipar todo
5. **Un commit por feature** — no mega-commits
6. **useSearchParams()** — SIEMPRE en <Suspense> boundary
7. **Sentry.captureException()** — NUNCA console.error en producción
8. **API_URL from env** — NO hardcoded fallbacks
9. **Brand**: Dashboard = "SofIA", Landing = "Ataraxia IA Labs"

## FEATURES PENDIENTES

### Conexión de canales (Fase 2 + 5)
- Tab "Canales" en /dashboard/ajustes — parcialmente implementado
- Meta Embedded Signup widget: `components/whatsapp-connect.tsx` PENDING
- Instagram/Messenger connect UI: PENDING

### Human Takeover UI
- Backend complete (takeover_router.py)
- Chat input component exists (chat-input.tsx)
- Full integration in conversaciones page: PENDING E2E testing

### i18n — COMPLETE (Session 35)
- next-intl with cookie-based dynamic locale switching
- messages/es.json: 200+ keys (all pages and components)
- messages/en.json: 200+ keys (full English translation)
- messages/pt.json: 200+ keys (full Portuguese translation)
- i18n/request.ts reads NEXT_LOCALE cookie (defaults to 'es')
- app/actions/set-locale.ts: server action to persist locale preference
- components/language-selector.tsx: UI component for switching language
- Language tab in Settings (Ajustes > Idioma)
- Migrated: layout.tsx, ajustes/page.tsx, equipo/page.tsx, all settings tabs
- Migrated: oportunidades, pagos, health, datalake, pipeline pages
