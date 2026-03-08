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
}

module.exports = withSentryConfig(withNextIntl(nextConfig), {
  silent: true,
  org: "ataraxia-ia-labs",
  project: "sofia-dashboard",
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
})
