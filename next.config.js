const { withSentryConfig } = require("@sentry/nextjs")
const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cvfzdxhkiyrbkptvpuja.supabase.co',
      },
    ],
  },
  async rewrites() {
    return [
      // Browsers auto-request /favicon.ico — alias to our SVG to avoid 404s
      { source: '/favicon.ico', destination: '/favicon.svg' },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
              "worker-src 'self' blob:",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.supabase.co",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com https://*.sentry.io https://*.ingest.sentry.io https://challenges.cloudflare.com https://*.onrender.com" + (process.env.NODE_ENV !== 'production' ? " http://127.0.0.1:8080 http://localhost:8080 https://va.vercel-scripts.com" : ""),
              "frame-src 'self' https://challenges.cloudflare.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), xr-spatial-tracking=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
}

module.exports = withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: "ataraxia-ia-labs",
  project: "sofia-dashboard",
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  // S116-VER004: removed deprecated `disableLogger: true` (Sentry SDK v8+).
  // Default behavior is now to preserve user console.log calls; we don't
  // need to strip them at build time. Sentry's own internal logger is
  // controlled separately via `silent: true` above.
})
