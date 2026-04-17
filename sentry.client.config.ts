import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === "production",
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/ataraxia-api-core\.onrender\.com/,
  ],
  // Known upstream issues / expected user states — not actionable for us.
  ignoreErrors: [
    // @supabase/auth-js multi-tab LockManager contention. The lock itself
    // is an internal auth-js implementation detail; a timeout here does
    // not break functionality (other tab wins the lock).
    /Acquiring an exclusive Navigator LockManager lock/,
    // User-facing message we throw when session is missing — UI shows a
    // "reload/relogin" prompt and middleware redirects. Not a bug.
    /No hay sesi.n activa/,
  ],
})
