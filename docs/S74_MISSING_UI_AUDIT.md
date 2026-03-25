# S74 — Missing UI Audit & Implementation Tracker
> Backend: ~603 endpoints | Dashboard before: ~35-40% exposed | Target: 100% user-facing features

## Rule: Engine = hidden. Doctor feature = exposed.

## New Pages Created

| # | Route | Feature | API Module | Status |
|---|-------|---------|------------|--------|
| 1 | /dashboard/auditoria | Audit Logs (compliance) | audit.ts | DONE |
| 2 | /dashboard/automatizaciones | Workflow Builder | workflows.ts | DONE |
| 3 | /dashboard/crecimiento | Growth Command Center | growth.ts | DONE |
| 4 | /dashboard/contenido | Content AI Studio | content.ts | DONE |
| 5 | /dashboard/referidos | Referral Program | referrals.ts | DONE |
| 6 | /dashboard/resenas | Reviews / GMB | reviews.ts | DONE |
| 7 | /dashboard/marketplace | Marketplace & Plugins | marketplace.ts | DONE |
| 8 | /dashboard/webhooks | Webhook Management | webhooks.ts | DONE |

## Existing Pages Enhanced

| # | Page | Enhancement | Status |
|---|------|-------------|--------|
| 9 | facturacion | Revenue Dashboard (MRR, ARR, Growth, Churn, Funnel, Forecast, Cohorts table) | DONE |
| 10 | conversaciones | Conv Intelligence panel (Brain icon toggle → summary, emotions, personality, memories) | DONE |
| 11 | equipo | Staff Coaching panel (tips + staff metrics, visible to OWNER/ADMIN) | DONE |
| 12 | ajustes | API Keys tab (create, revoke, scopes, copy-once warning) | DONE |
| 13 | ajustes | Webchat Widget tab (color, position, welcome msg, domains, embed code, preview) | DONE |
| 14 | contenido | Calendar IA tab (AI-generated content calendar) + analytics empty state | DONE |

## New API Modules (11 total)

| Module | Endpoints | Key Functions |
|--------|-----------|---------------|
| audit.ts | fetchAuditLogs | Paginated, action filter |
| webhooks.ts | 8 functions | Full CRUD, test, deliveries, retry, event catalog |
| workflows.ts | 13 functions | CRUD, templates, enrollments, analytics, comparison |
| growth.ts | 8 functions | Attribution (5 models), Growth Center, Ads, SEO |
| conv-intel.ts | 10 functions | Patient memory, personality, emotions, intents, coaching |
| content.ts | 7 functions | Content CRUD, analytics, topic suggestions, calendar |
| referrals.ts | 7 functions | Program CRUD, leaderboard, analytics, link gen |
| reviews.ts | 6 functions | GMB reviews, AI reply, NPS, reputation dashboard |
| marketplace.ts | 8 functions | Connectors, plugins, categories |
| api-keys.ts | 3 functions | List, create, revoke |
| revenue.ts | 6 functions | MRR, churn, cohorts, funnel, forecast |

## New Components (2)

| Component | Location | Used In |
|-----------|----------|---------|
| ConvIntelligencePanel | components/conv-intelligence-panel.tsx | conversaciones (toggle via Brain icon) |
| StaffCoachingPanel | components/staff-coaching-panel.tsx | equipo (below member list, OWNER/ADMIN only) |

## Sidebar Restructure (4 → 6 groups)

```
Principal:   Pulso | Transmisiones | Personas | Agenda Viva
Ventas:      Pipeline | Radar | Impulsos | Revenue | Referidos
Crecimiento: Crecimiento | Contenido | Resenas
Admin:       Equipo | Reportes | Data Lake | Auditoria | Automatizaciones
Plataforma:  Marketplace | Webhooks | Red Neuronal | Health
Config:      Planes | Facturacion | Ajustes
```

## Plan Gating Added

| Route | Feature Key | Min Plan |
|-------|-------------|----------|
| referidos | growth_referrals | STARTER |
| crecimiento | growth_command_center | BUSINESS |
| contenido | growth_content | PRO |
| resenas | growth_reputation | STARTER |
| auditoria | dashboard_basico | STARTER |
| automatizaciones | webhooks | PRO |
| marketplace | marketplace_install | BUSINESS |
| webhooks | webhooks | PRO |

## Engine (NOT exposed — internal only)
- Model Factory internals (HF Hub, fine-tuning, inference routing, model registry, A/B testing)
- OAuth2 server
- Developer Portal
- Public API v1
- Data Marketplace (B2B)
- Cost optimizer internals
- Load testing

## Already working (confirmed pre-S74)
- Branding → ajustes/branding-tab.tsx
- Lead Scoring → oportunidades/LeadScoringPanel
- Segmentation → pacientes/SegmentationPanel
- Competitors → oportunidades/CompetitorsPanel
- Outreach → oportunidades/OutreachPanel
- Pricing → ajustes/pricing-tab.tsx
- Templates → ajustes/templates-tab.tsx
- Channels → ajustes/channels-tab.tsx

## Tests Created

| Test File | Coverage | Tests |
|-----------|----------|-------|
| `__tests__/lib/api/s74-api-modules.test.ts` | All 11 new API modules | ~120 |
| `__tests__/app/dashboard/s74-new-pages.test.tsx` | All 8 new pages + 2 components | ~30 |

## Session Log
- [x] Fixed org fetch (get_user_org_ids referencing dropped org_users)
- [x] Migration 063 created
- [x] Layout.tsx catch block now logs + Sentry
- [x] 11 API modules created
- [x] i18n entries for es.json, en.json, pt.json
- [x] 8 new dashboard pages
- [x] Sidebar restructured (6 groups, new nav items)
- [x] Plan features gating for all new routes
- [x] Facturacion enhanced with MRR/ARR/Churn + Funnel/Forecast/Cohorts
- [x] API Keys tab added to ajustes
- [x] Webchat Widget tab added to ajustes (color, position, domains, embed code, preview)
- [x] ConvIntelligencePanel wired into conversaciones (Brain toggle)
- [x] StaffCoachingPanel wired into equipo (OWNER/ADMIN)
- [x] Contenido: Calendar IA tab + analytics empty state
- [x] ~150 new tests created (s74-api-modules + s74-new-pages)
- [x] Full suite: **1623/1623 tests PASSED** (76 suites, 0 failures)

## Summary
- **Before S74**: ~35-40% of backend features had dashboard UI
- **After S74**: ~95%+ user-facing features now have UI
- **New files**: 8 pages + 11 API modules + 2 components + 2 settings tabs + 2 test files = 25 new files
- **Modified files**: layout.tsx, plan-features.ts, ajustes/page.tsx, ajustes/tabs/index.ts, facturacion/page.tsx, conversaciones/page.tsx, equipo/page.tsx, contenido/page.tsx, es.json, en.json, pt.json, lib/api/index.ts = 12 modified files
- **Tests**: 1623 total (was ~1473 before S74, +150 new)
