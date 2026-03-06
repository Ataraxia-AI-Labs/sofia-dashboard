const { withSentryConfig } = require("@sentry/nextjs")

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

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: "ataraxia-ia-labs",
  project: "sofia-dashboard",
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
})
