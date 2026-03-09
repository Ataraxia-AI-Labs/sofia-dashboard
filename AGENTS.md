# AGENTS.md -- Read Before Working on This Repo
> Universal entry point for ANY AI agent (Claude, Gemini, Copilot, Codeium, Cursor, etc.)

## What Is This?
**sofia-dashboard** -- Next.js 14 / TypeScript dashboard for SofIA, an AI operating system for aesthetic/dental clinics.

## Full Documentation

All detailed docs live in the **backend repo** (ataraxia-backend-core):
- GitHub: `Ataraxia-AI-Labs/ataraxia-backend-core/docs/agents/`

Read in order:
1. `00_START_HERE.md` -- Overview, rules, architecture, mindset
2. `02_FRONTEND.md` -- THIS repo: every page, component, API module
3. `01_BACKEND.md` -- Backend reference (API you consume)
4. `03_BRAND_MINDSET.md` -- Visual identity, design system
5. `05_BACKLOG_ROADMAP.md` -- ALL pending items

Also see: `md/CLAUDE_DASHBOARD.md` for the compact dashboard reference.

## Build & Test
```bash
npm run dev      # Dev server
npm run build    # Production build
npm test         # 141 Jest tests
npm run lint     # ESLint
```

## Critical Rules
1. NEVER edit backend logic from this repo
2. `useSearchParams()` must be in `<Suspense>` boundary
3. API calls through `lib/api/*.ts` only (never direct Supabase for data)
4. `Sentry.captureException()` -- NEVER `console.error`
5. No hardcoded API_URL -- use `process.env.NEXT_PUBLIC_API_URL`
6. Brand: Dashboard = "SofIA", Landing = "Ataraxia IA Labs"
7. Test + build before push -- 141 tests + build must pass
