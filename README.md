```
╔══════════════════════════════════════════════╗
║  NUCLEUS — SofIA's Command Center            ║
║  Ataraxia IA Labs                            ║
╚══════════════════════════════════════════════╝
```

> Sentient Interface v1.0 — monospace, 12-color palette, 8px grid, zero gradients.

## Stack

```
Next.js 14        App Router, TypeScript, RSC
Tailwind CSS      Sentient Interface design system
Supabase          Auth + PostgreSQL (shared with backend)
Recharts          Data visualization
Lucide            Icon system
Playwright        E2E testing (chromium + mobile webkit)
Jest              Unit testing
next-intl         i18n (es/en/pt)
Sentry            Error tracking
```

## Architecture

```
app/
├── dashboard/
│   ├── layout.tsx              Nucleus shell (sidebar, topbar, clinic-pulse)
│   ├── page.tsx                Pulso — overview + 5 innovations
│   ├── conversaciones/         Transmisiones — unified inbox + voice + channels
│   ├── pacientes/              Personas — patient CRM + 12 detail panels
│   ├── calendario/             Agenda Viva — appointments + waiting room
│   ├── pipeline/               Flujo — kanban conversion pipeline
│   ├── oportunidades/          Radar — AI-detected opportunities
│   ├── campanas/               Impulsos — campaign management
│   ├── pagos/                  Revenue — payments + attribution
│   ├── equipo/                 Team management + RBAC
│   ├── reportes/               Inteligencia — analytics reports
│   ├── datalake/               ML models + training + RAG
│   ├── network/                Inter-clinic network
│   ├── health/                 System health monitoring
│   ├── planes/                 Subscription plans + checkout
│   ├── facturacion/            Invoices + billing
│   └── ajustes/                Control — 11 settings tabs
├── admin/                      Super admin (god mode)
├── onboarding/                 New clinic setup
├── login/                      Authentication
├── book/[orgId]/               Public booking page
├── portal/[token]/             Patient portal
└── legal/                      Privacy + terms

components/
├── innovations/                5 Sentient innovations
│   ├── ataraxia-score.tsx      0-100 clinic tranquility index
│   ├── sofia-speaks.tsx        Dashboard narrator (typewriter)
│   ├── night-report.tsx        8AM briefing card
│   └── phantom-grid.tsx        Adaptive layout engine
├── ui/                         Design system primitives
└── [30+ domain components]     Badges, forms, modals

lib/api/                        39 API modules (typed fetch layer)
messages/                       i18n: es.json, en.json, pt.json
```

## Design Language

**Sentient Interface v1.0** — born from r/unixporn philosophy applied to commercial SaaS.

```
PALETTE       VOID #050507 · SURFACE #0C0C14 · PURPLE #8B5CF6 · CYAN #06D6A0
TYPOGRAPHY    font-mono everywhere. Precision over decoration.
GRID          8px sacred grid. Tight spacing. No noise.
CONTAINERS    bg-brand-purple/8 border border-brand-purple/15. Never gradient.
BUTTONS       Solid bg-brand-purple. Never gradient.
RADIUS        rounded-md / rounded-lg max. Never xl/2xl.
SHADOWS       None. Flat surfaces only.
LABELS        text-[10px] font-mono. Sublabels: text-[9px] font-mono.
MOTION        breathe=loading, pulse=alive, fade=transition
```

## Numbers

```
23 pages  ·  42+ components  ·  39 API modules  ·  3 languages
671 unit tests (Jest)  ·  159 E2E tests (Playwright)
```

## Setup

```bash
git clone https://github.com/Ataraxia-AI-Labs/sofia-dashboard.git
cd sofia-dashboard
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase + API credentials
npm run dev
```

## Testing

```bash
npm test                    # Unit tests (Jest)
npx playwright test         # E2E tests (chromium + mobile)
npx tsc --noEmit            # Type check
npx next lint               # ESLint
```

## Deploy

Vercel auto-deploys from `main`. Environment variables configured in Vercel dashboard.

---

```
Ataraxia IA Labs SAS · Colombia
gestion@ataraxiaialabs.ai
```
