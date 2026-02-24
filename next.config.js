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

module.exports = nextConfig
