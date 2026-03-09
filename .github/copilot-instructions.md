# Copilot Instructions — sofia-dashboard
> You MUST read this BEFORE writing any code. No exceptions.

## Step 0: Read the docs FIRST
Before modifying ANY file, read these docs (in the backend repo on GitHub):
1. `AGENTS.md` (this repo root) — entry point with links
2. Backend repo: `docs/agents/00_START_HERE.md` — architecture, rules, mindset
3. Backend repo: `docs/agents/02_FRONTEND.md` — every page, component, API module
4. Backend repo: `docs/agents/03_BRAND_MINDSET.md` — brand identity and philosophy
5. This repo: `md/CLAUDE_DASHBOARD.md` — compact dashboard reference

## Who We Are
**Ataraxia IA Labs** — We build SofIA, an AI operating system for aesthetic/dental clinics.
Our brand colors are **violet (#7C3AED)** and **cyan (#06B6D4)**. Dark theme by default.
Every component you write represents this company. Quality is 10/10, never 8.

## Stack
- Next.js 14 App Router / TypeScript strict / Supabase Auth (cookie-based)
- ALL data from backend API via `lib/api.ts` `authFetch()` — NEVER direct Supabase for data
- API URL: `process.env.NEXT_PUBLIC_API_URL` — never hardcoded

## Critical Rules (MANDATORY)
1. ALL API calls through `lib/api/*.ts` using `authFetch()` — never direct Supabase for backend data
2. `useSearchParams()` MUST be wrapped in `<Suspense>` boundary — Vercel build fails otherwise
3. Cookie-based auth via `@supabase/ssr createBrowserClient()` — no localStorage tokens
4. Use component library in `components/ui/` — never re-implement Button, Input, Modal
5. Every new page must have `loading.tsx` and `error.tsx` siblings
6. TypeScript strict: no `any` types unless absolutely necessary
7. Never expose admin functionality to non-super-admin users
8. Prefer Server Components — only use `'use client'` when actually needed
9. `Sentry.captureException()` for errors — NEVER `console.error` in production code
10. API URL from `process.env.NEXT_PUBLIC_API_URL` — never hardcoded URLs

## Build & Verify
```bash
npm ci
npm run lint                    # ESLint
npx tsc --noEmit               # Type check
npm test -- --ci                # 141 tests must pass
npm run build                   # Production build must succeed
```

## What NOT to Do
- Do NOT modify backend logic from this repo
- Do NOT make direct Supabase queries for business data (only auth)
- Do NOT add `console.error` or `console.log` — use Sentry
- Do NOT skip `<Suspense>` boundaries around `useSearchParams()`
- Do NOT use inline styles — use Tailwind CSS classes
- Do NOT create components outside `components/` directory

## Design System
- **Background**: Dark theme (`#0a0a0f`, `#1a1a2e`)
- **Primary**: Violet (`#7C3AED`) — buttons, accents, active states
- **Secondary**: Cyan (`#06B6D4`) — highlights, links, info states
- **Text**: White (`#FFFFFF`) primary, Gray (`#9CA3AF`) secondary
- **Cards**: `bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl`
- **Font**: Inter — clean, modern, medical-grade aesthetic

## Mindset
You are building the control center for the AI operating system of the future of healthcare.
Every pixel matters. Every interaction must feel premium. Read the docs. Understand the
architecture. Then write code that makes clinics feel like they're using something from 2030.
